// Reglas puras del módulo CRM. No acceden a localStorage ni al DOM.
import { getConfig } from './module-config.js';

/** Código de cliente comparable: recorta espacios y pasa a mayúsculas. */
export function normalizeCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

/** Texto comparable para búsqueda: recorta, minúsculas y sin diacríticos. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isValidEmail(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

/** Valida un valor contra un catálogo declarado (arreglo de opciones). */
export function isValidCatalogValue(value, catalog) {
  if (!Array.isArray(catalog)) return false;
  return catalog.includes(String(value ?? '').trim());
}

/** Fecha de calendario real en formato YYYY-MM-DD, sin pasar por UTC. */
export function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/**
 * Compara dos fechas de calendario `YYYY-MM-DD` como cadenas.
 * Devuelve -1 si a < b, 0 si son iguales y 1 si a > b.
 */
export function compareCalendarDates(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Fecha local del dispositivo como `YYYY-MM-DD`, sin conversión a UTC. */
export function todayLocal(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Catálogo declarado en ModuleConfig, si existe. */
export function catalog(name, config = getConfig()) {
  const catalogs = (config && config.catalogs) || {};
  return Array.isArray(catalogs[name]) ? catalogs[name] : [];
}

/**
 * Estado del próximo contacto calculado con el día local del dispositivo.
 * Devuelve "Sin programar", "Vencido", "Para hoy" o "Programado".
 */
export function getTargetDateStatus(targetDate, today = todayLocal()) {
  if (!targetDate || !isValidCalendarDate(String(targetDate))) return 'Sin programar';
  const comparison = compareCalendarDates(String(targetDate), today);
  if (comparison < 0) return 'Vencido';
  if (comparison === 0) return 'Para hoy';
  return 'Programado';
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

const REQUIRED_CLIENT_FIELDS = [
  ['name', 'El nombre es obligatorio'],
  ['code', 'El código es obligatorio'],
  ['category', 'El tipo de cliente es obligatorio'],
  ['accountOwner', 'El responsable comercial es obligatorio'],
  ['acquisitionSource', 'El origen de captación es obligatorio']
];

/**
 * Valida un cliente aplicando las reglas CRM (obligatorios, catálogos,
 * correo, fecha de próximo contacto y unicidad de código normalizado).
 * Si el perfil no declara catálogos, se conserva el respaldo genérico.
 */
export function validateClient(client, context = {}) {
  const config = context.config || getConfig();
  const entities = Array.isArray(context.entities) ? context.entities : [];
  const errors = {};

  for (const [field, message] of REQUIRED_CLIENT_FIELDS) {
    if (isBlank(client[field])) errors[field] = message;
  }

  const catalogRules = [
    ['category', 'category', 'El tipo de cliente'],
    ['accountOwner', 'accountOwner', 'El responsable comercial'],
    ['acquisitionSource', 'acquisitionSource', 'El origen de captación']
  ];
  for (const [field, catalogName, label] of catalogRules) {
    if (errors[field]) continue;
    const options = catalog(catalogName, config);
    if (options.length === 0) continue;
    if (!isValidCatalogValue(client[field], options)) {
      errors[field] = `${label} debe ser uno de: ${options.join(', ')}`;
    }
  }

  if (!errors.code) {
    const normalized = normalizeCode(client.code);
    const duplicated = entities.some(
      (entity) => entity && entity.id !== context.currentId && normalizeCode(entity.code) === normalized
    );
    if (duplicated) errors.code = `Ya existe un cliente con el código ${normalized}`;
  }

  if (!isValidEmail(client.email)) errors.email = 'El correo electrónico no es válido';

  if (!isBlank(client.targetDate) && !isValidCalendarDate(String(client.targetDate))) {
    errors.targetDate = 'La fecha de próximo contacto debe ser una fecha válida (YYYY-MM-DD)';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Transiciones declaradas en el ciclo de vida configurado. */
export function canTransition(from, to, config = getConfig()) {
  const lifecycle = config.statusLifecycle;
  if (!lifecycle) return false;
  if (!from || !to || from === to) return false;
  return (lifecycle.transitions[from] || []).includes(to);
}

/** Estados siguientes permitidos para una etapa; vacío en estados finales. */
export function nextStatuses(status, config = getConfig()) {
  const lifecycle = config.statusLifecycle;
  if (!lifecycle || !status) return [];
  return [...(lifecycle.transitions[status] || [])];
}

/**
 * Valida un cambio de etapa: transiciones declaradas, estados finales sin
 * reapertura y motivo obligatorio al entrar en Perdida.
 */
export function validateStatusChange(from, to, lossReason) {
  if (from === to) return { valid: true };
  if (!from || !to) return { valid: false, error: 'La etapa de la oportunidad es obligatoria' };
  if (!canTransition(from, to)) {
    return {
      valid: false,
      error: `Transición no permitida de "${from}" a "${to}". Las oportunidades cerradas no se reabren en el MVP.`
    };
  }
  if (to === 'Perdida' && isBlank(lossReason)) {
    return { valid: false, error: 'El motivo de pérdida es obligatorio al marcar la oportunidad como Perdida' };
  }
  return { valid: true };
}

const CLIENT_FILTERS = ['category', 'accountOwner', 'acquisitionSource'];

function matchesClientFilters(client, filters = {}) {
  return CLIENT_FILTERS.every((key) => !filters[key] || client[key] === filters[key]);
}

/**
 * Busca clientes y prospectos por nombre o código con normalización
 * `trim → minúsculas → sin diacríticos` y filtros combinados con AND.
 * Si se entregan contactos, también coinciden nombre, correo o teléfono del
 * contacto y devuelven el cliente asociado (CA-12-05).
 */
export function searchClients(criterion, filters = {}, entities = [], contacts = []) {
  const query = normalizeText(criterion);
  if (!query) return [];
  const contactList = Array.isArray(contacts) ? contacts : [];
  const matchesContact = (entity) =>
    contactList.some(
      (contact) =>
        contact &&
        contact.entity_id === entity.entity_id &&
        (normalizeText(contact.name).includes(query) ||
          normalizeText(contact.email).includes(query) ||
          normalizeText(contact.phone).includes(query))
    );
  return entities.filter(
    (entity) =>
      entity &&
      matchesClientFilters(entity, filters) &&
      (normalizeText(entity.name).includes(query) ||
        normalizeText(entity.code).includes(query) ||
        matchesContact(entity))
  );
}

const OPPORTUNITY_FILTERS = ['status', 'opportunityOwner'];

/**
 * Busca oportunidades por asunto o folio y devuelve cada resultado con su
 * cliente vinculado. Los filtros se combinan con AND.
 */
export function searchOpportunities(criterion, filters = {}, documents = [], entities = []) {
  const query = normalizeText(criterion);
  if (!query) return [];
  const byEntityId = new Map(entities.map((entity) => [entity.entity_id, entity]));

  return documents
    .filter((document) => {
      if (!document) return false;
      const title = normalizeText(document.opportunityTitle);
      const folio = String(document.folio ?? '');
      const matchesText = title.includes(query) || folio.includes(query);
      if (!matchesText) return false;
      if (!OPPORTUNITY_FILTERS.every((key) => !filters[key] || document[key] === filters[key])) return false;
      if (filters.category) {
        const client = byEntityId.get(document.entity_id);
        if (!client || client.category !== filters.category) return false;
      }
      return true;
    })
    .map((document) => ({ document, client: byEntityId.get(document.entity_id) || null }));
}

/** Monto CLP: número finito, entero y mayor o igual que cero. */
export function validateAmount(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { valid: false, error: 'El monto es obligatorio' };
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    return { valid: false, error: 'El monto debe ser un número entero no negativo en CLP' };
  }
  return { valid: true };
}

/** Fechas de calendario reales y cierre igual o posterior a la apertura. */
export function validateOpportunityDates(startDate, endDate) {
  const errors = {};
  if (isBlank(startDate)) errors.startDate = 'La fecha de apertura es obligatoria';
  else if (!isValidCalendarDate(String(startDate)))
    errors.startDate = 'La fecha de apertura debe ser una fecha válida (YYYY-MM-DD)';

  if (isBlank(endDate)) errors.endDate = 'La fecha estimada de cierre es obligatoria';
  else if (!isValidCalendarDate(String(endDate)))
    errors.endDate = 'La fecha estimada de cierre debe ser una fecha válida (YYYY-MM-DD)';

  if (!errors.startDate && !errors.endDate && compareCalendarDates(String(endDate), String(startDate)) < 0) {
    errors.endDate = 'La fecha de cierre debe ser igual o posterior a la fecha de apertura';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Unicidad global de la pareja serie + folio, excluyendo el registro actual. */
export function isFolioUnique(series, folio, documents = [], currentId) {
  const wantedSeries = String(series ?? '').trim();
  const wantedFolio = Number(folio);
  return !documents.some(
    (document) =>
      document &&
      document.id !== currentId &&
      String(document.series ?? '').trim() === wantedSeries &&
      Number(document.folio) === wantedFolio
  );
}

/**
 * Valida una oportunidad: cliente existente, asunto, folio único, fechas,
 * monto, responsable de catálogo y etapa inicial Nueva al crear.
 */
export function validateOpportunity(opportunity, context = {}) {
  const config = context.config || getConfig();
  const entities = Array.isArray(context.entities) ? context.entities : [];
  const documents = Array.isArray(context.documents) ? context.documents : [];
  const mode = context.mode || 'create';
  const errors = {};
  const entityId = opportunity.entityId || opportunity.entity_id;
  if (!entityId || !entities.some((entity) => entity.entity_id === entityId)) {
    errors.entityId = 'Selecciona un cliente existente para la oportunidad';
  }

  if (isBlank(opportunity.opportunityTitle)) {
    errors.opportunityTitle = 'El asunto es obligatorio';
  }

  if (isBlank(opportunity.folio)) {
    errors.folio = 'El folio es obligatorio';
  } else {
    const folio = Number(opportunity.folio);
    if (!Number.isInteger(folio) || folio <= 0) {
      errors.folio = 'El folio debe ser un entero mayor que cero';
    } else if (!isFolioUnique(opportunity.series || 'OPP', folio, documents, context.currentId)) {
      errors.folio = `Ya existe una oportunidad con la serie y folio OPP/${folio}`;
    }
  }

  Object.assign(errors, validateOpportunityDates(opportunity.startDate, opportunity.endDate).errors);

  const amount = validateAmount(opportunity.totalAmount);
  if (!amount.valid) errors.totalAmount = amount.error;

  const owners = catalog('opportunityOwner', config);
  if (isBlank(opportunity.opportunityOwner)) {
    errors.opportunityOwner = 'El responsable de la oportunidad es obligatorio';
  } else if (owners.length > 0 && !isValidCatalogValue(opportunity.opportunityOwner, owners)) {
    errors.opportunityOwner = `El responsable debe ser uno de: ${owners.join(', ')}`;
  }

  const status = String(opportunity.status ?? '').trim();
  if (mode === 'create') {
    if (status && status !== 'Nueva') {
      errors.status = 'Una oportunidad nueva debe comenzar en la etapa Nueva';
    }
  } else if (status === 'Perdida' && isBlank(opportunity.lossReason)) {
    errors.lossReason = 'El motivo de pérdida es obligatorio al marcar la oportunidad como Perdida';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export const TICKET_REASONS = Object.freeze(['soporte', 'reclamo', 'consulta']);
export const TICKET_PRIORITIES = Object.freeze(['Alta', 'Media', 'Baja']);
export const TICKET_STATUSES = Object.freeze(['En proceso', 'Resuelto']);

function ticketCatalog(name, fallback, config) {
  const declared = catalog(name, config);
  return declared.length > 0 ? declared : [...fallback];
}

/** Un ticket solo avanza de En proceso a Resuelto; no se reabre en el MVP. */
export function canTransitionTicket(from, to) {
  return from === 'En proceso' && to === 'Resuelto';
}

/**
 * Valida un ticket: cliente existente, producto (`productId` o `productName`),
 * motivo y prioridad de catálogo, descripción no vacía y estado inicial
 * `En proceso` al crear.
 */
export function validateTicket(ticket, context = {}) {
  const config = context.config || getConfig();
  const entities = Array.isArray(context.entities) ? context.entities : null;
  const mode = context.mode || 'create';
  const errors = {};

  const entityId = ticket.entityId || ticket.entity_id;
  if (isBlank(entityId)) {
    errors.entityId = 'Selecciona un cliente para el ticket';
  } else if (entities && !entities.some((entity) => entity.entity_id === entityId)) {
    errors.entityId = 'Selecciona un cliente existente para el ticket';
  }

  if (isBlank(ticket.productName) && isBlank(ticket.productId)) {
    errors.productName = 'Indica el producto o su nombre de respaldo';
  }

  const reasons = ticketCatalog('reason', TICKET_REASONS, config);
  if (isBlank(ticket.reason)) {
    errors.reason = 'El motivo del ticket es obligatorio';
  } else if (!isValidCatalogValue(ticket.reason, reasons)) {
    errors.reason = `El motivo debe ser uno de: ${reasons.join(', ')}`;
  }

  if (isBlank(ticket.description)) {
    errors.description = 'La descripción del ticket es obligatoria';
  }

  const priorities = ticketCatalog('priority', TICKET_PRIORITIES, config);
  if (isBlank(ticket.priority)) {
    errors.priority = 'La prioridad del ticket es obligatoria';
  } else if (!isValidCatalogValue(ticket.priority, priorities)) {
    errors.priority = `La prioridad debe ser uno de: ${priorities.join(', ')}`;
  }

  const status = String(ticket.status ?? '').trim();
  if (mode === 'create') {
    if (status && status !== 'En proceso') {
      errors.status = 'Un ticket nuevo debe comenzar en estado En proceso';
    }
  } else if (status && !TICKET_STATUSES.includes(status)) {
    errors.status = `El estado del ticket debe ser uno de: ${TICKET_STATUSES.join(', ')}`;
  }

  if (
    mode !== 'create' &&
    status === 'Resuelto' &&
    isBlank(ticket.resolutionSummary) &&
    !ticket.legacyResolutionIncomplete
  ) {
    errors.resolutionSummary = 'El resumen de la solución es obligatorio al resolver el ticket';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export const ACTIVITY_TYPES = Object.freeze(['llamada', 'correo', 'reunion', 'nota', 'tarea']);
export const ACTIVITY_STATUSES = Object.freeze(['pendiente', 'completada']);

function catalogOrFallback(name, fallback, config) {
  const declared = catalog(name, config);
  return declared.length > 0 ? declared : [...fallback];
}

/**
 * Resuelve un ticket generando la fecha y hora de resolución en el sistema.
 * El resumen es obligatorio y no puede contener únicamente espacios.
 */
export function resolveTicket(ticket, summary, now = new Date().toISOString()) {
  if (isBlank(summary)) {
    throw new Error('El resumen de la solución es obligatorio al resolver el ticket');
  }
  if (ticket.status === 'Resuelto' && !ticket.legacyResolutionIncomplete) {
    throw new Error('El ticket ya está resuelto; los tickets resueltos no se reabren.');
  }
  return {
    ...ticket,
    status: 'Resuelto',
    resolutionSummary: String(summary).trim(),
    resolvedAt: now,
    updatedAt: now
  };
}

/**
 * Valida un contacto: cliente existente, nombre obligatorio y correo válido
 * cuando existe. No exige un correo único.
 */
export function validateContact(contact, context = {}) {
  const entities = Array.isArray(context.entities) ? context.entities : null;
  const errors = {};
  const entityId = contact.entityId || contact.entity_id;
  if (isBlank(entityId)) errors.entityId = 'Selecciona un cliente para el contacto';
  else if (entities && !entities.some((entity) => entity.entity_id === entityId)) {
    errors.entityId = 'Selecciona un cliente existente para el contacto';
  }
  if (isBlank(contact.name)) errors.name = 'El nombre del contacto es obligatorio';
  if (!isValidEmail(contact.email)) errors.email = 'El correo electrónico no es válido';
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Garantiza exactamente un contacto principal por cliente cuando tiene al
 * menos un contacto. Sin `preferredId` conserva el principal actual o el
 * primero; con `preferredId` marca ese y desmarca los demás.
 */
export function ensureSinglePrimary(contacts = [], entityId, preferredId) {
  const list = Array.isArray(contacts) ? contacts : [];
  const own = list.filter((contact) => contact && contact.entity_id === entityId);
  if (own.length === 0) return list.map((contact) => ({ ...contact }));
  const current = own.find((contact) => contact.isPrimary);
  const primaryId =
    preferredId && own.some((contact) => contact.id === preferredId) ? preferredId : current ? current.id : own[0].id;
  return list.map((contact) =>
    contact && contact.entity_id === entityId ? { ...contact, isPrimary: contact.id === primaryId } : { ...contact }
  );
}

let legacyContactSequence = 0;

/**
 * Migra `contactName` al primer contacto una sola vez y de forma idempotente.
 * No borra el valor heredado ni duplica un contacto con el mismo nombre.
 */
export function migrateLegacyContactName(entity, contacts = [], now = new Date().toISOString()) {
  const list = Array.isArray(contacts) ? contacts : [];
  const legacy = String(entity && entity.contactName ? entity.contactName : '').trim();
  if (!entity || !entity.entity_id || !legacy) return { contacts: list, migrated: false };
  const own = list.filter((contact) => contact && contact.entity_id === entity.entity_id);
  // Si el cliente ya tiene contactos, la migración ya ocurrió (o el usuario los
  // gestionó manualmente): no se vuelve a crear el contacto heredado.
  if (own.length > 0) return { contacts: list, migrated: false };
  legacyContactSequence += 1;
  const contact = {
    id: `con_${Date.now().toString(36)}${legacyContactSequence}`,
    entity_id: entity.entity_id,
    name: legacy,
    role: '',
    email: String(entity.email ?? '').trim() || undefined,
    phone: String(entity.phone ?? '').trim() || undefined,
    isPrimary: !own.some((item) => item.isPrimary),
    createdAt: now,
    updatedAt: now
  };
  return { contacts: [...list, contact], migrated: true, contact };
}

/**
 * Valida una actividad: cliente existente, tipo de catálogo, asunto, vencimiento
 * obligatorio en tareas, responsable y vínculos opcionales coherentes.
 */
export function validateActivity(activity, context = {}) {
  const config = context.config || getConfig();
  const entities = Array.isArray(context.entities) ? context.entities : null;
  const contacts = Array.isArray(context.contacts) ? context.contacts : null;
  const documents = Array.isArray(context.documents) ? context.documents : null;
  const mode = context.mode || 'create';
  const errors = {};

  const entityId = activity.entityId || activity.entity_id;
  if (isBlank(entityId)) errors.entityId = 'Selecciona un cliente para la actividad';
  else if (entities && !entities.some((entity) => entity.entity_id === entityId)) {
    errors.entityId = 'Selecciona un cliente existente para la actividad';
  }

  const types = catalogOrFallback('activityTypes', ACTIVITY_TYPES, config);
  const type = String(activity.type ?? '').trim();
  if (isBlank(type)) errors.type = 'El tipo de actividad es obligatorio';
  else if (!types.includes(type)) errors.type = `El tipo debe ser uno de: ${types.join(', ')}`;

  if (isBlank(activity.subject)) errors.subject = 'El asunto de la actividad es obligatorio';

  const dueDate = String(activity.dueDate ?? '').trim();
  if (type === 'tarea' && isBlank(dueDate)) {
    errors.dueDate = 'El vencimiento es obligatorio en una tarea';
  } else if (!isBlank(dueDate) && !isValidCalendarDate(dueDate)) {
    errors.dueDate = 'El vencimiento debe ser una fecha válida (YYYY-MM-DD)';
  }

  const owners = [...catalog('accountOwner', config), ...catalog('opportunityOwner', config)];
  if (isBlank(activity.owner)) errors.owner = 'El responsable de la actividad es obligatorio';
  else if (owners.length > 0 && !owners.includes(String(activity.owner).trim())) {
    errors.owner = `El responsable debe ser uno de: ${[...new Set(owners)].join(', ')}`;
  }

  if (!isBlank(activity.contactId) && contacts) {
    const linked = contacts.find((contact) => contact && contact.id === activity.contactId);
    if (!linked || linked.entity_id !== entityId) {
      errors.contactId = 'El contacto debe pertenecer al mismo cliente';
    }
  }
  if (!isBlank(activity.documentId) && documents) {
    const linked = documents.find((document) => document && document.id === activity.documentId);
    if (!linked || linked.entity_id !== entityId) {
      errors.documentId = 'La oportunidad debe pertenecer al mismo cliente';
    }
  }

  const status = String(activity.status ?? '').trim();
  if (mode === 'create') {
    if (status && status !== 'pendiente') {
      errors.status = 'Una actividad nueva debe comenzar pendiente';
    }
  } else if (status && !ACTIVITY_STATUSES.includes(status)) {
    errors.status = `El estado debe ser uno de: ${ACTIVITY_STATUSES.join(', ')}`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Actividad vencida: pendiente con vencimiento anterior al día local. */
export function isActivityOverdue(activity, today = todayLocal()) {
  if (!activity || activity.status === 'completada') return false;
  const dueDate = String(activity.dueDate ?? '');
  if (!isValidCalendarDate(dueDate)) return false;
  return compareCalendarDates(dueDate, today) < 0;
}

/** Completa una actividad registrando la fecha de cierre (sin reabrirla). */
export function completeActivity(activity, now = new Date().toISOString()) {
  if (!activity) throw new Error('La actividad no existe');
  if (activity.status === 'completada') return { ...activity };
  return { ...activity, status: 'completada', completedAt: now, updatedAt: now };
}

function reportIssue(issues, collection, item, field, message) {
  const reference =
    collection === 'entities'
      ? item && (item.code || item.name)
      : collection === 'documents'
        ? item && `${item.series || 'OPP'}/${item.folio}`
        : (item && (item.name || item.subject || item.id)) || null;
  issues.push({
    collection,
    id: item && item.id ? item.id : null,
    reference: reference || null,
    field,
    message
  });
}

function uniqueValues(items, key, normalize) {
  const seen = new Map();
  const duplicates = [];
  for (const item of items) {
    const value = normalize(item[key]);
    if (!value) continue;
    if (seen.has(value)) duplicates.push(item);
    else seen.set(value, item);
  }
  return duplicates;
}

/**
 * Verifica la integridad estructural de una instantánea completa sin corregir
 * datos: estructura, versión, obligatorios base, tipos, unicidad de
 * identificadores, códigos y `series+folio`, y referencias huérfanas.
 */
export function validateIntegrity(snapshot = {}) {
  const issues = [];
  const collections = ['entities', 'documents', 'tickets', 'contacts', 'activities'];
  for (const name of collections) {
    if (snapshot[name] !== undefined && !Array.isArray(snapshot[name])) {
      issues.push({
        collection: name,
        id: null,
        reference: null,
        field: name,
        message: `La colección ${name} debe ser un arreglo`
      });
    }
  }
  const entities = Array.isArray(snapshot.entities) ? snapshot.entities : [];
  const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
  const tickets = Array.isArray(snapshot.tickets) ? snapshot.tickets : [];
  const contacts = Array.isArray(snapshot.contacts) ? snapshot.contacts : [];
  const activities = Array.isArray(snapshot.activities) ? snapshot.activities : [];
  const entityIds = new Set(entities.map((entity) => entity && entity.entity_id));

  for (const entity of entities) {
    if (!entity || typeof entity !== 'object') {
      reportIssue(issues, 'entities', null, 'entity', 'Hay un cliente con estructura inválida');
      continue;
    }
    if (isBlank(entity.id)) reportIssue(issues, 'entities', entity, 'id', 'El cliente no tiene identificador');
    if (isBlank(entity.entity_id))
      reportIssue(issues, 'entities', entity, 'entity_id', 'El cliente no tiene identificador público');
    if (isBlank(entity.name)) reportIssue(issues, 'entities', entity, 'name', 'El cliente no tiene nombre');
    if (isBlank(entity.code)) reportIssue(issues, 'entities', entity, 'code', 'El cliente no tiene código');
  }
  for (const duplicated of uniqueValues(entities, 'id', (value) => String(value ?? '').trim())) {
    reportIssue(issues, 'entities', duplicated, 'id', `El identificador ${duplicated.id} está repetido`);
  }
  for (const duplicated of uniqueValues(entities, 'entity_id', (value) => String(value ?? '').trim())) {
    reportIssue(issues, 'entities', duplicated, 'entity_id', `El identificador público está repetido`);
  }
  for (const duplicated of uniqueValues(entities, 'code', (value) => normalizeCode(value))) {
    reportIssue(issues, 'entities', duplicated, 'code', `El código ${duplicated.code} está duplicado`);
  }

  for (const document of documents) {
    if (!document || typeof document !== 'object') {
      reportIssue(issues, 'documents', null, 'document', 'Hay una oportunidad con estructura inválida');
      continue;
    }
    if (isBlank(document.id)) reportIssue(issues, 'documents', document, 'id', 'La oportunidad no tiene identificador');
    const folio = Number(document.folio);
    if (!Number.isInteger(folio) || folio <= 0) {
      reportIssue(issues, 'documents', document, 'folio', 'La oportunidad no tiene un folio entero positivo');
    }
    if (isBlank(document.entity_id)) {
      reportIssue(issues, 'documents', document, 'entity_id', 'La oportunidad no indica su cliente');
    } else if (!entityIds.has(document.entity_id)) {
      reportIssue(
        issues,
        'documents',
        document,
        'entity_id',
        `La oportunidad ${document.series || 'OPP'}/${document.folio} referencia un cliente inexistente`
      );
    }
    if (document.totalAmount !== undefined && document.totalAmount !== null && document.totalAmount !== '') {
      const amount = Number(document.totalAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        reportIssue(issues, 'documents', document, 'totalAmount', 'El monto de la oportunidad no es válido');
      }
    }
    if (!isBlank(document.startDate) && !isValidCalendarDate(String(document.startDate))) {
      reportIssue(issues, 'documents', document, 'startDate', 'La fecha de apertura no es válida');
    }
    if (!isBlank(document.endDate) && !isValidCalendarDate(String(document.endDate))) {
      reportIssue(issues, 'documents', document, 'endDate', 'La fecha de cierre no es válida');
    }
  }
  for (const duplicated of uniqueValues(documents, 'id', (value) => String(value ?? '').trim())) {
    reportIssue(issues, 'documents', duplicated, 'id', `El identificador ${duplicated.id} está repetido`);
  }
  const folioKeys = new Map();
  for (const document of documents) {
    if (!document || isBlank(document.folio)) continue;
    const key = `${String(document.series ?? '').trim()}|${Number(document.folio)}`;
    if (folioKeys.has(key)) {
      reportIssue(
        issues,
        'documents',
        document,
        'folio',
        `La pareja serie/folio ${document.series || 'OPP'}/${document.folio} está repetida`
      );
    } else {
      folioKeys.set(key, document);
    }
  }

  for (const ticket of tickets) {
    if (!ticket || typeof ticket !== 'object') {
      reportIssue(issues, 'tickets', null, 'ticket', 'Hay un ticket con estructura inválida');
      continue;
    }
    if (isBlank(ticket.id)) reportIssue(issues, 'tickets', ticket, 'id', 'El ticket no tiene identificador');
    if (isBlank(ticket.entity_id)) {
      reportIssue(issues, 'tickets', ticket, 'entity_id', 'El ticket no indica su cliente');
    } else if (!entityIds.has(ticket.entity_id)) {
      reportIssue(issues, 'tickets', ticket, 'entity_id', 'El ticket referencia un cliente inexistente');
    }
    if (isBlank(ticket.reason)) reportIssue(issues, 'tickets', ticket, 'reason', 'El ticket no tiene motivo');
    if (isBlank(ticket.description))
      reportIssue(issues, 'tickets', ticket, 'description', 'El ticket no tiene descripción');
    if (isBlank(ticket.priority)) reportIssue(issues, 'tickets', ticket, 'priority', 'El ticket no tiene prioridad');
    if (!TICKET_STATUSES.includes(String(ticket.status ?? '').trim())) {
      reportIssue(issues, 'tickets', ticket, 'status', 'El estado del ticket no es válido');
    }
    if (
      ticket.status === 'Resuelto' &&
      isBlank(ticket.resolutionSummary) &&
      ticket.legacyResolutionIncomplete !== true
    ) {
      reportIssue(
        issues,
        'tickets',
        ticket,
        'resolutionSummary',
        'Un ticket resuelto sin resumen debe identificarse como histórico mediante migración'
      );
    }
  }
  for (const duplicated of uniqueValues(tickets, 'id', (value) => String(value ?? '').trim())) {
    reportIssue(issues, 'tickets', duplicated, 'id', `El identificador ${duplicated.id} está repetido`);
  }

  const contactIds = new Set(contacts.map((contact) => contact && contact.id));
  const contactsByEntity = new Map();
  for (const contact of contacts) {
    if (!contact || typeof contact !== 'object') {
      reportIssue(issues, 'contacts', null, 'contact', 'Hay un contacto con estructura inválida');
      continue;
    }
    if (isBlank(contact.id)) reportIssue(issues, 'contacts', contact, 'id', 'El contacto no tiene identificador');
    if (isBlank(contact.name)) reportIssue(issues, 'contacts', contact, 'name', 'El contacto no tiene nombre');
    if (isBlank(contact.entity_id)) {
      reportIssue(issues, 'contacts', contact, 'entity_id', 'El contacto no indica su cliente');
    } else if (!entityIds.has(contact.entity_id)) {
      reportIssue(issues, 'contacts', contact, 'entity_id', 'El contacto referencia un cliente inexistente');
    } else {
      const list = contactsByEntity.get(contact.entity_id) || [];
      list.push(contact);
      contactsByEntity.set(contact.entity_id, list);
    }
  }
  for (const duplicated of uniqueValues(contacts, 'id', (value) => String(value ?? '').trim())) {
    reportIssue(issues, 'contacts', duplicated, 'id', `El identificador ${duplicated.id} está repetido`);
  }
  for (const [entityId, list] of contactsByEntity.entries()) {
    const primaries = list.filter((contact) => contact.isPrimary === true);
    if (primaries.length !== 1) {
      reportIssue(
        issues,
        'contacts',
        primaries[0] || list[0],
        'isPrimary',
        `El cliente ${entityId} debe tener exactamente un contacto principal`
      );
    }
  }

  const documentById = new Map(documents.map((document) => [document && document.id, document]));
  for (const activity of activities) {
    if (!activity || typeof activity !== 'object') {
      reportIssue(issues, 'activities', null, 'activity', 'Hay una actividad con estructura inválida');
      continue;
    }
    if (isBlank(activity.id)) reportIssue(issues, 'activities', activity, 'id', 'La actividad no tiene identificador');
    if (isBlank(activity.subject))
      reportIssue(issues, 'activities', activity, 'subject', 'La actividad no tiene asunto');
    if (isBlank(activity.entity_id)) {
      reportIssue(issues, 'activities', activity, 'entity_id', 'La actividad no indica su cliente');
    } else if (!entityIds.has(activity.entity_id)) {
      reportIssue(issues, 'activities', activity, 'entity_id', 'La actividad referencia un cliente inexistente');
    }
    if (!ACTIVITY_TYPES.includes(String(activity.type ?? '').trim())) {
      reportIssue(issues, 'activities', activity, 'type', 'El tipo de actividad no es válido');
    }
    if (String(activity.type ?? '').trim() === 'tarea' && isBlank(activity.dueDate)) {
      reportIssue(issues, 'activities', activity, 'dueDate', 'La tarea no tiene vencimiento');
    }
    if (!isBlank(activity.dueDate) && !isValidCalendarDate(String(activity.dueDate))) {
      reportIssue(issues, 'activities', activity, 'dueDate', 'El vencimiento de la actividad no es válido');
    }
    if (!isBlank(activity.contactId) && !contactIds.has(activity.contactId)) {
      reportIssue(issues, 'activities', activity, 'contactId', 'La actividad referencia un contacto inexistente');
    }
    if (!isBlank(activity.documentId)) {
      const linked = documentById.get(activity.documentId);
      if (!linked) {
        reportIssue(
          issues,
          'activities',
          activity,
          'documentId',
          'La actividad referencia una oportunidad inexistente'
        );
      } else if (linked.entity_id !== activity.entity_id) {
        reportIssue(
          issues,
          'activities',
          activity,
          'documentId',
          'La actividad y la oportunidad pertenecen a clientes distintos'
        );
      }
    }
  }
  for (const duplicated of uniqueValues(activities, 'id', (value) => String(value ?? '').trim())) {
    reportIssue(issues, 'activities', duplicated, 'id', `El identificador ${duplicated.id} está repetido`);
  }

  return { valid: issues.length === 0, issues };
}

/** Protege los identificadores inmutables al actualizar un registro. */
export function assertImmutableIdentity(previous, next) {
  if (!previous || !next) return { valid: true, errors: [] };
  const errors = [];
  if (previous.id !== next.id) errors.push('El identificador no puede cambiar');
  if (previous.entity_id !== next.entity_id) errors.push('El cliente asociado no puede reasignarse');
  return { valid: errors.length === 0, errors, error: errors[0] };
}

/**
 * Compara un cambio de etapa con la versión anterior: rechaza saltos no
 * declarados, reaperturas y pérdidas sin motivo.
 */
export function assertStatusTransition(previous, next) {
  if (!previous || !next || previous.status === next.status) return { valid: true };
  return validateStatusChange(previous.status, next.status, next.lossReason);
}

/** Diferencia real entre dos borradores: ignora diferencias de vacío y espacios. */
export function hasRealChanges(initial = {}, current = {}) {
  const keys = new Set([...Object.keys(initial || {}), ...Object.keys(current || {})]);
  for (const key of keys) {
    const before = String(initial && initial[key] !== undefined && initial[key] !== null ? initial[key] : '').trim();
    const after = String(current && current[key] !== undefined && current[key] !== null ? current[key] : '').trim();
    if (before !== after) return true;
  }
  return false;
}
