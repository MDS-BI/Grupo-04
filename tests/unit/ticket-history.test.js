import { describe, it, expect } from 'vitest';
import { appendTicketHistory } from '../../src/crm-rules.js';

const NOW = '2026-11-28T12:00:00.000Z';

function ticket(overrides = {}) {
  return {
    id: 'tkt_1',
    assignee: 'Técnico A',
    history: [],
    ...overrides
  };
}

describe('US-30 — historial embebido append-only', () => {
  it('genera id estable por posición y la fecha del sistema', () => {
    const first = appendTicketHistory(ticket(), { type: 'creacion', note: 'TKT-2026-0001' }, NOW);
    expect(first.history).toHaveLength(1);
    expect(first.history[0].id).toBe('tkt_1:1');
    expect(first.history[0].at).toBe(NOW);
    expect(first.history[0].type).toBe('creacion');
    expect(first.history[0].note).toBe('TKT-2026-0001');

    const second = appendTicketHistory(
      first,
      { type: 'estado', field: 'status', from: 'Nuevo', to: 'En proceso' },
      NOW
    );
    expect(second.history).toHaveLength(2);
    expect(second.history[1].id).toBe('tkt_1:2');
    expect(second.history[1].from).toBe('Nuevo');
    expect(second.history[1].to).toBe('En proceso');
  });

  it('no muta el ticket ni el historial original', () => {
    const original = ticket({ history: [{ id: 'tkt_1:1', at: NOW, type: 'creacion', actor: 'Sistema' }] });
    const snapshot = JSON.parse(JSON.stringify(original));
    const next = appendTicketHistory(original, { type: 'prioridad', from: 'Alta', to: 'Baja' }, NOW);
    expect(original).toEqual(snapshot);
    expect(next).not.toBe(original);
    expect(next.history).not.toBe(original.history);
    expect(next.history).toHaveLength(2);
  });

  it('resuelve el actor explícito, luego el técnico vigente y por último Sistema', () => {
    const explicit = appendTicketHistory(
      ticket({ assignee: 'Técnico B' }),
      { type: 'estado', actor: 'Técnico C' },
      NOW
    );
    expect(explicit.history[0].actor).toBe('Técnico C');
    const assigned = appendTicketHistory(ticket({ assignee: 'Técnico B' }), { type: 'estado' }, NOW);
    expect(assigned.history[0].actor).toBe('Técnico B');
    const system = appendTicketHistory(ticket({ assignee: null }), { type: 'estado' }, NOW);
    expect(system.history[0].actor).toBe('Sistema');
  });

  it('conserva el orden de inserción y omite campos vacíos', () => {
    let result = ticket({ history: [] });
    result = appendTicketHistory(result, { type: 'creacion' }, NOW);
    result = appendTicketHistory(result, { type: 'estado', note: '   ' }, NOW);
    result = appendTicketHistory(result, { type: 'cierre' }, NOW);
    expect(result.history.map((event) => event.type)).toEqual(['creacion', 'estado', 'cierre']);
    expect(result.history[1].note).toBeUndefined();
  });

  it('exige un ticket con id y un tipo de evento', () => {
    expect(() => appendTicketHistory({ history: [] }, { type: 'estado' }, NOW)).toThrow(/identificador/i);
    expect(() => appendTicketHistory(ticket(), {}, NOW)).toThrow(/tipo/i);
  });

  it('no permite editar ni eliminar eventos existentes a través del ticket devuelto', () => {
    const first = appendTicketHistory(ticket(), { type: 'creacion' }, NOW);
    const second = appendTicketHistory(first, { type: 'estado' }, NOW);
    expect(second.history.slice(0, first.history.length)).toEqual(first.history);
    expect(second.history[0]).toEqual(first.history[0]);
  });
});
