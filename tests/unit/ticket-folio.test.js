import { describe, it, expect } from 'vitest';
import { formatTicketFolio, nextTicketFolio, TICKET_FOLIO_PATTERN } from '../../src/crm-rules.js';

function iso(year, month, day, hours = 12) {
  return new Date(year, month - 1, day, hours, 0, 0).toISOString();
}

describe('US-26 — folio determinista TKT-AAAA-####', () => {
  it('formatea con año de cuatro dígitos y correlativo con ceros a la izquierda', () => {
    expect(formatTicketFolio(2026, 1)).toBe('TKT-2026-0001');
    expect(formatTicketFolio(2026, 42)).toBe('TKT-2026-0042');
    expect(formatTicketFolio(2026, 9999)).toBe('TKT-2026-9999');
    expect(TICKET_FOLIO_PATTERN.test(formatTicketFolio(2026, 7))).toBe(true);
  });

  it('usa el año local de createdAt para el primer folio', () => {
    expect(nextTicketFolio([], iso(2026, 5, 10))).toBe('TKT-2026-0001');
    expect(nextTicketFolio([], iso(2025, 12, 31))).toBe('TKT-2025-0001');
  });

  it('toma el máximo correlativo del año, no el conteo', () => {
    const tickets = [
      { id: 'a', folio: 'TKT-2026-0003' },
      { id: 'b', folio: 'TKT-2026-0007' },
      { id: 'c', folio: 'TKT-2025-0099' }
    ];
    expect(nextTicketFolio(tickets, iso(2026, 6, 1))).toBe('TKT-2026-0008');
    expect(nextTicketFolio(tickets, iso(2025, 6, 1))).toBe('TKT-2025-0100');
  });

  it('no recicla huecos dejados por tickets eliminados', () => {
    const tickets = [
      { id: 'a', folio: 'TKT-2026-0001' },
      { id: 'c', folio: 'TKT-2026-0003' }
    ];
    expect(nextTicketFolio(tickets, iso(2026, 3, 3))).toBe('TKT-2026-0004');
  });

  it('reinicia el correlativo al cambiar de año', () => {
    const tickets = [{ id: 'a', folio: 'TKT-2025-0042' }];
    expect(nextTicketFolio(tickets, iso(2026, 1, 2))).toBe('TKT-2026-0001');
  });

  it('genera folios únicos en toda la colección', () => {
    const tickets = [];
    const created = [];
    for (let index = 0; index < 20; index += 1) {
      const folio = nextTicketFolio(tickets, iso(2026, 1, 1));
      expect(tickets.some((ticket) => ticket.folio === folio)).toBe(false);
      created.push(folio);
      tickets.push({ id: `t${index}`, folio });
    }
    expect(new Set(created).size).toBe(20);
  });

  it('rechaza el alta al superar 9999 folios en el año', () => {
    expect(() => nextTicketFolio([{ id: 'a', folio: 'TKT-2026-9999' }], iso(2026, 4, 4))).toThrow(/9999/);
  });

  it('rechaza una fecha de creación inválida', () => {
    expect(() => nextTicketFolio([], 'no-es-fecha')).toThrow(/fecha/i);
    expect(() => formatTicketFolio(2026, 0)).toThrow();
  });
});
