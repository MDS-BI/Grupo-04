import { describe, it, expect, beforeEach } from 'vitest';
import { resolveTicket, validateTicket, canTransitionTicket } from '../../src/crm-rules.js';
import {
  addEntity,
  addTicket,
  updateTicket,
  resolveTicket as resolveTicketStorage,
  loadTickets
} from '../../src/storage.js';
import { setActiveConfig } from '../../src/module-config.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function seedTicket(overrides = {}) {
  const entity = addEntity({ name: 'Empresa Demo', code: `CLI-${Math.random().toString(36).slice(2, 7)}` });
  return addTicket({
    entityId: entity.entity_id,
    subject: 'Falla en el arranque',
    productName: 'Compresor industrial',
    reason: 'soporte',
    description: 'Falla en el arranque',
    priority: 'Alta',
    channel: 'Teléfono',
    ...overrides
  });
}

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
});

describe('US11 — resolución de tickets', () => {
  it('exige resumen no vacío y genera resolvedAt sin aceptar reapertura', () => {
    const ticket = { id: 'tkt_1', status: 'En proceso' };
    expect(() => resolveTicket(ticket, '   ')).toThrow(/resumen/i);
    const resolved = resolveTicket(ticket, ' Se reemplazó el filtro ', '2026-11-28T10:00:00.000Z');
    expect(resolved.status).toBe('Resuelto');
    expect(resolved.resolutionSummary).toBe('Se reemplazó el filtro');
    expect(resolved.resolvedAt).toBe('2026-11-28T10:00:00.000Z');
    expect(() => resolveTicket(resolved, 'Otra')).toThrow(/ya está resuelto/i);
    expect(canTransitionTicket('Resuelto', 'En proceso')).toBe(false);
  });

  it('guarda reference del equipo recortada y admite su ausencia', () => {
    const withReference = seedTicket({ equipmentReference: '  EQ-001  ' });
    expect(withReference.equipmentReference).toBe('EQ-001');
    expect(withReference.folio).toMatch(/^TKT-\d{4}-\d{4}$/);
    const withoutReference = seedTicket({});
    expect(withoutReference.equipmentReference).toBeNull();

    const entities = [{ id: 'ent_1', entity_id: withReference.entity_id, name: 'A', code: 'A-1' }];
    expect(
      validateTicket(
        {
          entityId: withReference.entity_id,
          subject: 'Falla',
          productName: 'Compresor',
          reason: 'soporte',
          description: 'Falla',
          priority: 'Alta',
          channel: 'Teléfono',
          status: 'En proceso'
        },
        { entities, mode: 'update' }
      ).valid
    ).toBe(true);
  });

  it('resuelve en una sola operación y conserva la resolución al editar', () => {
    const ticket = seedTicket();
    expect(ticket.status).toBe('Nuevo');
    const inProgress = updateTicket(ticket.id, { status: 'En proceso' });
    expect(inProgress.status).toBe('En proceso');
    expect(inProgress.firstResponseAt).toBeTruthy();

    const resolved = resolveTicketStorage(ticket.id, 'Se reemplazó el filtro');
    expect(resolved.status).toBe('Resuelto');
    expect(resolved.resolutionSummary).toBe('Se reemplazó el filtro');
    expect(resolved.resolvedAt).toBeTruthy();

    const edited = updateTicket(ticket.id, { description: 'Se limpió el filtro' });
    expect(edited.status).toBe('Resuelto');
    expect(edited.resolutionSummary).toBe('Se reemplazó el filtro');
    expect(edited.resolvedAt).toBe(resolved.resolvedAt);
    expect(edited.description).toBe('Se limpió el filtro');
    expect(() => updateTicket(ticket.id, { priority: 'Media' })).toThrow(/congelada/i);
  });

  it('no resuelve sin resumen y conserva el ticket en proceso', () => {
    const ticket = seedTicket();
    updateTicket(ticket.id, { status: 'En proceso' });
    expect(() => resolveTicketStorage(ticket.id, '  ')).toThrow(/resumen/i);
    expect(loadTickets()[0].status).toBe('En proceso');
  });

  it('conserva el texto de la solución como dato, sin interpretarlo', () => {
    const ticket = seedTicket();
    updateTicket(ticket.id, { status: 'En proceso' });
    const resolved = resolveTicketStorage(ticket.id, '<img src=x onerror=alert(1)>');
    expect(resolved.resolutionSummary).toBe('<img src=x onerror=alert(1)>');
  });
});
