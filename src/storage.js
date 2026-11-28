import { getConfig, isCrmProfile } from './module-config.js';
import {
  normalizeCode,
  validateClient,
  validateOpportunity,
  validateStatusChange,
  validateTicket,
  canTransitionTicket,
  validateIntegrity,
  validateContact,
  ensureSinglePrimary,
  validateActivity,
  completeActivity,
  resolveTicket as resolveTicketRecord,
  assertImmutableIdentity
} from './crm-rules.js';
import {
  RECOVERY_KEY,
  SCHEMA_KEY as RECOVERY_SCHEMA_KEY,
  COLLECTION_KEYS,
  isCrmStorageKey,
  prepareSnapshot as prepareRecovery,
  commitSnapshot as commitRecovery,
  detectPendingRecovery,
  restorePreviousSnapshot,
  canWrite as recoveryCanWrite
} from './storage-recovery.js';
import { createTrashEntry, trimTrash, restoreTrashEntry, purgeTrashEntry as purgeEntry } from './crm-trash.js';

export const ENTITIES_KEY = COLLECTION_KEYS.entities;
export const DOCUMENTS_KEY = COLLECTION_KEYS.documents;
export const TICKETS_KEY = COLLECTION_KEYS.tickets;
export const CONTACTS_KEY = COLLECTION_KEYS.contacts;
export const ACTIVITIES_KEY = COLLECTION_KEYS.activities;
export const TRASH_KEY = COLLECTION_KEYS.trash;
export const SCHEMA_KEY = RECOVERY_SCHEMA_KEY;
export { RECOVERY_KEY, isCrmStorageKey };

// 1 → colecciones base · 2 → contactos, actividades, papelera y recuperación
// · 3 → resolución de tickets (US-11). Las ampliaciones son aditivas y no
// convierten datos existentes; la migración de tickets históricos es explícita.
export const SCHEMA_VERSION = 3;

const CORRUPT_MESSAGE =
  'No se pudo leer la información guardada: los datos están corruptos o tienen un formato inválido. No se modificó nada.';

const WRITE_MESSAGE =
  'No se pudo guardar: el almacenamiento del navegador está lleno o no está disponible. Los datos anteriores se conservaron.';

const BLOCKED_MESSAGE =
  'Las escrituras están bloqueadas: no se pudo verificar una versión íntegra de los datos. Recarga la aplicación o completa la recuperación antes de guardar.';

function readSchemaVersion() {
  const raw = localStorage.getItem(SCHEMA_KEY);
  if (raw === null || raw === undefined) return SCHEMA_VERSION;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('No se pudo leer el esquema guardado: la versión del esquema está corrupta. No se modificó nada.');
  }
  const version = typeof parsed === 'number' ? parsed : parsed && parsed.schemaVersion;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('No se pudo leer el esquema guardado: la versión del esquema no es válida. No se modificó nada.');
  }
  return version;
}

/** Versión de esquema almacenada (o la vigente cuando aún no existe). */
export function getStoredSchemaVersion() {
  return readSchemaVersion();
}

function assertCompatibleSchema() {
  const version = readSchemaVersion();
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `La versión de esquema guardada (${version}) es incompatible con esta aplicación (${SCHEMA_VERSION}). Los datos no se modificaron; se requiere una migración explícita.`
    );
  }
}

function readCollection(key, label) {
  assertCompatibleSchema();
  const raw = localStorage.getItem(key);
  if (raw === null || raw === undefined || raw === '') return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(CORRUPT_MESSAGE);
  }
  if (!Array.isArray(parsed)) throw new Error(`${CORRUPT_MESSAGE} (${label})`);
  return parsed;
}

function restoreRaw(key, previous) {
  try {
    if (previous === null || previous === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, previous);
  } catch {
    // Si restaurar también falla, no hay más acciones posibles sin un backend.
  }
}

function readRawCollections() {
  return {
    entities: readCollection(ENTITIES_KEY, 'clientes'),
    documents: readCollection(DOCUMENTS_KEY, 'documentos'),
    tickets: readCollection(TICKETS_KEY, 'tickets'),
    contacts: readCollection(CONTACTS_KEY, 'contactos'),
    activities: readCollection(ACTIVITIES_KEY, 'actividades'),
    trash: readCollection(TRASH_KEY, 'papelera')
  };
}

function formatIssues(issues) {
  const first = issues[0];
  if (!first) return 'La información guardada no es válida.';
  const where = first.reference ? ` (${first.reference})` : '';
  return `La información guardada no es válida${where}: ${first.message}. No se modificó nada.`;
}

/**
 * Instantánea completa en memoria. Valida la integridad antes de devolverla,
 * de modo que ninguna operación escriba sobre un conjunto inválido.
 */
export function loadSnapshot() {
  const snapshot = readRawCollections();
  const integrity = validateIntegrity(snapshot);
  if (!integrity.valid) throw new Error(formatIssues(integrity.issues));
  return snapshot;
}

/** Copia completa de la instantánea sin validar (para respaldos y pruebas). */
export function readSnapshotForBackup() {
  return readRawCollections();
}

function writeRawSnapshot(snapshot) {
  localStorage.setItem(ENTITIES_KEY, JSON.stringify(snapshot.entities || []));
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(snapshot.documents || []));
  localStorage.setItem(TICKETS_KEY, JSON.stringify(snapshot.tickets || []));
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(snapshot.contacts || []));
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(snapshot.activities || []));
  localStorage.setItem(TRASH_KEY, JSON.stringify(snapshot.trash || []));
}

/**
 * Valida y persiste la instantánea completa de seis colecciones. Antes de
 * reemplazar datos guarda una versión recuperable; si la escritura falla,
 * restaura los valores previos y propaga el error al llamador.
 */
function saveSnapshot(snapshot) {
  assertCompatibleSchema();
  if (!recoveryCanWrite()) throw new Error(BLOCKED_MESSAGE);

  const normalized = {
    entities: Array.isArray(snapshot.entities) ? snapshot.entities : [],
    documents: Array.isArray(snapshot.documents) ? snapshot.documents : [],
    tickets: Array.isArray(snapshot.tickets) ? snapshot.tickets : [],
    contacts: Array.isArray(snapshot.contacts) ? snapshot.contacts : [],
    activities: Array.isArray(snapshot.activities) ? snapshot.activities : [],
    trash: Array.isArray(snapshot.trash) ? snapshot.trash : []
  };
  const integrity = validateIntegrity(normalized);
  if (!integrity.valid) throw new Error(formatIssues(integrity.issues));

  const previousCollections = readRawCollections();
  const previousRaw = {
    entities: localStorage.getItem(ENTITIES_KEY),
    documents: localStorage.getItem(DOCUMENTS_KEY),
    tickets: localStorage.getItem(TICKETS_KEY),
    contacts: localStorage.getItem(CONTACTS_KEY),
    activities: localStorage.getItem(ACTIVITIES_KEY),
    trash: localStorage.getItem(TRASH_KEY),
    schema: localStorage.getItem(SCHEMA_KEY),
    recovery: localStorage.getItem(RECOVERY_KEY)
  };

  prepareRecovery(previousCollections);

  try {
    writeRawSnapshot(normalized);
    localStorage.setItem(SCHEMA_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION }));
  } catch {
    restoreRaw(ENTITIES_KEY, previousRaw.entities);
    restoreRaw(DOCUMENTS_KEY, previousRaw.documents);
    restoreRaw(TICKETS_KEY, previousRaw.tickets);
    restoreRaw(CONTACTS_KEY, previousRaw.contacts);
    restoreRaw(ACTIVITIES_KEY, previousRaw.activities);
    restoreRaw(TRASH_KEY, previousRaw.trash);
    restoreRaw(SCHEMA_KEY, previousRaw.schema);
    restoreRaw(RECOVERY_KEY, previousRaw.recovery);
    throw new Error(WRITE_MESSAGE);
  }

  commitRecovery(previousCollections);
}

function firstError(errors) {
  return Object.values(errors)[0] || 'No se pudo validar el registro';
}

export function loadEntities() {
  return readCollection(ENTITIES_KEY, 'clientes');
}

export function saveEntities(entities) {
  saveSnapshot({ ...loadSnapshot(), entities });
}

export function loadDocuments() {
  return readCollection(DOCUMENTS_KEY, 'documentos');
}

export function saveDocuments(documents) {
  saveSnapshot({ ...loadSnapshot(), documents });
}

export function loadTickets() {
  return readCollection(TICKETS_KEY, 'tickets');
}

export function saveTickets(tickets) {
  saveSnapshot({ ...loadSnapshot(), tickets });
}

export function loadContacts() {
  return readCollection(CONTACTS_KEY, 'contactos');
}

export function saveContacts(contacts) {
  saveSnapshot({ ...loadSnapshot(), contacts });
}

export function loadActivities() {
  return readCollection(ACTIVITIES_KEY, 'actividades');
}

export function saveActivities(activities) {
  saveSnapshot({ ...loadSnapshot(), activities });
}

export function loadTrash() {
  return readCollection(TRASH_KEY, 'papelera');
}

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function declaredFields(target) {
  return getConfig().customFields.filter((f) => f.target === target);
}

export function isValidDate(value) {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && !v.trim());
}

function normalizeCustomValue(field, value) {
  if (isEmpty(value)) return undefined;
  if (field.type === 'number') return Number(value);
  return String(value).trim();
}

function collectCustomErrors(target, data) {
  const errs = {};
  for (const f of declaredFields(target)) {
    const v = data ? data[f.key] : undefined;
    if (f.required && isEmpty(v)) {
      errs[f.key] = `${f.label} es obligatorio`;
      continue;
    }
    if (!isEmpty(v)) {
      if (f.type === 'number' && !Number.isFinite(Number(v))) {
        errs[f.key] = `${f.label} debe ser un número`;
        continue;
      }
      if (f.type === 'date' && !isValidDate(v)) {
        errs[f.key] = `${f.label} debe ser una fecha válida (YYYY-MM-DD)`;
        continue;
      }
      if (f.type === 'select' && !f.options.includes(String(v).trim())) {
        errs[f.key] = `${f.label} debe ser uno de: ${f.options.join(', ')}`;
      }
    }
  }
  return errs;
}

function validateLifecycleStatus(status, currentStatus, errors) {
  const lc = getConfig().statusLifecycle;
  if (!lc) return;
  if (currentStatus === undefined || currentStatus === null) {
    if (!isEmpty(status) && !lc.statuses.includes(status)) {
      errors.status = `El estado debe ser uno de: ${lc.statuses.join(', ')}`;
    }
    return;
  }
  if (status === currentStatus) return;
  const allowed = lc.transitions[currentStatus] || [];
  if (!allowed.includes(status)) {
    errors.status = `Transición de estado inválida de "${currentStatus}" a "${status}"`;
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function validateEntity({ name, code, email, targetDate, creditLimit, ...rest }) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'El nombre es obligatorio';
  if (!code || !code.trim()) errors.code = 'El código es obligatorio';
  if (!isEmpty(email) && !isValidEmail(email)) errors.email = 'El correo electrónico no es válido';
  if (!isEmpty(targetDate) && !isValidDate(targetDate))
    errors.targetDate = 'La fecha objetivo debe ser una fecha válida (YYYY-MM-DD)';
  if (!isEmpty(creditLimit)) {
    const c = Number(creditLimit);
    if (Number.isNaN(c) || c < 0) errors.creditLimit = 'El límite de crédito debe ser un número no negativo';
  }
  Object.assign(errors, collectCustomErrors('entity', rest));
  return { valid: Object.keys(errors).length === 0, errors };
}

function pickCustomFields(target, data) {
  const out = {};
  for (const f of declaredFields(target)) {
    const n = normalizeCustomValue(f, data[f.key]);
    if (n !== undefined) out[f.key] = n;
  }
  return out;
}

function textOrUndefined(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim() || undefined;
}

const BASE_ENTITY_KEYS = new Set([
  'id',
  'entity_id',
  'name',
  'code',
  'taxId',
  'email',
  'phone',
  'address',
  'category',
  'description',
  'targetDate',
  'creditLimit',
  'paymentTerms',
  'createdAt',
  'updatedAt'
]);

const BASE_DOCUMENT_KEYS = new Set([
  'id',
  'entity_id',
  'contactId',
  'series',
  'folio',
  'startDate',
  'endDate',
  'quantity',
  'subtotal',
  'discount',
  'taxAmount',
  'totalAmount',
  'currency',
  'paymentTerms',
  'notes',
  'status',
  'createdAt',
  'updatedAt'
]);

/**
 * Conserva las claves guardadas que el perfil actual ya no declara ni son
 * campos base, para no reinterpretar ni borrar datos en silencio.
 */
function preservedUnknownKeys(target, existing) {
  if (!existing) return {};
  const declared = new Set(declaredFields(target).map((field) => field.key));
  const base = target === 'entity' ? BASE_ENTITY_KEYS : BASE_DOCUMENT_KEYS;
  const preserved = {};
  for (const [key, value] of Object.entries(existing)) {
    if (!base.has(key) && !declared.has(key)) preserved[key] = value;
  }
  return preserved;
}

function buildEntity(payload, existing) {
  const now = new Date().toISOString();
  return {
    ...preservedUnknownKeys('entity', existing),
    id: existing ? existing.id : generateId('ent'),
    entity_id: existing ? existing.entity_id : generateId('cli'),
    name: (payload.name || '').trim(),
    code: isCrmProfile() ? normalizeCode(payload.code) : (payload.code || '').trim(),
    taxId: textOrUndefined(payload.taxId),
    email: textOrUndefined(payload.email),
    phone: textOrUndefined(payload.phone),
    address: textOrUndefined(payload.address),
    category: textOrUndefined(payload.category),
    description: textOrUndefined(payload.description),
    targetDate: textOrUndefined(payload.targetDate),
    creditLimit: isEmpty(payload.creditLimit) ? undefined : Number(payload.creditLimit),
    paymentTerms: textOrUndefined(payload.paymentTerms),
    ...pickCustomFields('entity', payload),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

export function addEntity(payload) {
  const snapshot = loadSnapshot();
  const errors = { ...validateEntity(payload).errors };
  if (isCrmProfile()) Object.assign(errors, validateClient(payload, { entities: snapshot.entities }).errors);
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const entity = buildEntity(payload);
  saveSnapshot({ ...snapshot, entities: [...snapshot.entities, entity] });
  return entity;
}

export function updateEntity(id, updates) {
  const snapshot = loadSnapshot();
  const idx = snapshot.entities.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Entidad no encontrada');
  const previous = snapshot.entities[idx];
  const identity = assertImmutableIdentity(previous, {
    ...previous,
    id: updates.id !== undefined ? updates.id : previous.id,
    entity_id: updates.entity_id !== undefined ? updates.entity_id : previous.entity_id
  });
  if (!identity.valid) throw new Error(identity.error);
  const merged = { ...previous, ...updates };
  const errors = { ...validateEntity(merged).errors };
  if (isCrmProfile()) {
    Object.assign(errors, validateClient(merged, { entities: snapshot.entities, currentId: previous.id }).errors);
  }
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = buildEntity(merged, previous);
  const entities = [...snapshot.entities];
  entities[idx] = next;
  saveSnapshot({ ...snapshot, entities });
  return next;
}

function aggregateFor(snapshot, entity) {
  const entityId = entity.entity_id;
  return {
    entity,
    documents: snapshot.documents.filter((item) => item.entity_id === entityId),
    tickets: snapshot.tickets.filter((item) => item.entity_id === entityId),
    contacts: snapshot.contacts.filter((item) => item.entity_id === entityId),
    activities: snapshot.activities.filter((item) => item.entity_id === entityId)
  };
}

function withoutEntity(snapshot, entity) {
  const entityId = entity.entity_id;
  return {
    entities: snapshot.entities.filter((item) => item.id !== entity.id),
    documents: snapshot.documents.filter((item) => item.entity_id !== entityId),
    tickets: snapshot.tickets.filter((item) => item.entity_id !== entityId),
    contacts: snapshot.contacts.filter((item) => item.entity_id !== entityId),
    activities: snapshot.activities.filter((item) => item.entity_id !== entityId),
    trash: snapshot.trash
  };
}

/**
 * Mueve el agregado completo del cliente a la papelera (máximo 50) y lo quita
 * de las colecciones activas en una sola instantánea atómica.
 */
export function moveEntityToTrash(id) {
  const snapshot = loadSnapshot();
  const target = snapshot.entities.find((entity) => entity.id === id);
  if (!target) throw new Error('Entidad no encontrada');
  const entry = createTrashEntry(aggregateFor(snapshot, target));
  const { entries } = trimTrash([...snapshot.trash, entry]);
  const next = { ...withoutEntity(snapshot, target), trash: entries };
  saveSnapshot(next);
  return entry;
}

/**
 * Elimina un cliente y mueve el agregado a la papelera en una sola escritura.
 * Si la escritura falla, no se modifica el estado previo.
 */
export function deleteEntity(id) {
  const snapshot = loadSnapshot();
  const target = snapshot.entities.find((entity) => entity.id === id);
  if (!target) {
    const newEntities = snapshot.entities.filter((entity) => entity.id !== id);
    saveSnapshot({ ...snapshot, entities: newEntities });
    return newEntities;
  }
  const entry = createTrashEntry(aggregateFor(snapshot, target));
  const { entries } = trimTrash([...snapshot.trash, entry]);
  const next = { ...withoutEntity(snapshot, target), trash: entries };
  saveSnapshot(next);
  return next.entities;
}

/** Restaura un cliente con todas sus relaciones; detecta conflictos de ids. */
export function restoreFromTrash(trashId) {
  const snapshot = loadSnapshot();
  const entry = snapshot.trash.find((item) => item.id === trashId);
  if (!entry) throw new Error('El elemento no está en la papelera');
  const result = restoreTrashEntry(entry, snapshot);
  if (!result.ok) {
    const error = new Error(result.conflicts[0] ? result.conflicts[0].message : 'No se pudo restaurar el elemento');
    error.conflicts = result.conflicts;
    throw error;
  }
  saveSnapshot(result.snapshot);
  return entry;
}

/** Purga definitiva de un elemento de la papelera. */
export function purgeTrashEntry(trashId) {
  const snapshot = loadSnapshot();
  const trash = purgeEntry(trashId, snapshot.trash);
  saveSnapshot({ ...snapshot, trash });
  return trash;
}

export function countDocumentsForEntity(entityId) {
  return loadDocuments().filter((d) => d.entity_id === entityId).length;
}

export function countTicketsForEntity(entityId) {
  return loadTickets().filter((t) => t.entity_id === entityId).length;
}

export function countContactsForEntity(entityId) {
  return loadContacts().filter((c) => c.entity_id === entityId).length;
}

export function countActivitiesForEntity(entityId) {
  return loadActivities().filter((a) => a.entity_id === entityId).length;
}

export function validateDocument(payload, currentStatus) {
  const { entityId, folio, startDate, endDate, quantity, subtotal, discount, status } = payload;
  const errors = {};
  const entities = loadEntities();
  if (!entityId || !entities.some((e) => e.entity_id === entityId)) {
    errors.entityId = 'Selecciona una entidad para el documento';
  }
  if (isEmpty(folio)) {
    errors.folio = 'El folio es obligatorio';
  } else {
    const f = Number(folio);
    if (!Number.isInteger(f) || f <= 0) errors.folio = 'El folio debe ser un entero positivo';
  }
  if (!startDate) {
    errors.startDate = 'La fecha de inicio es obligatoria';
  } else if (!isValidDate(startDate)) errors.startDate = 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)';
  if (!endDate) {
    errors.endDate = 'La fecha de fin es obligatoria';
  } else if (!isValidDate(endDate)) errors.endDate = 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)';
  if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate) && endDate < startDate) {
    errors.endDate = 'La fecha de fin debe ser igual o posterior a la fecha de inicio';
  }
  if (quantity !== undefined && quantity !== null && quantity !== '') {
    const n = Number(quantity);
    if (!Number.isInteger(n) || n <= 0) errors.quantity = 'La cantidad debe ser un entero positivo';
  }
  for (const [key, label] of [
    ['subtotal', 'El subtotal'],
    ['discount', 'El descuento'],
    ['taxAmount', 'El impuesto'],
    ['totalAmount', 'El importe total']
  ]) {
    const v = payload[key];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0) errors[key] = `${label} debe ser un número no negativo`;
  }
  if (
    !errors.subtotal &&
    !errors.discount &&
    subtotal !== undefined &&
    subtotal !== null &&
    subtotal !== '' &&
    discount !== undefined &&
    discount !== null &&
    discount !== '' &&
    Number(discount) > Number(subtotal)
  ) {
    errors.discount = 'El descuento no puede superar el subtotal';
  }
  validateLifecycleStatus((status || '').trim(), currentStatus, errors);
  Object.assign(errors, collectCustomErrors('document', payload));
  return { valid: Object.keys(errors).length === 0, errors };
}

function buildDocument(payload, existing) {
  const now = new Date().toISOString();
  return {
    ...preservedUnknownKeys('document', existing),
    id: existing ? existing.id : generateId('doc'),
    entity_id: payload.entityId || payload.entity_id,
    contactId: textOrUndefined(payload.contactId),
    series: textOrUndefined(payload.series),
    folio: Number(payload.folio),
    startDate: payload.startDate,
    endDate: payload.endDate,
    quantity: isEmpty(payload.quantity) ? undefined : Number(payload.quantity),
    subtotal: isEmpty(payload.subtotal) ? undefined : Number(payload.subtotal),
    discount: isEmpty(payload.discount) ? undefined : Number(payload.discount),
    taxAmount: isEmpty(payload.taxAmount) ? undefined : Number(payload.taxAmount),
    totalAmount: isEmpty(payload.totalAmount) ? undefined : Number(payload.totalAmount),
    currency: textOrUndefined(payload.currency),
    paymentTerms: textOrUndefined(payload.paymentTerms),
    notes: textOrUndefined(payload.notes),
    status: textOrUndefined(payload.status),
    ...pickCustomFields('document', payload),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

export function addDocument(payload) {
  const snapshot = loadSnapshot();
  const crm = isCrmProfile();
  const errors = { ...validateDocument(payload).errors };
  if (crm) {
    const candidate = {
      ...payload,
      entityId: payload.entityId || payload.entity_id,
      series: 'OPP',
      currency: 'CLP',
      status: payload.status || 'Nueva'
    };
    Object.assign(
      errors,
      validateOpportunity(candidate, {
        entities: snapshot.entities,
        documents: snapshot.documents,
        contacts: snapshot.contacts
      }).errors
    );
  }
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const document = buildDocument(crm ? { ...payload, series: 'OPP', currency: 'CLP', status: 'Nueva' } : payload);
  saveSnapshot({ ...snapshot, documents: [...snapshot.documents, document] });
  return document;
}

export function updateDocument(id, updates) {
  const snapshot = loadSnapshot();
  const idx = snapshot.documents.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Documento no encontrado');
  const previous = snapshot.documents[idx];
  const merged = { ...previous, ...updates };
  const nextStatus = updates.status !== undefined ? (updates.status || '').trim() : previous.status;
  const crm = isCrmProfile();

  const identity = assertImmutableIdentity(previous, {
    ...merged,
    entity_id: updates.entity_id !== undefined ? updates.entity_id : previous.entity_id
  });
  if (!identity.valid) throw new Error(identity.error);

  const errors = {
    ...validateDocument(
      {
        entityId: merged.entity_id,
        series: merged.series,
        folio: merged.folio,
        startDate: merged.startDate,
        endDate: merged.endDate,
        quantity: merged.quantity,
        subtotal: merged.subtotal,
        discount: merged.discount,
        taxAmount: merged.taxAmount,
        totalAmount: merged.totalAmount,
        status: nextStatus,
        ...pickCustomFields('document', merged)
      },
      previous.status
    ).errors
  };

  if (crm) {
    const candidate = { ...merged, entityId: merged.entity_id, status: nextStatus };
    Object.assign(
      errors,
      validateOpportunity(candidate, {
        entities: snapshot.entities,
        documents: snapshot.documents,
        contacts: snapshot.contacts,
        currentId: previous.id,
        mode: 'update'
      }).errors
    );
    const change = validateStatusChange(previous.status, nextStatus, candidate.lossReason);
    if (!change.valid) errors.status = change.error;
  }

  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = buildDocument({ ...merged, status: nextStatus, entityId: merged.entity_id }, previous);
  const documents = [...snapshot.documents];
  documents[idx] = next;
  saveSnapshot({ ...snapshot, documents });
  return next;
}

function detachActivitiesFromDocument(snapshot, documentIds) {
  return snapshot.activities.map((activity) =>
    documentIds.includes(activity.documentId) ? { ...activity, documentId: null } : activity
  );
}

export function deleteDocument(id) {
  const snapshot = loadSnapshot();
  const newDocuments = snapshot.documents.filter((d) => d.id !== id);
  saveSnapshot({
    ...snapshot,
    documents: newDocuments,
    activities: detachActivitiesFromDocument(snapshot, [id])
  });
  return newDocuments;
}

export function deleteDocumentsForEntity(entityId) {
  const snapshot = loadSnapshot();
  const removed = snapshot.documents.filter((d) => d.entity_id === entityId).map((d) => d.id);
  const newDocuments = snapshot.documents.filter((d) => d.entity_id !== entityId);
  saveSnapshot({
    ...snapshot,
    documents: newDocuments,
    activities: detachActivitiesFromDocument(snapshot, removed)
  });
  return newDocuments;
}

function buildTicket(payload, existing) {
  const now = new Date().toISOString();
  return {
    id: existing ? existing.id : generateId('tkt'),
    entity_id: existing ? existing.entity_id : payload.entityId || payload.entity_id,
    productId: textOrUndefined(payload.productId),
    productName: textOrUndefined(payload.productName),
    equipmentReference: textOrUndefined(payload.equipmentReference),
    reason: textOrUndefined(payload.reason),
    description: textOrUndefined(payload.description),
    priority: textOrUndefined(payload.priority),
    status: textOrUndefined(payload.status) || (existing ? existing.status : 'En proceso'),
    resolutionSummary: textOrUndefined(payload.resolutionSummary),
    resolvedAt: textOrUndefined(payload.resolvedAt),
    legacyResolutionIncomplete:
      existing && existing.legacyResolutionIncomplete === true
        ? true
        : payload.legacyResolutionIncomplete === true
          ? true
          : undefined,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

/**
 * Añade un ticket validado y con estado inicial En proceso. El cliente debe
 * existir y el producto se identifica por `productId` o `productName`.
 */
export function addTicket(payload) {
  const snapshot = loadSnapshot();
  const candidate = { ...payload, entityId: payload.entityId || payload.entity_id, status: 'En proceso' };
  const errors = validateTicket(candidate, { entities: snapshot.entities }).errors;
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const ticket = buildTicket(candidate);
  saveSnapshot({ ...snapshot, tickets: [...snapshot.tickets, ticket] });
  return ticket;
}

/**
 * Actualiza un ticket conservando `id`, `entity_id` y `status`. Cambiar a
 * Resuelto exige resumen y genera `resolvedAt`; no se permite reapertura.
 */
export function updateTicket(id, updates) {
  const snapshot = loadSnapshot();
  const idx = snapshot.tickets.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Ticket no encontrado');
  const previous = snapshot.tickets[idx];
  const merged = { ...previous, ...updates, entity_id: previous.entity_id };
  const nextStatus = updates.status !== undefined ? String(updates.status || '').trim() : previous.status;

  if (nextStatus !== previous.status) {
    if (!canTransitionTicket(previous.status, nextStatus)) {
      throw new Error(
        `Transición de ticket no permitida de "${previous.status}" a "${nextStatus}". Los tickets resueltos no se reabren en el MVP.`
      );
    }
    if (nextStatus === 'Resuelto') {
      const resolved = resolveTicketRecord(previous, updates.resolutionSummary);
      Object.assign(merged, {
        status: 'Resuelto',
        resolutionSummary: resolved.resolutionSummary,
        resolvedAt: resolved.resolvedAt
      });
    }
  }

  const candidate = { ...merged, status: nextStatus === 'Resuelto' ? 'Resuelto' : nextStatus };
  const errors = validateTicket(candidate, { entities: snapshot.entities, mode: 'update' }).errors;
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = { ...buildTicket(candidate, previous), status: candidate.status };
  const tickets = [...snapshot.tickets];
  tickets[idx] = next;
  saveSnapshot({ ...snapshot, tickets });
  return next;
}

/** Resuelve un ticket con resumen obligatorio en una sola escritura. */
export function resolveTicket(id, summary) {
  return updateTicket(id, { status: 'Resuelto', resolutionSummary: summary });
}

export function deleteTicketsForEntity(entityId) {
  const snapshot = loadSnapshot();
  const tickets = snapshot.tickets.filter((t) => t.entity_id !== entityId);
  saveSnapshot({ ...snapshot, tickets });
  return tickets;
}

function buildContact(payload, existing) {
  const now = new Date().toISOString();
  return {
    id: existing ? existing.id : generateId('con'),
    entity_id: existing ? existing.entity_id : payload.entityId || payload.entity_id,
    name: String(payload.name || '').trim(),
    role: textOrUndefined(payload.role),
    email: textOrUndefined(payload.email),
    phone: textOrUndefined(payload.phone),
    isPrimary: existing ? Boolean(existing.isPrimary) : Boolean(payload.isPrimary),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

export function addContact(payload) {
  const snapshot = loadSnapshot();
  const candidate = { ...payload, entityId: payload.entityId || payload.entity_id };
  const errors = validateContact(candidate, { entities: snapshot.entities }).errors;
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const contact = buildContact(candidate);
  const own = snapshot.contacts.filter((item) => item.entity_id === contact.entity_id);
  let contacts = [...snapshot.contacts, contact];
  contacts = ensureSinglePrimary(
    contacts,
    contact.entity_id,
    contact.isPrimary || own.length === 0 ? contact.id : undefined
  );
  const inserted = contacts.find((item) => item.id === contact.id);
  saveSnapshot({ ...snapshot, contacts });
  return inserted;
}

export function updateContact(id, updates) {
  const snapshot = loadSnapshot();
  const idx = snapshot.contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Contacto no encontrado');
  const previous = snapshot.contacts[idx];
  const identity = assertImmutableIdentity(previous, {
    ...previous,
    entity_id: updates.entity_id !== undefined ? updates.entity_id : previous.entity_id
  });
  if (!identity.valid) throw new Error(identity.error);

  const merged = { ...previous, ...updates };
  const errors = validateContact(merged, { entities: snapshot.entities }).errors;
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = buildContact(merged, previous);
  if (updates.isPrimary !== undefined) next.isPrimary = Boolean(updates.isPrimary);
  let contacts = [...snapshot.contacts];
  contacts[idx] = next;
  if (next.isPrimary) {
    contacts = ensureSinglePrimary(contacts, next.entity_id, next.id);
  } else {
    const own = contacts.filter((item) => item.entity_id === next.entity_id);
    if (!own.some((item) => item.isPrimary) && own.length > 0) {
      contacts = ensureSinglePrimary(contacts, next.entity_id, own[0].id);
    }
  }
  const saved = contacts.find((item) => item.id === next.id);
  saveSnapshot({ ...snapshot, contacts });
  return saved;
}

/**
 * Elimina un contacto. Las actividades vinculadas se reasignan al contacto
 * indicado o quedan sin vínculo; nunca se dejan referencias huérfanas. Si era
 * el principal, otro contacto del cliente pasa a serlo.
 */
export function deleteContact(id, { reassignTo = null } = {}) {
  const snapshot = loadSnapshot();
  const target = snapshot.contacts.find((c) => c.id === id);
  if (!target) throw new Error('Contacto no encontrado');
  if (reassignTo && !snapshot.contacts.some((c) => c.id === reassignTo && c.entity_id === target.entity_id)) {
    throw new Error('El contacto de reasignación debe pertenecer al mismo cliente');
  }
  if (reassignTo === id) {
    throw new Error('El contacto de reasignación no puede ser el mismo que se elimina');
  }
  const contacts = snapshot.contacts.filter((c) => c.id !== id);
  const normalized = ensureSinglePrimary(contacts, target.entity_id);
  const activities = snapshot.activities.map((activity) =>
    activity.contactId === id
      ? { ...activity, contactId: reassignTo || null, updatedAt: new Date().toISOString() }
      : activity
  );
  const documents = snapshot.documents.map((document) =>
    document.contactId === id
      ? { ...document, contactId: reassignTo || undefined, updatedAt: new Date().toISOString() }
      : document
  );
  saveSnapshot({ ...snapshot, contacts: normalized, activities, documents });
  return normalized;
}

export function deleteContactsForEntity(entityId) {
  const snapshot = loadSnapshot();
  const contacts = snapshot.contacts.filter((c) => c.entity_id !== entityId);
  const activities = snapshot.activities.map((activity) =>
    activity.entity_id === entityId ? { ...activity, contactId: null } : activity
  );
  saveSnapshot({ ...snapshot, contacts, activities });
  return contacts;
}

function buildActivity(payload, existing) {
  const now = new Date().toISOString();
  return {
    id: existing ? existing.id : generateId('act'),
    entity_id: existing ? existing.entity_id : payload.entityId || payload.entity_id,
    type: textOrUndefined(payload.type),
    subject: String(payload.subject || '').trim(),
    notes: textOrUndefined(payload.notes),
    dueDate: textOrUndefined(payload.dueDate),
    owner: textOrUndefined(payload.owner),
    contactId: textOrUndefined(payload.contactId),
    documentId: textOrUndefined(payload.documentId),
    status: existing ? existing.status : 'pendiente',
    completedAt: existing ? existing.completedAt : null,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

export function addActivity(payload) {
  const snapshot = loadSnapshot();
  const candidate = { ...payload, entityId: payload.entityId || payload.entity_id, status: 'pendiente' };
  const errors = validateActivity(candidate, {
    entities: snapshot.entities,
    contacts: snapshot.contacts,
    documents: snapshot.documents
  }).errors;
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const activity = buildActivity(candidate);
  saveSnapshot({ ...snapshot, activities: [...snapshot.activities, activity] });
  return activity;
}

export function updateActivity(id, updates) {
  const snapshot = loadSnapshot();
  const idx = snapshot.activities.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Actividad no encontrada');
  const previous = snapshot.activities[idx];
  const identity = assertImmutableIdentity(previous, {
    ...previous,
    entity_id: updates.entity_id !== undefined ? updates.entity_id : previous.entity_id
  });
  if (!identity.valid) throw new Error(identity.error);

  const merged = { ...previous, ...updates };
  if (merged.status === 'completada' && !merged.completedAt) merged.completedAt = new Date().toISOString();
  const errors = validateActivity(merged, {
    entities: snapshot.entities,
    contacts: snapshot.contacts,
    documents: snapshot.documents,
    mode: 'update'
  }).errors;
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = buildActivity(merged, previous);
  next.status = merged.status || previous.status;
  next.completedAt = next.status === 'completada' ? merged.completedAt || next.completedAt : null;
  const activities = [...snapshot.activities];
  activities[idx] = next;
  saveSnapshot({ ...snapshot, activities });
  return next;
}

/** Marca la actividad como completada y registra la fecha de cierre. */
export function completeActivityById(id) {
  const snapshot = loadSnapshot();
  const idx = snapshot.activities.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Actividad no encontrada');
  const next = completeActivity(snapshot.activities[idx]);
  const activities = [...snapshot.activities];
  activities[idx] = next;
  saveSnapshot({ ...snapshot, activities });
  return next;
}

export function deleteActivity(id) {
  const snapshot = loadSnapshot();
  const activities = snapshot.activities.filter((a) => a.id !== id);
  saveSnapshot({ ...snapshot, activities });
  return activities;
}

export function deleteActivitiesForEntity(entityId) {
  const snapshot = loadSnapshot();
  const activities = snapshot.activities.filter((a) => a.entity_id !== entityId);
  saveSnapshot({ ...snapshot, activities });
  return activities;
}

export function clearAll() {
  saveSnapshot({ entities: [], documents: [], tickets: [], contacts: [], activities: [], trash: [] });
}

/**
 * Completa una operación interrumpida antes de habilitar escrituras. Devuelve
 * el estado del bloqueo sin mostrar éxito cuando la recuperación no puede
 * verificarse.
 */
export function recoverPendingOperation() {
  const state = detectPendingRecovery();
  if (state.corrupt) {
    return {
      recovered: false,
      blocked: true,
      error: state.error || 'No se pudo verificar la versión recuperable. Las escrituras están bloqueadas.'
    };
  }
  if (!state.pending) return { recovered: false, blocked: false };
  try {
    const result = restorePreviousSnapshot((snapshot) => {
      writeRawSnapshot({
        entities: snapshot.entities,
        documents: snapshot.documents,
        tickets: snapshot.tickets,
        contacts: snapshot.contacts,
        activities: snapshot.activities,
        trash: snapshot.trash
      });
      localStorage.setItem(SCHEMA_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION }));
    });
    return { recovered: result.restored === true, blocked: false };
  } catch (error) {
    return {
      recovered: false,
      blocked: true,
      error: error && error.message ? error.message : 'No se pudo completar la recuperación.'
    };
  }
}

/** Indica si las escrituras están bloqueadas por una versión no verificable. */
export function isWriteBlocked() {
  return !recoveryCanWrite();
}

let pendingMigrationPlan = null;

/**
 * Solicita una migración explícita. No escribe nada: describe los pasos y
 * exige confirmación del usuario antes de aplicar.
 */
export function requestMigration(from, to = SCHEMA_VERSION) {
  const stored = Number.isInteger(from) ? from : readSchemaVersion();
  if (stored >= to) {
    pendingMigrationPlan = null;
    return { from: stored, to, steps: [], requiresConfirmation: false, backup: false };
  }
  pendingMigrationPlan = {
    from: stored,
    to,
    steps: [
      'Agregar las colecciones de contactos, actividades y papelera sin reemplazar clientes, oportunidades ni tickets.',
      'Marcar los tickets resueltos históricos sin resumen con legacyResolutionIncomplete, sin inventar solución ni fecha.'
    ],
    requiresConfirmation: true,
    backup: true
  };
  return pendingMigrationPlan;
}

/**
 * Aplica la migración solicitada conservando una versión recuperable. Solo
 * marca datos ausentes; no inventa ni convierte valores existentes.
 */
export function applyMigration() {
  if (!pendingMigrationPlan) throw new Error('No hay una migración solicitada pendiente de confirmación.');
  const snapshot = readRawCollections();
  const now = new Date().toISOString();
  const migrated = {
    ...snapshot,
    tickets: snapshot.tickets.map((ticket) =>
      ticket && ticket.status === 'Resuelto' && isEmpty(ticket.resolutionSummary)
        ? { ...ticket, legacyResolutionIncomplete: true, updatedAt: ticket.updatedAt || now }
        : ticket
    ),
    entities: snapshot.entities,
    documents: snapshot.documents,
    contacts: snapshot.contacts,
    activities: snapshot.activities,
    trash: snapshot.trash
  };
  saveSnapshot(migrated);
  localStorage.setItem(SCHEMA_KEY, JSON.stringify({ schemaVersion: pendingMigrationPlan.to }));
  const plan = pendingMigrationPlan;
  pendingMigrationPlan = null;
  return { applied: true, ...plan };
}

/** Cancela la migración propuesta y conserva el formato original. */
export function cancelMigration() {
  const plan = pendingMigrationPlan;
  pendingMigrationPlan = null;
  return { applied: false, keptVersion: readSchemaVersion(), plan };
}

export function searchEntities(term) {
  const q = (term || '').trim().toLowerCase();
  if (!q) return loadEntities();
  const fields = [
    'name',
    'code',
    'taxId',
    'email',
    'phone',
    'address',
    'category',
    'description',
    'targetDate',
    'paymentTerms',
    ...declaredFields('entity').map((f) => f.key)
  ];
  return loadEntities().filter((e) =>
    fields.some((f) =>
      String(e[f] ?? '')
        .toLowerCase()
        .includes(q)
    )
  );
}
