import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateTicket,
  canTransitionTicket,
  nextTicketStatuses,
  TICKET_STATUSES,
  TICKET_TRANSITIONS
} from '../../src/crm-rules.js';
import { normalizeConfig, setActiveConfig, userConfig } from '../../src/module-config.js';

beforeEach(() => {
  setActiveConfig(normalizeConfig(userConfig).config);
});

const entities = [
  {
    id: 'ent_001',
    entity_id: 'cli_001',
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  },
  {
    id: 'ent_002',
    entity_id: 'cli_002',
    name: 'Empresa Demo 2',
    code: 'CLI-DEMO-004',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  }
];

const contacts = [
  { id: 'con_1', entity_id: 'cli_001', name: 'Ana Pérez', email: 'ana@example.com', isPrimary: true },
  { id: 'con_2', entity_id: 'cli_002', name: 'Otro Cliente', email: 'otro@example.com', isPrimary: true }
];

const documents = [
  { id: 'doc_1', entity_id: 'cli_001', series: 'OPP', folio: 3001 },
  { id: 'doc_2', entity_id: 'cli_002', series: 'OPP', folio: 3002 }
];

function ticket(overrides = {}) {
  return {
    entityId: 'cli_001',
    subject: 'Compresor no arranca',
    productName: 'Compresor industrial',
    reason: 'soporte',
    description: 'Falla en el arranque',
    priority: 'Alta',
    channel: 'Teléfono',
    status: 'Nuevo',
    ...overrides
  };
}

describe('validateTicket', () => {
  it('accepts a complete v4 ticket linked to an existing client', () => {
    const result = validateTicket(ticket(), { entities });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires an existing client', () => {
    expect(validateTicket(ticket({ entityId: '' }), { entities }).valid).toBe(false);
    const unknown = validateTicket(ticket({ entityId: 'cli_inexistente' }), { entities });
    expect(unknown.valid).toBe(false);
    expect(unknown.errors.entityId).toMatch(/cliente/i);
  });

  it('requires a subject of at most 120 characters, trimmed', () => {
    expect(validateTicket(ticket({ subject: '   ' }), { entities }).errors.subject).toMatch(/asunto/i);
    expect(validateTicket(ticket({ subject: 'a'.repeat(121) }), { entities }).errors.subject).toMatch(/120/i);
    expect(validateTicket(ticket({ subject: 'a'.repeat(120) }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ subject: '  Caso válido  ' }), { entities }).valid).toBe(true);
  });

  it('requires a product, accepting productId or productName as fallback', () => {
    const missing = validateTicket(ticket({ productName: '' }), { entities });
    expect(missing.valid).toBe(false);
    expect(missing.errors.productName).toMatch(/producto/i);
    expect(validateTicket(ticket({ productName: '', productId: 'PROD-001' }), { entities }).valid).toBe(true);
  });

  it('accepts only the declared reasons', () => {
    for (const reason of ['soporte', 'reclamo', 'consulta']) {
      expect(validateTicket(ticket({ reason }), { entities }).valid).toBe(true);
    }
    const invalid = validateTicket(ticket({ reason: 'otro' }), { entities });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.reason).toMatch(/motivo/i);
    expect(validateTicket(ticket({ reason: '   ' }), { entities }).valid).toBe(false);
  });

  it('requires a non-blank description', () => {
    const result = validateTicket(ticket({ description: '   ' }), { entities });
    expect(result.valid).toBe(false);
    expect(result.errors.description).toMatch(/descripción/i);
  });

  it('accepts only Alta, Media or Baja as priority', () => {
    for (const priority of ['Alta', 'Media', 'Baja']) {
      expect(validateTicket(ticket({ priority }), { entities }).valid).toBe(true);
    }
    const invalid = validateTicket(ticket({ priority: 'Urgente' }), { entities });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.priority).toMatch(/prioridad/i);
  });

  it('requires a channel on creation and validates the catalog when present', () => {
    const missing = validateTicket(ticket({ channel: '' }), { entities });
    expect(missing.errors.channel).toMatch(/canal/i);
    expect(validateTicket(ticket({ channel: 'Fax' }), { entities }).errors.channel).toMatch(/canal/i);
    expect(validateTicket(ticket({ channel: 'WhatsApp' }), { entities }).valid).toBe(true);
  });

  it('allows a migrated ticket without channel when updating', () => {
    const result = validateTicket(
      ticket({ channel: null, status: 'En proceso', folio: 'TKT-2026-0001', history: [] }),
      { entities, mode: 'update' }
    );
    expect(result.valid).toBe(true);
  });

  it('forces the initial Nuevo status when creating', () => {
    expect(validateTicket(ticket({ status: '' }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ status: 'Nuevo' }), { entities }).valid).toBe(true);
    const resolvedFromStart = validateTicket(ticket({ status: 'Resuelto' }), { entities });
    expect(resolvedFromStart.valid).toBe(false);
    expect(resolvedFromStart.errors.status).toMatch(/Nuevo/i);
    expect(validateTicket(ticket({ status: 'Cerrado' }), { entities }).valid).toBe(false);
  });

  it('validates the status on update against the five declared states', () => {
    expect(validateTicket(ticket({ status: 'En espera' }), { entities, mode: 'update' }).valid).toBe(true);
    expect(validateTicket(ticket({ status: 'Abierto' }), { entities, mode: 'update' }).errors.status).toMatch(
      /estado/i
    );
  });

  it('allows editing descriptive fields of a Resuelto ticket', () => {
    const result = validateTicket(
      ticket({
        status: 'Resuelto',
        resolutionSummary: 'Se reemplazó el filtro',
        resolvedAt: '2026-11-20T10:00:00.000Z',
        subject: 'Se reemplazó el filtro',
        priority: 'Media'
      }),
      { entities, mode: 'update' }
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a resolved ticket without resolution summary', () => {
    const result = validateTicket(ticket({ status: 'Resuelto' }), { entities, mode: 'update' });
    expect(result.valid).toBe(false);
    expect(result.errors.resolutionSummary).toMatch(/resumen/i);
  });

  it('requires the contact and the source document to belong to the same client', () => {
    expect(validateTicket(ticket({ contactId: 'con_1' }), { entities, contacts }).valid).toBe(true);
    expect(validateTicket(ticket({ contactId: 'con_2' }), { entities, contacts }).errors.contactId).toMatch(/cliente/i);
    expect(validateTicket(ticket({ contactId: 'con_x' }), { entities, contacts }).errors.contactId).toMatch(/existe/i);
    expect(validateTicket(ticket({ documentId: 'doc_1' }), { entities, documents }).valid).toBe(true);
    expect(validateTicket(ticket({ documentId: 'doc_2' }), { entities, documents }).errors.documentId).toMatch(
      /cliente/i
    );
  });

  it('validates the requester email when present', () => {
    expect(validateTicket(ticket({ requesterEmail: 'ana@example.com' }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ requesterEmail: 'no-es-correo' }), { entities }).errors.requesterEmail).toMatch(
      /correo/i
    );
  });

  it('validates assignee and team against their catalogs or null', () => {
    expect(validateTicket(ticket({ assignee: 'Técnico A', team: 'Terreno' }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ assignee: null, team: null }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ assignee: 'Técnico Z' }), { entities }).errors.assignee).toMatch(/técnico/i);
    expect(validateTicket(ticket({ team: 'Marketing' }), { entities }).errors.team).toMatch(/equipo/i);
  });

  it('validates the warranty date as a real calendar date', () => {
    expect(validateTicket(ticket({ warrantyEndsAt: '2027-03-31' }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ warrantyEndsAt: '2027-02-30' }), { entities }).errors.warrantyEndsAt).toMatch(
      /garantía/i
    );
  });
});

describe('canTransitionTicket', () => {
  it('declares exactly the five states and the documented transitions', () => {
    expect(TICKET_STATUSES).toEqual(['Nuevo', 'En proceso', 'En espera', 'Resuelto', 'Cerrado']);
    expect(TICKET_TRANSITIONS).toEqual({
      Nuevo: ['En proceso'],
      'En proceso': ['En espera', 'Resuelto'],
      'En espera': ['En proceso', 'Resuelto'],
      Resuelto: ['Cerrado'],
      Cerrado: []
    });
  });

  it('accepts every declared transition', () => {
    expect(canTransitionTicket('Nuevo', 'En proceso')).toBe(true);
    expect(canTransitionTicket('En proceso', 'En espera')).toBe(true);
    expect(canTransitionTicket('En proceso', 'Resuelto')).toBe(true);
    expect(canTransitionTicket('En espera', 'En proceso')).toBe(true);
    expect(canTransitionTicket('En espera', 'Resuelto')).toBe(true);
    expect(canTransitionTicket('Resuelto', 'Cerrado')).toBe(true);
  });

  it('rejects jumps, reopenings, identity and any exit from Cerrado', () => {
    for (const [from, to] of [
      ['Nuevo', 'Resuelto'],
      ['Nuevo', 'Cerrado'],
      ['Nuevo', 'En espera'],
      ['En espera', 'Nuevo'],
      ['Resuelto', 'Nuevo'],
      ['Resuelto', 'En proceso'],
      ['Resuelto', 'En espera'],
      ['Cerrado', 'Resuelto'],
      ['Cerrado', 'Nuevo'],
      ['En proceso', 'En proceso'],
      ['', 'Nuevo']
    ]) {
      expect(canTransitionTicket(from, to)).toBe(false);
    }
  });

  it('lists the next statuses and none for Cerrado', () => {
    expect(nextTicketStatuses('Nuevo')).toEqual(['En proceso']);
    expect(nextTicketStatuses('En proceso')).toEqual(['En espera', 'Resuelto']);
    expect(nextTicketStatuses('Cerrado')).toEqual([]);
    expect(nextTicketStatuses('Desconocido')).toEqual([]);
  });
});
