import { describe, it, expect, beforeEach } from 'vitest';
import {
  compareCalendarDates,
  getTargetDateStatus,
  isValidCalendarDate,
  isValidCatalogValue,
  isValidEmail,
  normalizeCode,
  normalizeText,
  todayLocal,
  validateClient
} from '../../src/crm-rules.js';
import { normalizeConfig, setActiveConfig, userConfig, DEFAULT_CONFIG } from '../../src/module-config.js';

const crm = normalizeConfig(userConfig).config;

beforeEach(() => {
  setActiveConfig(crm);
});

const validClient = {
  name: 'Empresa Demo 1',
  code: 'CLI-DEMO-003',
  category: 'Prospecto',
  accountOwner: 'Ejecutivo A',
  acquisitionSource: 'Referido',
  email: 'contacto1@example.com',
  phone: '+56 9 0000 0000',
  targetDate: '2026-11-30'
};

describe('normalización y validaciones unitarias', () => {
  it('normalizes codes with trim and uppercase', () => {
    expect(normalizeCode('  cli-001 ')).toBe('CLI-001');
    expect(normalizeCode(undefined)).toBe('');
  });

  it('normalizes text without accents or case', () => {
    expect(normalizeText('  Compresor Industrial ')).toBe('compresor industrial');
    expect(normalizeText('Ñandú Educación')).toBe('nandu educacion');
  });

  it('validates emails only when a value is provided', () => {
    expect(isValidEmail('')).toBe(true);
    expect(isValidEmail(undefined)).toBe(true);
    expect(isValidEmail('contacto1@example.com')).toBe(true);
    expect(isValidEmail('no-es-correo')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('checks catalog values', () => {
    expect(isValidCatalogValue('Prospecto', crm.catalogs.category)).toBe(true);
    expect(isValidCatalogValue('Prospecto ', crm.catalogs.category)).toBe(true);
    expect(isValidCatalogValue('Socio', crm.catalogs.category)).toBe(false);
    expect(isValidCatalogValue('Prospecto', undefined)).toBe(false);
  });

  it('rejects impossible calendar dates without shifting time zones', () => {
    expect(isValidCalendarDate('2026-04-30')).toBe(true);
    expect(isValidCalendarDate('2024-02-29')).toBe(true);
    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('2026-04-31')).toBe(false);
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('2026-1-1')).toBe(false);
    expect(isValidCalendarDate('')).toBe(false);
  });

  it('compares calendar date strings directly', () => {
    expect(compareCalendarDates('2026-11-02', '2026-11-30')).toBe(-1);
    expect(compareCalendarDates('2026-11-30', '2026-11-30')).toBe(0);
    expect(compareCalendarDates('2026-12-01', '2026-11-30')).toBe(1);
  });

  it('builds the local day without converting to UTC', () => {
    expect(todayLocal(new Date(2026, 10, 15, 23, 59, 59))).toBe('2026-11-15');
    expect(todayLocal(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    expect(todayLocal(new Date(2026, 11, 31, 12, 0, 0))).toBe('2026-12-31');
  });

  it('classifies the next contact date against the local day', () => {
    const today = '2026-11-15';
    expect(getTargetDateStatus('', today)).toBe('Sin programar');
    expect(getTargetDateStatus(undefined, today)).toBe('Sin programar');
    expect(getTargetDateStatus('2026-11-14', today)).toBe('Vencido');
    expect(getTargetDateStatus('2026-11-15', today)).toBe('Para hoy');
    expect(getTargetDateStatus('2026-11-16', today)).toBe('Programado');
    expect(getTargetDateStatus('2026-02-31', today)).toBe('Sin programar');
  });
});

describe('validateClient', () => {
  it('accepts a complete CRM client', () => {
    const result = validateClient(validClient, { entities: [] });
    expect(result.errors).toEqual({});
    expect(result.valid).toBe(true);
  });

  it('accepts a client without the optional main contact', () => {
    const result = validateClient(
      { ...validClient, email: '', phone: '', contactName: '', description: '', targetDate: '' },
      { entities: [] }
    );
    expect(result.valid).toBe(true);
    expect(result.errors.email).toBeUndefined();
  });

  it('rejects required fields filled only with spaces', () => {
    const result = validateClient(
      { name: '   ', code: '  ', category: ' ', accountOwner: '', acquisitionSource: '' },
      { entities: [] }
    );
    expect(result.valid).toBe(false);
    for (const key of ['name', 'code', 'category', 'accountOwner', 'acquisitionSource']) {
      expect(result.errors[key]).toBeTruthy();
    }
  });

  it('rejects a duplicated code ignoring spaces and case', () => {
    const entities = [{ id: 'ent_1', entity_id: 'cli_1', name: 'Otra', code: 'CLI-001' }];
    const result = validateClient({ ...validClient, code: '  cli-001 ' }, { entities });
    expect(result.valid).toBe(false);
    expect(result.errors.code).toMatch(/ya existe|duplicado/i);
  });

  it('excludes the current record when checking code uniqueness', () => {
    const entities = [{ id: 'ent_1', entity_id: 'cli_1', name: 'Actual', code: 'CLI-DEMO-003' }];
    const result = validateClient(validClient, { entities, currentId: 'ent_1' });
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = validateClient({ ...validClient, email: 'no-es-correo' }, { entities: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toMatch(/correo/i);
  });

  it('rejects values outside the configured catalogs', () => {
    const result = validateClient(
      { ...validClient, category: 'Socio', accountOwner: 'Ejecutivo Z', acquisitionSource: 'Radio' },
      { entities: [] }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
    expect(result.errors.accountOwner).toBeTruthy();
    expect(result.errors.acquisitionSource).toBeTruthy();
  });

  it('rejects impossible target dates', () => {
    const result = validateClient({ ...validClient, targetDate: '2026-02-31' }, { entities: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.targetDate).toBeTruthy();
  });

  it('keeps the generic fallback working without catalogs', () => {
    setActiveConfig(DEFAULT_CONFIG);
    const result = validateClient(
      { name: 'Acme', code: 'AC-1', category: 'partner', accountOwner: 'X', acquisitionSource: 'Y' },
      { entities: [] }
    );
    expect(result.valid).toBe(true);
  });
});
