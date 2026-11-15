import { describe, it, expect, beforeEach } from 'vitest';
import { isFolioUnique, validateAmount, validateOpportunity, validateOpportunityDates } from '../../src/crm-rules.js';
import { normalizeConfig, setActiveConfig, userConfig } from '../../src/module-config.js';

const crm = normalizeConfig(userConfig).config;

beforeEach(() => {
  setActiveConfig(crm);
});

const entities = [
  { id: 'ent_1', entity_id: 'cli_1', name: 'Empresa Demo 1', code: 'CLI-DEMO-003', category: 'Prospecto' }
];

const validOpportunity = {
  entityId: 'cli_1',
  series: 'OPP',
  folio: 3001,
  opportunityTitle: 'Adquisición de compresor industrial para planta de producción',
  startDate: '2026-11-02',
  endDate: '2026-11-30',
  totalAmount: 8500000,
  currency: 'CLP',
  status: 'Nueva',
  opportunityOwner: 'Ejecutivo A',
  notes: 'Pendiente precisar características técnicas.'
};

const documents = [
  { id: 'doc_1', entity_id: 'cli_1', series: 'OPP', folio: 3001 },
  { id: 'doc_2', entity_id: 'cli_1', series: 'FAC', folio: 3001 }
];

describe('validateAmount', () => {
  it('accepts finite non-negative integers, including zero', () => {
    expect(validateAmount(0).valid).toBe(true);
    expect(validateAmount(8500000).valid).toBe(true);
    expect(validateAmount('1200').valid).toBe(true);
  });

  it('rejects empty, negative, decimal and non-finite amounts', () => {
    for (const value of [undefined, null, '', '   ', -1, 10.5, 'abc', Infinity, NaN]) {
      const result = validateAmount(value);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/monto|entero/i);
    }
  });
});

describe('validateOpportunityDates', () => {
  it('accepts real dates where the close is equal or later, even if already expired', () => {
    expect(validateOpportunityDates('2026-11-02', '2026-11-30').valid).toBe(true);
    expect(validateOpportunityDates('2026-11-02', '2026-11-02').valid).toBe(true);
    expect(validateOpportunityDates('2020-01-01', '2020-01-02').valid).toBe(true);
  });

  it('rejects impossible dates and inverted ranges', () => {
    const impossible = validateOpportunityDates('2026-02-30', '2026-03-01');
    expect(impossible.valid).toBe(false);
    expect(impossible.errors.startDate).toBeTruthy();
    const inverted = validateOpportunityDates('2026-11-30', '2026-11-02');
    expect(inverted.valid).toBe(false);
    expect(inverted.errors.endDate).toMatch(/posterior|igual/i);
  });
});

describe('isFolioUnique', () => {
  it('compares the series and folio pair globally', () => {
    expect(isFolioUnique('OPP', 3001, documents)).toBe(false);
    expect(isFolioUnique('OPP', 3002, documents)).toBe(true);
    expect(isFolioUnique('FAC', 3001, documents)).toBe(false);
    expect(isFolioUnique('OPP', '3001', documents)).toBe(false);
  });

  it('excludes the current record when editing', () => {
    expect(isFolioUnique('OPP', 3001, documents, 'doc_1')).toBe(true);
    expect(isFolioUnique('OPP', 3002, documents, 'doc_1')).toBe(true);
  });
});

describe('validateOpportunity', () => {
  it('accepts a complete opportunity in the initial Nueva stage', () => {
    const result = validateOpportunity(validOpportunity, { entities, documents: [] });
    expect(result.errors).toEqual({});
    expect(result.valid).toBe(true);
  });

  it('accepts a zero amount', () => {
    const result = validateOpportunity({ ...validOpportunity, totalAmount: 0 }, { entities, documents: [] });
    expect(result.valid).toBe(true);
  });

  it('requires an existing client and never reassigns it', () => {
    expect(
      validateOpportunity({ ...validOpportunity, entityId: 'missing' }, { entities, documents: [] }).errors.entityId
    ).toBeTruthy();
    expect(
      validateOpportunity({ ...validOpportunity, entityId: '' }, { entities, documents: [] }).errors.entityId
    ).toBeTruthy();
    const withKey = { ...validOpportunity, entityId: undefined, entity_id: 'cli_1' };
    expect(validateOpportunity(withKey, { entities, documents: [] }).valid).toBe(true);
  });

  it('requires a non-blank title, a positive integer folio, dates and a catalog owner', () => {
    const result = validateOpportunity(
      {
        ...validOpportunity,
        opportunityTitle: '   ',
        folio: 0,
        startDate: '',
        endDate: '',
        opportunityOwner: 'Ejecutivo Z'
      },
      { entities, documents: [] }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.opportunityTitle).toBeTruthy();
    expect(result.errors.folio).toBeTruthy();
    expect(result.errors.startDate).toBeTruthy();
    expect(result.errors.endDate).toBeTruthy();
    expect(result.errors.opportunityOwner).toBeTruthy();
  });

  it('rejects an invalid amount and inverted dates', () => {
    const result = validateOpportunity(
      { ...validOpportunity, totalAmount: 10.5, startDate: '2026-11-30', endDate: '2026-11-02' },
      { entities, documents: [] }
    );
    expect(result.errors.totalAmount).toBeTruthy();
    expect(result.errors.endDate).toBeTruthy();
  });

  it('rejects a duplicated series and folio, excluding the current record', () => {
    expect(validateOpportunity(validOpportunity, { entities, documents }).errors.folio).toMatch(/existe|folio/i);
    const editingSame = validateOpportunity(validOpportunity, {
      entities,
      documents,
      currentId: 'doc_1',
      mode: 'update'
    });
    expect(editingSame.valid).toBe(true);
  });

  it('rejects an initial stage different from Nueva when creating', () => {
    for (const status of ['Ganada', 'Perdida', 'Contactada']) {
      const result = validateOpportunity({ ...validOpportunity, status }, { entities, documents: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.status).toBeTruthy();
    }
  });

  it('allows keeping another stage when editing and requires a loss reason for Perdida', () => {
    const won = validateOpportunity(
      { ...validOpportunity, status: 'Ganada' },
      { entities, documents: [], currentId: 'doc_9', mode: 'update' }
    );
    expect(won.valid).toBe(true);

    const lost = validateOpportunity(
      { ...validOpportunity, status: 'Perdida', lossReason: '' },
      { entities, documents: [], currentId: 'doc_9', mode: 'update' }
    );
    expect(lost.valid).toBe(false);
    expect(lost.errors.lossReason).toBeTruthy();

    const lostWithReason = validateOpportunity(
      { ...validOpportunity, status: 'Perdida', lossReason: 'Precio fuera de rango' },
      { entities, documents: [], currentId: 'doc_9', mode: 'update' }
    );
    expect(lostWithReason.valid).toBe(true);
  });
});
