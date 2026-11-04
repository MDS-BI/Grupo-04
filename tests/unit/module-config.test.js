import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, BASE_FIELDS, FIELD_TYPES, normalizeConfig, loadModuleConfig, setActiveConfig, getConfig, labelFor } from '../../src/module-config.js';

const salesConfig = {
  moduleName: 'Ventas',
  labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' },
  customFields: [
    { target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number', required: true },
    { target: 'document', key: 'metodoEnvio', label: 'Método de envío', type: 'select', options: ['estándar', 'exprés'] }
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
    expect(errors.some(e => e.includes('moduleName'))).toBe(true);
  });

  it('rejects unknown custom field types', () => {
    const { errors } = normalizeConfig({
      customFields: [{ target: 'entity', key: 'x', label: 'X', type: 'floaty' }]
    });
    expect(errors.some(e => e.includes('type'))).toBe(true);
  });

  it('rejects custom field keys colliding with base fields', () => {
    for(const base of BASE_FIELDS.entity){
      const { errors } = normalizeConfig({
        customFields: [{ target: 'entity', key: base, label: 'X', type: 'text' }]
      });
      if(base === 'id'){
        // id is a base field; collision must be reported
        expect(errors.length).toBeGreaterThan(0);
        break;
      }
    }
    const { errors } = normalizeConfig({
      customFields: [{ target: 'entity', key: 'name', label: 'X', type: 'text' }]
    });
    expect(errors.some(e => e.includes('choca con un campo base'))).toBe(true);
  });

  it('rejects select fields without options', () => {
    const { errors } = normalizeConfig({
      customFields: [{ target: 'document', key: 'terms', label: 'Terms', type: 'select' }]
    });
    expect(errors.some(e => e.includes('options'))).toBe(true);
  });

  it('rejects duplicate custom field keys per target', () => {
    const field = { target: 'entity', key: 'dup', label: 'Dup', type: 'text' };
    const { errors } = normalizeConfig({ customFields: [field, { ...field }] });
    expect(errors.some(e => e.includes('más de una vez'))).toBe(true);
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

  it('loadModuleConfig reflects the userConfig slot (null by default)', async () => {
    const { config, errors } = await loadModuleConfig();
    expect(errors).toEqual([]);
    expect(config.moduleName).toBe(DEFAULT_CONFIG.moduleName);
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
      for(const bad of ['blue', '#12345', '123456', '#zzzzzz']){
        const { config, errors } = normalizeConfig({ theme: { accentColor: bad } });
        expect(errors.some(e => e.includes('theme.accentColor'))).toBe(true);
        expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
      }
    });

    it('rejects a non-object theme and keeps defaults', () => {
      const { config, errors } = normalizeConfig({ theme: 'dark' });
      expect(errors.some(e => e.includes('theme'))).toBe(true);
      expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
    });

    it('keeps the default accent when accentColor is omitted', () => {
      const { config, errors } = normalizeConfig({ theme: {} });
      expect(errors).toEqual([]);
      expect(config.theme.accentColor).toBe(DEFAULT_CONFIG.theme.accentColor);
    });
  });
});
