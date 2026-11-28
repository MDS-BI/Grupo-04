import { describe, it, expect } from 'vitest';
import {
  countOpenTickets,
  countOverdueTickets,
  ticketPriorityDistribution,
  averageResolutionHours,
  slaCompliance,
  averageSatisfaction,
  formatOneDecimal
} from '../../src/crm-metrics.js';

const NOW = new Date('2026-11-28T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function ago(hours) {
  return new Date(NOW.getTime() - hours * HOUR).toISOString();
}

const controlSample = [
  { id: 'A', priority: 'Alta', status: 'Nuevo', createdAt: ago(2) },
  { id: 'B', priority: 'Media', status: 'En proceso', createdAt: ago(60) },
  { id: 'C', priority: 'Alta', status: 'En espera', createdAt: ago(30) },
  { id: 'D', priority: 'Baja', status: 'Resuelto', createdAt: ago(200), resolvedAt: ago(100), satisfactionScore: 5 },
  { id: 'E', priority: 'Media', status: 'Resuelto', createdAt: ago(100), resolvedAt: ago(10), satisfactionScore: 3 },
  {
    id: 'F',
    priority: 'Baja',
    status: 'Cerrado',
    createdAt: ago(300),
    resolvedAt: ago(250),
    closedAt: ago(240),
    satisfactionScore: 4
  }
];

describe('US-31/US-32 — indicadores de soporte y CSAT', () => {
  it('cuenta abiertos y vencidos excluyendo Resuelto y Cerrado', () => {
    expect(countOpenTickets(controlSample)).toBe(3);
    expect(countOpenTickets([])).toBe(0);
    expect(countOpenTickets(null)).toBe(0);
    expect(countOverdueTickets(controlSample, NOW)).toBe(1);
    expect(countOverdueTickets([], NOW)).toBe(0);
  });

  it('distribuye los abiertos por prioridad con los ceros visibles', () => {
    expect(ticketPriorityDistribution(controlSample)).toEqual([
      { priority: 'Alta', count: 2 },
      { priority: 'Media', count: 1 },
      { priority: 'Baja', count: 0 }
    ]);
    expect(ticketPriorityDistribution([])).toEqual([
      { priority: 'Alta', count: 0 },
      { priority: 'Media', count: 0 },
      { priority: 'Baja', count: 0 }
    ]);
  });

  it('calcula el tiempo medio de resolución en horas con una decimal', () => {
    expect(averageResolutionHours(controlSample)).toBe(80);
    expect(averageResolutionHours([])).toBeNull();
    expect(averageResolutionHours([{ status: 'Resuelto', createdAt: 'malo', resolvedAt: 'malo' }])).toBeNull();
  });

  it('calcula el cumplimiento de SLA sobre los resueltos con objetivo', () => {
    expect(slaCompliance(controlSample)).toBe(66.7);
    expect(slaCompliance([])).toBeNull();
    expect(slaCompliance([{ status: 'Resuelto', priority: 'Alta', createdAt: ago(10), resolvedAt: ago(5) }])).toBe(100);
    expect(slaCompliance([{ status: 'Resuelto', priority: 'Alta', createdAt: ago(30), resolvedAt: ago(1) }])).toBe(0);
  });

  it('promedia solo satisfacciones válidas de 1 a 5', () => {
    expect(averageSatisfaction(controlSample)).toBe(4);
    expect(
      averageSatisfaction([{ satisfactionScore: 0 }, { satisfactionScore: 6 }, { satisfactionScore: 2.5 }])
    ).toBeNull();
    expect(averageSatisfaction([{ satisfactionScore: 5 }, { satisfactionScore: '4' }])).toBe(5);
    expect(averageSatisfaction([])).toBeNull();
  });

  it('formatea una cifra decimal y usa “Sin datos” para null', () => {
    expect(formatOneDecimal(80)).toBe('80.0');
    expect(formatOneDecimal(66.7)).toBe('66.7');
    expect(formatOneDecimal(4)).toBe('4.0');
    expect(formatOneDecimal(null)).toBe('Sin datos');
    expect(formatOneDecimal(undefined)).toBe('Sin datos');
  });
});
