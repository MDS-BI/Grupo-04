import { describe, it, expect } from 'vitest';
import { TICKET_STATUSES, TICKET_TRANSITIONS, canTransitionTicket, nextTicketStatuses } from '../../src/crm-rules.js';

const ALLOWED = new Set([
  'Nuevo|En proceso',
  'En proceso|En espera',
  'En proceso|Resuelto',
  'En espera|En proceso',
  'En espera|Resuelto',
  'Resuelto|Cerrado'
]);

describe('US-28 — máquina de estados del ticket', () => {
  it('declara los cinco estados en orden', () => {
    expect(TICKET_STATUSES).toEqual(['Nuevo', 'En proceso', 'En espera', 'Resuelto', 'Cerrado']);
  });

  it('declara exactamente la tabla de transiciones', () => {
    expect(TICKET_TRANSITIONS).toEqual({
      Nuevo: ['En proceso'],
      'En proceso': ['En espera', 'Resuelto'],
      'En espera': ['En proceso', 'Resuelto'],
      Resuelto: ['Cerrado'],
      Cerrado: []
    });
  });

  it('evalúa las 25 combinaciones sin aceptar saltos ni reaperturas', () => {
    let checked = 0;
    for (const from of TICKET_STATUSES) {
      for (const to of TICKET_STATUSES) {
        checked += 1;
        expect(canTransitionTicket(from, to)).toBe(ALLOWED.has(`${from}|${to}`));
      }
    }
    expect(checked).toBe(25);
  });

  it('rechaza valores vacíos o desconocidos', () => {
    expect(canTransitionTicket('', 'Nuevo')).toBe(false);
    expect(canTransitionTicket('Nuevo', '')).toBe(false);
    expect(canTransitionTicket('Abierto', 'En proceso')).toBe(false);
    expect(canTransitionTicket(null, 'Cerrado')).toBe(false);
  });

  it('expone los estados siguientes y ninguno para Cerrado', () => {
    expect(nextTicketStatuses('Nuevo')).toEqual(['En proceso']);
    expect(nextTicketStatuses('En proceso')).toEqual(['En espera', 'Resuelto']);
    expect(nextTicketStatuses('En espera')).toEqual(['En proceso', 'Resuelto']);
    expect(nextTicketStatuses('Resuelto')).toEqual(['Cerrado']);
    expect(nextTicketStatuses('Cerrado')).toEqual([]);
    expect(nextTicketStatuses('Otro')).toEqual([]);
  });
});
