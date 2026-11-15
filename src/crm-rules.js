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
 */
export function searchClients(criterion, filters = {}, entities = []) {
  const query = normalizeText(criterion);
  if (!query) return [];
  return entities.filter(
    (entity) =>
      entity &&
      matchesClientFilters(entity, filters) &&
      (normalizeText(entity.name).includes(query) || normalizeText(entity.code).includes(query))
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
