import { describe, it, expect } from 'vitest';
import {
  countClients,
  countOpenOpportunities,
  sumOpenAmount,
  overdueFollowUps,
  todayContacts,
  closeRate,
  formatCloseRate
} from '../../src/crm-metrics.js';

const TODAY = '2026-11-15';
const YESTERDAY = '2026-11-14';
const TOMORROW = '2026-11-16';

const entities = [
  { entity_id: 'cli_001', category: 'Activo', targetDate: YESTERDAY },
  { entity_id: 'cli_002', category: 'Activo', targetDate: TODAY },
  { entity_id: 'cli_003', category: 'Inactivo', targetDate: YESTERDAY },
  { entity_id: 'cli_004', category: 'Prospecto', targetDate: TOMORROW },
  { entity_id: 'cli_005', category: 'Prospecto' }
];

const documents = [
  { status: 'Negociación', totalAmount: 100000, currency: 'CLP' },
  { status: 'Propuesta', totalAmount: 200000, currency: 'CLP' },
  { status: 'Ganada', totalAmount: 50000, currency: 'CLP' },
  { status: 'Perdida', totalAmount: 75000, currency: 'CLP' }
];

describe('countClients', () => {
  it('counts every client, including prospects and inactive ones', () => {
    expect(countClients(entities)).toBe(5);
    expect(countClients([])).toBe(0);
  });
});

describe('countOpenOpportunities', () => {
  it('counts only Nueva, Contactada, Propuesta and Negociación', () => {
    expect(countOpenOpportunities(documents)).toBe(2);
    expect(
      countOpenOpportunities([
        { status: 'Nueva' },
        { status: 'Contactada' },
        { status: 'Propuesta' },
        { status: 'Negociación' },
        { status: 'Ganada' },
        { status: 'Perdida' }
      ])
    ).toBe(4);
  });

  it('returns zero without opportunities', () => {
    expect(countOpenOpportunities([])).toBe(0);
  });
});

describe('sumOpenAmount', () => {
  it('sums the amount of open opportunities without weighting', () => {
    expect(sumOpenAmount(documents)).toBe(300000);
  });

  it('ignores closed opportunities and invalid amounts', () => {
    expect(
      sumOpenAmount([
        { status: 'Ganada', totalAmount: 999 },
        { status: 'Nueva', totalAmount: 10 }
      ])
    ).toBe(10);
    expect(sumOpenAmount([{ status: 'Nueva', totalAmount: 'no-numérico' }])).toBe(0);
    expect(sumOpenAmount([])).toBe(0);
  });
});

describe('overdueFollowUps', () => {
  it('counts clients with a target date before the local today, excluding Inactivo', () => {
    expect(overdueFollowUps(entities, TODAY)).toBe(1);
  });

  it('does not double count clients and ignores blank or invalid dates', () => {
    const repeated = [
      { entity_id: 'cli_001', category: 'Activo', targetDate: YESTERDAY },
      { entity_id: 'cli_001', category: 'Activo', targetDate: YESTERDAY },
      { entity_id: 'cli_002', category: 'Activo', targetDate: '' }
    ];
    expect(overdueFollowUps(repeated, TODAY)).toBe(1);
  });

  it('excludes inactive clients even when their date is overdue', () => {
    expect(overdueFollowUps([{ category: 'Inactivo', targetDate: YESTERDAY }], TODAY)).toBe(0);
  });
});

describe('todayContacts', () => {
  it('counts clients whose next contact is the local today, excluding Inactivo', () => {
    expect(todayContacts(entities, TODAY)).toBe(1);
    expect(todayContacts([{ category: 'Inactivo', targetDate: TODAY }], TODAY)).toBe(0);
  });

  it('returns zero when no client is scheduled for today', () => {
    expect(todayContacts([{ category: 'Activo', targetDate: YESTERDAY }], TODAY)).toBe(0);
  });
});

describe('closeRate', () => {
  it('calculates won / (won + lost) as a percentage', () => {
    expect(closeRate(documents)).toBe(50);
  });

  it('returns Sin datos when the denominator is zero', () => {
    expect(closeRate([])).toBeNull();
    expect(closeRate([{ status: 'Nueva' }, { status: 'Negociación' }])).toBeNull();
    expect(formatCloseRate(null)).toBe('Sin datos');
  });

  it('formats the percentage for the panel', () => {
    expect(formatCloseRate(50)).toBe('50%');
    expect(formatCloseRate(0)).toBe('0%');
  });
});
