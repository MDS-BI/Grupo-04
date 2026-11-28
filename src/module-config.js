// ============================================================================
// Configuración del Módulo — edita `userConfig` abajo para adaptar este módulo
// base a un módulo ERP específico (p. ej., Ventas). Ningún otro archivo necesita cambios.
// ============================================================================

// Establece en null para ejecutar con los valores predeterminados integrados,
// o proporciona un objeto como:
// {
//   moduleName: 'Ventas',
//   labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' },
//   customFields: [
//     { target: 'entity', key: 'zona', label: 'Zona', type: 'select', options: ['Norte', 'Sur'] },
//     { target: 'document', key: 'metodoEnvio', label: 'Método de envío', type: 'select', options: ['estándar', 'exprés'] }
//   ],
//   statusLifecycle: {
//     statuses: ['cotización', 'pedido', 'facturado'],
//     transitions: { cotización: ['pedido'], pedido: ['facturado'], facturado: [] }
//   },
//   theme: { accentColor: '#0f62fe' }
// }
export const CRM_ACCOUNT_OWNERS = Object.freeze(['Ejecutivo A', 'Ejecutivo B']);
export const CRM_ACQUISITION_SOURCES = Object.freeze(['Sitio web', 'Referido', 'Contacto directo', 'Otro']);
export const CRM_CATEGORIES = Object.freeze(['Prospecto', 'Activo', 'Inactivo']);
export const CRM_TICKET_PRIORITIES = Object.freeze(['Alta', 'Media', 'Baja']);
export const CRM_TICKET_REASONS = Object.freeze(['soporte', 'reclamo', 'consulta']);
export const CRM_TICKET_CHANNELS = Object.freeze(['Teléfono', 'Correo', 'WhatsApp', 'Presencial', 'Portal']);
export const CRM_TICKET_ASSIGNEES = Object.freeze(['Técnico A', 'Técnico B', 'Técnico C']);
export const CRM_TICKET_TEAMS = Object.freeze(['Soporte técnico', 'Terreno', 'Repuestos']);
export const CRM_ACTIVITY_TYPES = Object.freeze(['llamada', 'correo', 'reunion', 'nota', 'tarea']);

// Perfil CRM — Clientes y Oportunidades (MVP P1).
export const userConfig = {
  moduleName: 'CRM — Clientes y Oportunidades',
  labels: {
    entity: 'Cliente',
    entities: 'Clientes',
    document: 'Oportunidad',
    documents: 'Oportunidades',
    contact: 'Contacto',
    contacts: 'Contactos',
    activity: 'Actividad',
    activities: 'Actividades',
    trash: 'Papelera'
  },
  customFields: [
    { target: 'entity', key: 'contactName', label: 'Contacto principal', type: 'text', required: false },
    {
      target: 'entity',
      key: 'accountOwner',
      label: 'Responsable comercial',
      type: 'select',
      required: true,
      options: [...CRM_ACCOUNT_OWNERS]
    },
    {
      target: 'entity',
      key: 'acquisitionSource',
      label: 'Origen de captación',
      type: 'select',
      required: true,
      options: [...CRM_ACQUISITION_SOURCES]
    },
    { target: 'document', key: 'opportunityTitle', label: 'Asunto', type: 'text', required: true },
    {
      target: 'document',
      key: 'opportunityOwner',
      label: 'Responsable de la oportunidad',
      type: 'select',
      required: true,
      options: [...CRM_ACCOUNT_OWNERS]
    },
    { target: 'document', key: 'lossReason', label: 'Motivo de pérdida', type: 'text', required: false }
  ],
  catalogs: {
    category: [...CRM_CATEGORIES],
    accountOwner: [...CRM_ACCOUNT_OWNERS],
    opportunityOwner: [...CRM_ACCOUNT_OWNERS],
    acquisitionSource: [...CRM_ACQUISITION_SOURCES],
    priority: [...CRM_TICKET_PRIORITIES],
    reason: [...CRM_TICKET_REASONS],
    channel: [...CRM_TICKET_CHANNELS],
    assignee: [...CRM_TICKET_ASSIGNEES],
    team: [...CRM_TICKET_TEAMS],
    activityTypes: [...CRM_ACTIVITY_TYPES]
  },
  statusLifecycle: {
    statuses: ['Nueva', 'Contactada', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'],
    transitions: {
      Nueva: ['Contactada', 'Perdida'],
      Contactada: ['Propuesta', 'Perdida'],
      Propuesta: ['Negociación', 'Perdida'],
      Negociación: ['Ganada', 'Perdida'],
      Ganada: [],
      Perdida: []
    }
  },
  theme: { accentColor: '#0F766E' }
};

// ---------------------------------------------------------------------------
// Cargador central — no deberías necesitar modificar nada debajo de esta línea.
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG = Object.freeze({
  moduleName: 'Módulo Base ERP',
  labels: Object.freeze({
    entity: 'Entidad',
    entities: 'Entidades',
    document: 'Documento',
    documents: 'Documentos',
    contact: 'Contacto',
    contacts: 'Contactos',
    activity: 'Actividad',
    activities: 'Actividades',
    trash: 'Papelera'
  }),
  customFields: Object.freeze([]),
  catalogs: Object.freeze({}),
  statusLifecycle: null,
  theme: Object.freeze({ accentColor: '#2563eb' })
});

export const FIELD_TYPES = ['text', 'number', 'date', 'select'];

export const BASE_FIELDS = Object.freeze({
  entity: Object.freeze([
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
  ]),
  document: Object.freeze([
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
  ])
});

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateCustomFields(raw, errors) {
  const seen = { entity: new Set(), document: new Set() };
  if (!Array.isArray(raw)) {
    errors.push('customFields debe ser un arreglo');
    return [];
  }
  const clean = [];
  raw.forEach((f, i) => {
    const where = `customFields[${i}]`;
    if (!f || typeof f !== 'object') {
      errors.push(`${where} debe ser un objeto`);
      return;
    }
    if (f.target !== 'entity' && f.target !== 'document') {
      errors.push(`${where}.target debe ser "entity" o "document"`);
      return;
    }
    if (!isNonEmptyString(f.key)) {
      errors.push(`${where}.key debe ser una cadena no vacía`);
      return;
    }
    if (BASE_FIELDS[f.target].includes(f.key)) {
      errors.push(`${where}.key "${f.key}" choca con un campo base de ${f.target}`);
      return;
    }
    if (seen[f.target].has(f.key)) {
      errors.push(`${where}.key "${f.key}" está declarada más de una vez`);
      return;
    }
    if (!FIELD_TYPES.includes(f.type)) {
      errors.push(`${where}.type debe ser uno de: ${FIELD_TYPES.join(', ')}`);
      return;
    }
    if (f.type === 'select' && !(Array.isArray(f.options) && f.options.length > 0)) {
      errors.push(`${where}.options debe ser un arreglo no vacío para campos de selección`);
      return;
    }
    if (Array.isArray(f.options)) {
      const cleanOptions = f.options.map((o) => String(o).trim());
      if (cleanOptions.some((o) => o.length === 0)) {
        errors.push(`${where}.options no puede contener opciones vacías`);
        return;
      }
      if (new Set(cleanOptions).size !== cleanOptions.length) {
        errors.push(`${where}.options no puede repetir opciones`);
        return;
      }
    }
    seen[f.target].add(f.key);
    clean.push({
      target: f.target,
      key: f.key,
      label: isNonEmptyString(f.label) ? f.label : f.key,
      type: f.type,
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? [...f.options] : undefined
    });
  });
  return clean;
}

function validateLifecycle(raw, errors) {
  if (raw === null || raw === undefined) return null;
  if (
    typeof raw !== 'object' ||
    !Array.isArray(raw.statuses) ||
    raw.statuses.length === 0 ||
    !raw.statuses.every(isNonEmptyString)
  ) {
    errors.push('statusLifecycle.statuses debe ser un arreglo no vacío de nombres de estado');
    return null;
  }
  const statuses = new Set(raw.statuses);
  const transitions = {};
  if (raw.transitions !== undefined && (typeof raw.transitions !== 'object' || raw.transitions === null)) {
    errors.push('statusLifecycle.transitions debe ser un objeto que mapee estado -> arreglo de estados siguientes');
    return null;
  }
  const source = raw.transitions || {};
  for (const [from, toList] of Object.entries(source)) {
    if (!statuses.has(from)) {
      errors.push(`statusLifecycle.transitions referencia el estado desconocido "${from}"`);
      return null;
    }
    if (!Array.isArray(toList) || !toList.every((s) => statuses.has(s))) {
      errors.push(`statusLifecycle.transitions["${from}"] debe listar estados conocidos`);
      return null;
    }
    transitions[from] = [...toList];
  }
  return { statuses: [...raw.statuses], transitions };
}

function validateTheme(raw, errors) {
  if (raw === null || raw === undefined) return structuredClone(DEFAULT_CONFIG.theme);
  if (typeof raw !== 'object') {
    errors.push('theme debe ser un objeto');
    return structuredClone(DEFAULT_CONFIG.theme);
  }
  const out = { accentColor: DEFAULT_CONFIG.theme.accentColor };
  if (raw.accentColor !== undefined && raw.accentColor !== null) {
    const value = String(raw.accentColor).trim();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      errors.push('theme.accentColor debe ser un color hexadecimal como #rrggbb');
    } else {
      out.accentColor = value;
    }
  }
  return out;
}

function validateCatalogs(raw, errors) {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('catalogs debe ser un objeto que mapee nombre de catálogo -> arreglo de opciones');
    return {};
  }
  const out = {};
  for (const [name, options] of Object.entries(raw)) {
    if (!isNonEmptyString(name)) {
      errors.push('catalogs no puede contener nombres de catálogo vacíos');
      continue;
    }
    if (!Array.isArray(options) || options.length === 0) {
      errors.push(`catalogs.${name} debe ser un arreglo no vacío de opciones`);
      continue;
    }
    const clean = options.map((o) => (typeof o === 'string' ? o.trim() : ''));
    if (clean.some((o) => o.length === 0)) {
      errors.push(`catalogs.${name} no puede contener opciones vacías`);
      continue;
    }
    if (new Set(clean).size !== clean.length) {
      errors.push(`catalogs.${name} no puede repetir opciones`);
      continue;
    }
    out[name] = clean;
  }
  return out;
}

export function normalizeConfig(raw) {
  if (raw === null || raw === undefined) {
    return { config: structuredClone(DEFAULT_CONFIG), errors: [] };
  }
  if (typeof raw !== 'object') {
    return { config: structuredClone(DEFAULT_CONFIG), errors: ['La configuración del módulo debe ser un objeto'] };
  }
  const errors = [];
  const cfg = structuredClone(DEFAULT_CONFIG);
  if (raw.moduleName !== undefined) {
    if (!isNonEmptyString(raw.moduleName)) errors.push('moduleName debe ser una cadena no vacía');
    else cfg.moduleName = raw.moduleName.trim();
  }
  if (raw.labels !== undefined) {
    if (typeof raw.labels !== 'object' || raw.labels === null) errors.push('labels debe ser un objeto');
    else {
      for (const key of [
        'entity',
        'entities',
        'document',
        'documents',
        'contact',
        'contacts',
        'activity',
        'activities',
        'trash'
      ]) {
        if (raw.labels[key] === undefined) continue;
        if (!isNonEmptyString(raw.labels[key])) {
          errors.push(`labels.${key} debe ser una cadena no vacía`);
          continue;
        }
        cfg.labels[key] = raw.labels[key].trim();
      }
    }
  }
  if (raw.customFields !== undefined && raw.customFields !== null) {
    cfg.customFields = validateCustomFields(raw.customFields, errors);
  }
  if (raw.statusLifecycle !== undefined) {
    const lc = validateLifecycle(raw.statusLifecycle, errors);
    if (lc) cfg.statusLifecycle = lc;
  }
  if (raw.catalogs !== undefined) {
    cfg.catalogs = validateCatalogs(raw.catalogs, errors);
  }
  if (raw.theme !== undefined) {
    cfg.theme = validateTheme(raw.theme, errors);
  }
  return { config: cfg, errors };
}

let activeConfig = structuredClone(DEFAULT_CONFIG);

export function setActiveConfig(config) {
  activeConfig = normalizeConfig(config).config;
}

export function getConfig() {
  return activeConfig;
}

export function labelFor(kind) {
  return activeConfig.labels[kind] || DEFAULT_CONFIG.labels[kind];
}

/**
 * El perfil CRM se reconoce por su terminología comercial. Cuando no está
 * activo, la aplicación conserva el comportamiento genérico del template.
 */
export function isCrmProfile(config = activeConfig) {
  const labels = (config && config.labels) || {};
  const same = (value, expected) =>
    String(value || '')
      .trim()
      .toLowerCase() === expected;
  return same(labels.entity, 'cliente') && same(labels.document, 'oportunidad');
}

export async function loadModuleConfig() {
  const { config, errors } = normalizeConfig(userConfig);
  return { config, errors };
}
