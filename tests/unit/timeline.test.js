import { describe, it, expect } from 'vitest';
import { buildTimeline } from '../../src/crm-timeline.js';

const activities = [
  {
    id: 'act_1',
    entity_id: 'cli_1',
    documentId: 'doc_1',
    type: 'llamada',
    subject: 'Llamada inicial',
    dueDate: '2026-11-20',
    owner: 'Ejecutivo A',
    status: 'completada'
  },
  {
    id: 'act_2',
    entity_id: 'cli_1',
    type: 'nota',
    subject: 'Nota reciente',
    dueDate: '2026-11-27',
    owner: 'Ejecutivo B',
    status: 'pendiente'
  },
  {
    id: 'act_3',
    entity_id: 'cli_2',
    type: 'correo',
    subject: 'Otro cliente',
    dueDate: '2026-11-28',
    owner: 'Ejecutivo A',
    status: 'pendiente'
  },
  { id: 'act_4', entity_id: 'cli_1', type: 'nota', subject: 'Fecha inválida', dueDate: '2026-13-40' }
];

const tickets = [
  {
    id: 'tkt_1',
    entity_id: 'cli_1',
    reason: 'soporte',
    description: 'Falla',
    resolutionSummary: 'Se reemplazó el filtro',
    status: 'Resuelto',
    createdAt: '2026-11-10T10:00:00.000Z',
    resolvedAt: '2026-11-22T10:00:00.000Z'
  }
];

describe('US14 — timeline', () => {
  it('une actividades y tickets del cliente en orden descendente', () => {
    const events = buildTimeline({ activities, tickets, entityId: 'cli_1' });
    expect(events.map((event) => event.id)).toEqual(['activity:act_2', 'ticket:tkt_1', 'activity:act_1']);
    expect(events.map((event) => event.kind)).toEqual(['activity', 'ticket', 'activity']);
  });

  it('filtra por tipo y por rango de fechas', () => {
    expect(buildTimeline({ activities, tickets, entityId: 'cli_1' }, { type: 'nota' })).toHaveLength(1);
    expect(buildTimeline({ activities, tickets, entityId: 'cli_1' }, { kind: 'ticket' })).toHaveLength(1);
    const ranged = buildTimeline({ activities, tickets, entityId: 'cli_1' }, { from: '2026-11-20', to: '2026-11-23' });
    expect(ranged.map((event) => event.id)).toEqual(['ticket:tkt_1', 'activity:act_1']);
  });

  it('en una oportunidad muestra solo sus actividades, sin eventos de sistema', () => {
    const events = buildTimeline({ activities, tickets, documentId: 'doc_1' });
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('activity:act_1');
    expect(events.every((event) => event.kind === 'activity')).toBe(true);
  });

  it('excluye fechas inválidas', () => {
    const events = buildTimeline({ activities, tickets, entityId: 'cli_1' });
    expect(events.some((event) => event.recordId === 'act_4')).toBe(false);
  });
});
