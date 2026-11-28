import { describe, it, expect, beforeEach } from 'vitest';
import { validateTicket, canTransitionTicket } from '../../src/crm-rules.js';
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
  }
];

function ticket(overrides = {}) {
  return {
    entityId: 'cli_001',
    productName: 'Compresor industrial',
    reason: 'soporte',
    description: 'Falla en el arranque',
    priority: 'Alta',
    status: 'En proceso',
    ...overrides
  };
}

describe('validateTicket', () => {
  it('accepts a ticket with an existing client, product name, reason, description and priority', () => {
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

  it('requires a product, accepting productId or productName as fallback', () => {
    const missing = validateTicket(ticket({ productName: '' }), { entities });
    expect(missing.valid).toBe(false);
    expect(missing.errors.productName).toMatch(/producto/i);

    const byId = validateTicket(ticket({ productName: '', productId: 'PROD-001' }), { entities });
    expect(byId.valid).toBe(true);

    const byName = validateTicket(ticket({ productId: '', productName: 'Compresor industrial' }), { entities });
    expect(byName.valid).toBe(true);
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

  it('forces the initial En proceso status when creating', () => {
    expect(validateTicket(ticket({ status: '' }), { entities }).valid).toBe(true);
    expect(validateTicket(ticket({ status: 'En proceso' }), { entities }).valid).toBe(true);
    const resolvedFromStart = validateTicket(ticket({ status: 'Resuelto' }), { entities });
    expect(resolvedFromStart.valid).toBe(false);
    expect(resolvedFromStart.errors.status).toMatch(/En proceso/i);
  });

  it('allows editing fields of a Resuelto ticket without changing its status', () => {
    const result = validateTicket(
      ticket({
        status: 'Resuelto',
        resolutionSummary: 'Se reemplazó el filtro',
        resolvedAt: '2026-11-20T10:00:00.000Z',
        description: 'Se reemplazó el filtro',
        priority: 'Media'
      }),
      { entities, mode: 'update' }
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a resolved ticket without resolution summary', () => {
    const result = validateTicket(ticket({ status: 'Resuelto', description: 'Se reemplazó el filtro' }), {
      entities,
      mode: 'update'
    });
    expect(result.valid).toBe(false);
    expect(result.errors.resolutionSummary).toMatch(/resumen/i);
  });
});

describe('canTransitionTicket', () => {
  it('accepts En proceso → Resuelto', () => {
    expect(canTransitionTicket('En proceso', 'Resuelto')).toBe(true);
  });

  it('rejects reopening a resolved ticket', () => {
    expect(canTransitionTicket('Resuelto', 'En proceso')).toBe(false);
  });

  it('rejects identity and unknown transitions', () => {
    expect(canTransitionTicket('En proceso', 'En proceso')).toBe(false);
    expect(canTransitionTicket('Resuelto', 'Resuelto')).toBe(false);
    expect(canTransitionTicket('', 'Resuelto')).toBe(false);
    expect(canTransitionTicket('Abierto', 'Resuelto')).toBe(false);
  });
});
