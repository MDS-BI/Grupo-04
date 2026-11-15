import { getConfig, isCrmProfile } from './module-config.js';
import { normalizeCode, validateClient, validateOpportunity, validateStatusChange } from './crm-rules.js';

export const ENTITIES_KEY = 'erp_base_module:entities';
export const DOCUMENTS_KEY = 'erp_base_module:documents';
export const SCHEMA_KEY = 'erp_base_module:schemaVersion';
export const SCHEMA_VERSION = 1;

const CORRUPT_MESSAGE =
  'No se pudo leer la información guardada: los datos están corruptos o tienen un formato inválido. No se modificó nada.';

const WRITE_MESSAGE =
  'No se pudo guardar: el almacenamiento del navegador está lleno o no está disponible. Los datos anteriores se conservaron.';

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

/**
 * Valida y persiste entidades, documentos y versión de esquema como una sola
 * instantánea en memoria. Si la escritura falla, restaura los valores previos.
 */
function saveSnapshot(snapshot) {
  assertCompatibleSchema();
  const entities = Array.isArray(snapshot.entities) ? snapshot.entities : [];
  const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const previous = {
    entities: localStorage.getItem(ENTITIES_KEY),
    documents: localStorage.getItem(DOCUMENTS_KEY),
    schema: localStorage.getItem(SCHEMA_KEY)
  };
  try {
    localStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    localStorage.setItem(SCHEMA_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION }));
  } catch {
    restoreRaw(ENTITIES_KEY, previous.entities);
    restoreRaw(DOCUMENTS_KEY, previous.documents);
    restoreRaw(SCHEMA_KEY, previous.schema);
    throw new Error(WRITE_MESSAGE);
  }
}

function firstError(errors) {
  return Object.values(errors)[0] || 'No se pudo validar el registro';
}

export function loadEntities() {
  return readCollection(ENTITIES_KEY, 'clientes');
}

export function saveEntities(entities) {
  saveSnapshot({ entities, documents: loadDocuments() });
}

export function loadDocuments() {
  return readCollection(DOCUMENTS_KEY, 'documentos');
}

export function saveDocuments(documents) {
  saveSnapshot({ entities: loadEntities(), documents });
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
  const entities = loadEntities();
  const documents = loadDocuments();
  const errors = { ...validateEntity(payload).errors };
  if (isCrmProfile()) Object.assign(errors, validateClient(payload, { entities }).errors);
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const entity = buildEntity(payload);
  saveSnapshot({ entities: [...entities, entity], documents });
  return entity;
}

export function updateEntity(id, updates) {
  const entities = loadEntities();
  const documents = loadDocuments();
  const idx = entities.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Entidad no encontrada');
  const previous = entities[idx];
  const merged = { ...previous, ...updates };
  const errors = { ...validateEntity(merged).errors };
  if (isCrmProfile()) {
    Object.assign(errors, validateClient(merged, { entities, currentId: previous.id }).errors);
  }
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = buildEntity(merged, previous);
  const list = [...entities];
  list[idx] = next;
  saveSnapshot({ entities: list, documents });
  return next;
}

/**
 * Elimina un cliente y sus documentos en una sola escritura de la instantánea.
 * En P2 la misma operación incluirá los tickets (T051).
 */
export function deleteEntity(id) {
  const entities = loadEntities();
  const documents = loadDocuments();
  const target = entities.find((e) => e.id === id);
  const newEntities = entities.filter((e) => e.id !== id);
  const newDocuments = target ? documents.filter((d) => d.entity_id !== target.entity_id) : documents;
  saveSnapshot({ entities: newEntities, documents: newDocuments });
  return newEntities;
}

export function countDocumentsForEntity(entityId) {
  return loadDocuments().filter((d) => d.entity_id === entityId).length;
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
  const entities = loadEntities();
  const documents = loadDocuments();
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
    Object.assign(errors, validateOpportunity(candidate, { entities, documents }).errors);
  }
  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const document = buildDocument(crm ? { ...payload, series: 'OPP', currency: 'CLP', status: 'Nueva' } : payload);
  saveSnapshot({ entities, documents: [...documents, document] });
  return document;
}

export function updateDocument(id, updates) {
  const entities = loadEntities();
  const documents = loadDocuments();
  const idx = documents.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Documento no encontrado');
  const previous = documents[idx];
  const merged = { ...previous, ...updates };
  const nextStatus = updates.status !== undefined ? (updates.status || '').trim() : previous.status;
  const crm = isCrmProfile();

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
      validateOpportunity(candidate, { entities, documents, currentId: previous.id, mode: 'update' }).errors
    );
    const change = validateStatusChange(previous.status, nextStatus, candidate.lossReason);
    if (!change.valid) errors.status = change.error;
  }

  if (Object.keys(errors).length > 0) throw new Error(firstError(errors));

  const next = buildDocument({ ...merged, status: nextStatus, entityId: merged.entity_id }, previous);
  const list = [...documents];
  list[idx] = next;
  saveSnapshot({ entities, documents: list });
  return next;
}

export function deleteDocument(id) {
  const entities = loadEntities();
  const documents = loadDocuments();
  const newDocuments = documents.filter((d) => d.id !== id);
  saveSnapshot({ entities, documents: newDocuments });
  return newDocuments;
}

export function deleteDocumentsForEntity(entityId) {
  const entities = loadEntities();
  const documents = loadDocuments();
  const newDocuments = documents.filter((d) => d.entity_id !== entityId);
  saveSnapshot({ entities, documents: newDocuments });
  return newDocuments;
}

export function clearAll() {
  saveSnapshot({ entities: [], documents: [] });
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
