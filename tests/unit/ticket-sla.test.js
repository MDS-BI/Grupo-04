import { describe, it, expect } from 'vitest';
import { SLA_HOURS_BY_PRIORITY, computeSlaDueAt, getSlaStatus } from '../../src/crm-rules.js';

const NOW = new Date('2026-11-28T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function createdAtFor(priority, now = NOW) {
  return new Date(now.getTime() - SLA_HOURS_BY_PRIORITY[priority] * HOUR).toISOString();
}

function ticket(overrides = {}) {
  return {
    id: 'tkt_1',
    status: 'En proceso',
    priority: 'Alta',
    createdAt: new Date(NOW.getTime() - 2 * HOUR).toISOString(),
    ...overrides
  };
}

describe('US-29 — SLA derivado por prioridad', () => {
  it('declara los objetivos 24, 72 y 168 horas', () => {
    expect(SLA_HOURS_BY_PRIORITY).toEqual({ Alta: 24, Media: 72, Baja: 168 });
  });

  it('calcula el vencimiento desde createdAt y la prioridad', () => {
    const start = '2026-11-28T10:00:00.000Z';
    expect(computeSlaDueAt(start, 'Alta')).toBe('2026-11-29T10:00:00.000Z');
    expect(computeSlaDueAt(start, 'Media')).toBe('2026-12-01T10:00:00.000Z');
    expect(computeSlaDueAt(start, 'Baja')).toBe('2026-12-05T10:00:00.000Z');
    expect(computeSlaDueAt('no-es-fecha', 'Alta')).toBeNull();
    expect(computeSlaDueAt(start, 'Urgente')).toBeNull();
  });

  it('marca En plazo, Por vencer y Vencido con el umbral del 25 %', () => {
    expect(getSlaStatus(ticket({ createdAt: new Date(NOW.getTime() - 2 * HOUR).toISOString() }), NOW)).toBe('En plazo');
    expect(getSlaStatus(ticket({ createdAt: createdAtFor('Alta') }), NOW)).toBe('Vencido');
    // Exactamente 25 % restante (6 h de 24 h) → Por vencer.
    const dueSoon = new Date(NOW.getTime() - (24 - 6) * HOUR).toISOString();
    expect(getSlaStatus(ticket({ createdAt: dueSoon }), NOW)).toBe('Por vencer');
    // Un milisegundo más de holgura que el umbral → En plazo.
    const onTime = new Date(NOW.getTime() - (24 - 6) * HOUR + 1).toISOString();
    expect(getSlaStatus(ticket({ createdAt: onTime }), NOW)).toBe('En plazo');
    // now === slaDueAt → Vencido.
    expect(getSlaStatus(ticket({ createdAt: createdAtFor('Alta') }), NOW)).toBe('Vencido');
  });

  it('aplica el umbral de 25 % a Media y Baja', () => {
    const media = new Date(NOW.getTime() - (72 - 18) * HOUR).toISOString();
    const baja = new Date(NOW.getTime() - (168 - 42) * HOUR).toISOString();
    expect(getSlaStatus(ticket({ priority: 'Media', createdAt: media }), NOW)).toBe('Por vencer');
    expect(getSlaStatus(ticket({ priority: 'Baja', createdAt: baja }), NOW)).toBe('Por vencer');
  });

  it('recalcula al cambiar la prioridad sin reiniciar el reloj', () => {
    const createdAt = new Date(NOW.getTime() - 30 * HOUR).toISOString();
    expect(getSlaStatus(ticket({ priority: 'Alta', createdAt }), NOW)).toBe('Vencido');
    expect(getSlaStatus(ticket({ priority: 'Media', createdAt }), NOW)).toBe('En plazo');
    expect(getSlaStatus(ticket({ priority: 'Baja', createdAt }), NOW)).toBe('En plazo');
  });

  it('congela el resultado de Resuelto y Cerrado con resolvedAt', () => {
    const createdAt = '2026-11-20T12:00:00.000Z';
    const beforeDue = '2026-11-21T10:00:00.000Z';
    const afterDue = '2026-11-22T12:00:00.000Z';
    expect(getSlaStatus(ticket({ status: 'Resuelto', createdAt, resolvedAt: beforeDue }), NOW)).toBe('En plazo');
    expect(getSlaStatus(ticket({ status: 'Cerrado', createdAt, resolvedAt: afterDue }), NOW)).toBe('Vencido');
    expect(getSlaStatus(ticket({ status: 'Resuelto', createdAt, resolvedAt: null }), NOW)).toBe('Sin datos');
  });

  it('devuelve Sin datos sin fecha o prioridad verificables', () => {
    expect(getSlaStatus(ticket({ createdAt: null }), NOW)).toBe('Sin datos');
    expect(getSlaStatus(ticket({ priority: 'Urgente' }), NOW)).toBe('Sin datos');
    expect(getSlaStatus(null, NOW)).toBe('Sin datos');
  });
});
