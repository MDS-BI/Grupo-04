import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  BASE_FIELDS,
  FIELD_TYPES,
  normalizeConfig,
  loadModuleConfig,
  setActiveConfig,
  getConfig,
  labelFor,
  isCrmProfile
} from '../../src/module-config.js';

const salesConfig = {
  moduleName: 'Ventas',
  labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' },
  customFields: [
    { target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number', required: true },
    {
      target: 'document',
      key: 'metodoEnvio',
      label: 'Método de envío',
      type: 'select',
      options: ['estándar', 'exprés']
    }
  ],
  statusLifecycle: {
    statuses: ['cotización', 'pedido', 'facturado'],
    transitions: { cotización: ['pedido'], pedido: ['facturado'], facturado: [] }
  }
};

describe('module-config', () => {
  it('falls back to built-in defaults when no configuration is provided', () => {
    const { config, errors } = normalizeConfig(null);
    expect(errors).toEqual([]);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('returns defaults for undefined configuration too', () => {
    const { config, errors } = normalizeConfig(undefined);
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe(DEFAULT_CONFIG.moduleName);
  });

  it('accepts a complete sales-style profile', () => {
    const { config, errors } = normalizeConfig(salesConfig);
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe('Ventas');
    expect(config.labels.entity).toBe('Cliente');
    expect(config.customFields.length).toBe(2);
    expect(config.statusLifecycle.statuses).toEqual(['cotización', 'pedido', 'facturado']);
  });

  it('reports an invalid module name instead of failing silently', () => {
    const { errors } = normalizeConfig({ moduleName: '' });
    expect(errors.some((e) => e.includes('moduleName'))).toBe(true);
  });

  it('rejects unknown custom field types', () => {
    const { errors } = normalizeConfig({
      customFields: [{ target: 'entity', key: 'x', label: 'X', type: 'floaty' }]
    });
    expect(errors.some((e) => e.includes('type'))).toBe(true);
  });

  it('rejects custom field keys colliding with base fields', () => {
    for (const base of BASE_FIELDS.entity) {
      const { errors } = normalizeConfig({
        customFields: [{ target: 'entity', key: base, label: 'X', type: 'text' }]
      });
      if (base === 'id') {
        // id is a base field; collision must be reported
        expect(errors.length).toBeGreaterThan(0);
        break;
      }
    }
    const { errors } = normalizeConfig({
      customFields: [{ target: 'entity', key: 'name', label: 'X', type: 'text' }]
    });
    expect(errors.some((e) => e.includes('choca con un campo base'))).toBe(true);
  });

  it('rejects select fields without options', () => {
    const { errors } = normalizeConfig({
      customFields: [{ target: 'document', key: 'terms', label: 'Terms', type: 'select' }]
    });
    expect(errors.some((e) => e.includes('options'))).toBe(true);
  });

  it('rejects duplicate custom field keys per target', () => {
    const field = { target: 'entity', key: 'dup', label: 'Dup', type: 'text' };
    const { errors } = normalizeConfig({ customFields: [field, { ...field }] });
    expect(errors.some((e) => e.includes('más de una vez'))).toBe(true);
  });

  it('rejects lifecycle transitions referencing unknown statuses', () => {
    const { errors } = normalizeConfig({
      statusLifecycle: { statuses: ['a'], transitions: { a: ['ghost'] } }
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('keeps unspecified labels at their defaults', () => {
    const { config, errors } = normalizeConfig({ labels: { entity: 'Product' } });
    expect(errors).toEqual([]);
    expect(config.labels.entity).toBe('Product');
    expect(config.labels.documents).toBe(DEFAULT_CONFIG.labels.documents);
  });

  it('treats null lifecycle as free-form status', () => {
    const { config, errors } = normalizeConfig({ statusLifecycle: null });
    expect(errors).toEqual([]);
    expect(config.statusLifecycle).toBeNull();
  });

  it('loadModuleConfig exposes the CRM profile declared in userConfig', async () => {
    const { config, errors } = await loadModuleConfig();
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe('CRM — Clientes y Oportunidades');
    expect(config.labels.entity).toBe('Cliente');
    expect(config.labels.entities).toBe('Clientes');
    expect(config.labels.document).toBe('Oportunidad');
    expect(config.labels.documents).toBe('Oportunidades');
    expect(config.theme.accentColor).toBe('#0F766E');
    expect(config.statusLifecycle.statuses).toEqual([
      'Nueva',
      'Contactada',
      'Propuesta',
      'Negociación',
      'Ganada',
      'Perdida'
    ]);
    const keys = config.customFields.map((f) => f.key);
    expect(keys).toEqual([
      'contactName',
      'accountOwner',
      'acquisitionSource',
      'opportunityTitle',
      'opportunityOwner',
      'lossReason'
    ]);
    expect(config.catalogs.category).toEqual(['Prospecto', 'Activo', 'Inactivo']);
  });

  it('exposes active config and label helpers after setActiveConfig', () => {
    const { config } = normalizeConfig(salesConfig);
    setActiveConfig(config);
    expect(getConfig().moduleName).toBe('Ventas');
    expect(labelFor('entity')).toBe('Cliente');
    expect(labelFor('documents')).toBe('Pedidos de Venta');
    setActiveConfig(null);
    expect(labelFor('entity')).toBe('Entidad');
  });

  it('supports all declared field types', () => {
    expect(FIELD_TYPES).toContain('text');
    expect(FIELD_TYPES).toContain('number');
    expect(FIELD_TYPES).toContain('date');
    expect(FIELD_TYPES).toContain('select');
  });

  describe('theme', () => {
    it('provides a default accent color when no theme is configured', () => {
      const { config, errors } = normalizeConfig(null);
      expect(errors).toEqual([]);
      expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
    });

    it('accepts a six-digit hex accent color', () => {
      const { config, errors } = normalizeConfig({ theme: { accentColor: '#0f62fe' } });
      expect(errors).toEqual([]);
      expect(config.theme.accentColor).toBe('#0f62fe');
    });

    it('accepts a three-digit hex accent color', () => {
      const { config, errors } = normalizeConfig({ theme: { accentColor: '#f0b' } });
      expect(errors).toEqual([]);
      expect(config.theme.accentColor).toBe('#f0b');
    });

    it('accepts uppercase hex digits', () => {
      const { config, errors } = normalizeConfig({ theme: { accentColor: '#FF8800' } });
      expect(errors).toEqual([]);
      expect(config.theme.accentColor).toBe('#FF8800');
    });

    it('rejects non-hex accent colors and keeps the default', () => {
      for (const bad of ['blue', '#12345', '123456', '#zzzzzz']) {
        const { config, errors } = normalizeConfig({ theme: { accentColor: bad } });
        expect(errors.some((e) => e.includes('theme.accentColor'))).toBe(true);
        expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
      }
    });

    it('rejects a non-object theme and keeps defaults', () => {
      const { config, errors } = normalizeConfig({ theme: 'dark' });
      expect(errors.some((e) => e.includes('theme'))).toBe(true);
      expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
    });

    it('keeps the default accent when accentColor is omitted', () => {
      const { config, errors } = normalizeConfig({ theme: {} });
      expect(errors).toEqual([]);
      expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
    });
  });

  describe('catalogs and loader diagnostics', () => {
    it('accepts a catalogs map of non-empty option lists', () => {
      const { config, errors } = normalizeConfig({
        catalogs: { category: ['Prospecto', 'Activo', 'Inactivo'] }
      });
      expect(errors).toEqual([]);
      expect(config.catalogs.category).toEqual(['Prospecto', 'Activo', 'Inactivo']);
    });

    it('reports invalid catalog definitions and keeps the generic fallback', () => {
      for (const catalogs of ['nope', { category: 'Activo' }, { category: [] }, { category: ['Activo', ''] }]) {
        const { config, errors } = normalizeConfig({ catalogs });
        expect(errors.some((e) => e.includes('catalogs'))).toBe(true);
        expect(config.catalogs).toEqual({});
      }
    });

    it('reports duplicate options in select fields', () => {
      const { errors } = normalizeConfig({
        customFields: [{ target: 'entity', key: 'x', label: 'X', type: 'select', options: ['A', 'A'] }]
      });
      expect(errors.some((e) => e.includes('opciones'))).toBe(true);
    });

    it('reports a customized key colliding with a document base field', () => {
      const { errors } = normalizeConfig({
        customFields: [{ target: 'document', key: 'folio', label: 'Folio', type: 'text' }]
      });
      expect(errors.some((e) => e.includes('choca con un campo base'))).toBe(true);
    });

    it('exposes configuration errors instead of throwing', () => {
      const { config, errors } = normalizeConfig({
        moduleName: 'X',
        customFields: 'bad',
        statusLifecycle: { statuses: [] }
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(config.moduleName).toBe('X');
      expect(config.customFields).toEqual([]);
    });

    it('identifies whether the active profile is the CRM one', () => {
      const { config } = normalizeConfig({ labels: { entity: 'Cliente', document: 'Oportunidad' } });
      expect(isCrmProfile(config)).toBe(true);
      expect(isCrmProfile(DEFAULT_CONFIG)).toBe(false);
    });
  });

  describe('catálogos de post-venta', () => {
    it('declares channel, assignee and team without duplicates or blanks and keeps priority and reason', async () => {
      const { config } = await loadModuleConfig();
      expect(config.catalogs.channel).toEqual(['Teléfono', 'Correo', 'WhatsApp', 'Presencial', 'Portal']);
      expect(config.catalogs.assignee).toEqual(['Técnico A', 'Técnico B', 'Técnico C']);
      expect(config.catalogs.team).toEqual(['Soporte técnico', 'Terreno', 'Repuestos']);
      expect(config.catalogs.priority).toEqual(['Alta', 'Media', 'Baja']);
      expect(config.catalogs.reason).toEqual(['soporte', 'reclamo', 'consulta']);
      for (const name of ['channel', 'assignee', 'team', 'priority', 'reason']) {
        const options = config.catalogs[name];
        expect(options.length).toBeGreaterThan(0);
        expect(options.every((option) => String(option).trim() !== '')).toBe(true);
        expect(new Set(options).size).toBe(options.length);
      }
    });
  });
});
