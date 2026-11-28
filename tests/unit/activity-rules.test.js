import { describe, it, expect } from 'vitest';
import { validateActivity, isActivityOverdue, completeActivity, ACTIVITY_TYPES } from '../../src/crm-rules.js';

const entities = [{ id: 'ent_1', entity_id: 'cli_1', name: 'Empresa', code: 'CLI-001' }];
const contacts = [{ id: 'con_1', entity_id: 'cli_1', name: 'Contacto', isPrimary: true }];
const documents = [{ id: 'doc_1', entity_id: 'cli_1', series: 'OPP', folio: 1 }];

const activity = (overrides = {}) => ({
  entityId: 'cli_1',
  type: 'llamada',
  subject: 'Llamar a compras',
  owner: 'Ejecutivo A',
  ...overrides
});

describe('US13 — reglas de actividades', () => {
  it('acepta los cinco tipos declarados y rechaza otros', () => {
    for (const type of ACTIVITY_TYPES) {
      const payload = type === 'tarea' ? activity({ type, dueDate: '2026-11-30' }) : activity({ type });
      expect(validateActivity(payload, { entities }).valid).toBe(true);
    }
    expect(validateActivity(activity({ type: 'visita' }), { entities }).errors.type).toMatch(/tipo/i);
  });

  it('exige vencimiento solo en tareas', () => {
    const task = validateActivity(activity({ type: 'tarea' }), { entities });
    expect(task.valid).toBe(false);
    expect(task.errors.dueDate).toMatch(/vencimiento/i);
    expect(validateActivity(activity({ type: 'nota' }), { entities }).valid).toBe(true);
  });

  it('calcula vencidas con la fecha local y deja de contar al completar', () => {
    const today = '2026-11-28';
    const pending = activity({ type: 'tarea', dueDate: '2026-11-27', status: 'pendiente' });
    expect(isActivityOverdue(pending, today)).toBe(true);
    const completed = completeActivity(pending, '2026-11-28T10:00:00.000Z');
    expect(completed.status).toBe('completada');
    expect(completed.completedAt).toBe('2026-11-28T10:00:00.000Z');
    expect(isActivityOverdue(completed, today)).toBe(false);
  });

  it('valida vínculos opcionales al mismo cliente', () => {
    expect(
      validateActivity(activity({ contactId: 'con_1', documentId: 'doc_1' }), { entities, contacts, documents }).valid
    ).toBe(true);
    const foreign = validateActivity(activity({ contactId: 'con_x' }), { entities, contacts, documents });
    expect(foreign.valid).toBe(false);
    expect(foreign.errors.contactId).toMatch(/mismo cliente/i);
  });

  it('fuerza el estado pendiente al crear', () => {
    expect(validateActivity(activity({ status: 'completada' }), { entities }).errors.status).toMatch(/pendiente/i);
  });
});
