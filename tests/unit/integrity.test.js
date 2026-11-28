import { describe, it, expect } from 'vitest';
import { validateIntegrity, assertImmutableIdentity, assertStatusTransition } from '../../src/crm-rules.js';
import { setActiveConfig, userConfig } from '../../src/module-config.js';

setActiveConfig(userConfig);

const entity = (overrides = {}) => ({
  id: 'ent_1',
  entity_id: 'cli_1',
  name: 'Empresa Uno',
  code: 'CLI-001',
  category: 'Activo',
  accountOwner: 'Ejecutivo A',
  acquisitionSource: 'Referido',
  legacyField: 'valor heredado',
  ...overrides
});

const document_ = (overrides = {}) => ({
  id: 'doc_1',
  entity_id: 'cli_1',
  series: 'OPP',
  folio: 3001,
  startDate: '2026-11-02',
  endDate: '2026-11-30',
  totalAmount: 1000,
  status: 'Nueva',
  opportunityTitle: 'Compra',
  opportunityOwner: 'Ejecutivo A',
  ...overrides
});

const empty = { entities: [], documents: [], tickets: [], contacts: [], activities: [] };

describe('US9 — integridad del conjunto', () => {
  it('acepta una instantánea válida y conserva campos históricos desconocidos', () => {
    const result = validateIntegrity({ ...empty, entities: [entity()], documents: [document_()] });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('detecta identificadores y códigos duplicados normalizando el código', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity(), entity({ id: 'ent_2', entity_id: 'cli_2', code: ' cli-001 ' })]
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'code')).toBe(true);
  });

  it('detecta la pareja series+folio repetida e identifica el registro', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity()],
      documents: [document_(), document_({ id: 'doc_2', folio: 3001 })]
    });
    expect(result.valid).toBe(false);
    const issue = result.issues.find((item) => item.field === 'folio');
    expect(issue.reference).toBe('OPP/3001');
  });

  it('detecta referencias huérfanas sin reasignar clientes', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity()],
      documents: [document_({ entity_id: 'cli_inexistente' })],
      tickets: [
        {
          id: 'tkt_1',
          entity_id: 'cli_inexistente',
          reason: 'soporte',
          description: 'Falla',
          priority: 'Alta',
          status: 'En proceso'
        }
      ]
    });
    expect(result.valid).toBe(false);
    expect(result.issues.filter((issue) => issue.field === 'entity_id')).toHaveLength(2);
  });

  it('acepta oportunidades cerradas válidas sin reconstruir transiciones', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity()],
      documents: [document_({ status: 'Ganada' })]
    });
    expect(result.valid).toBe(true);
  });

  it('rechaza una tarea sin vencimiento y dos contactos principales', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity()],
      contacts: [
        { id: 'con_1', entity_id: 'cli_1', name: 'Contacto A', isPrimary: true },
        { id: 'con_2', entity_id: 'cli_1', name: 'Contacto B', isPrimary: true }
      ],
      activities: [
        { id: 'act_1', entity_id: 'cli_1', type: 'tarea', subject: 'Llamar', owner: 'Ejecutivo A', status: 'pendiente' }
      ]
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'isPrimary')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'dueDate')).toBe(true);
  });

  it('protege identificadores inmutables y transiciones de estado', () => {
    expect(assertImmutableIdentity(entity(), entity({ name: 'Otro' })).valid).toBe(true);
    expect(assertImmutableIdentity(entity(), entity({ id: 'ent_9' })).valid).toBe(false);
    expect(assertStatusTransition({ status: 'Nueva' }, { status: 'Contactada' }).valid).toBe(true);
    expect(assertStatusTransition({ status: 'Nueva' }, { status: 'Ganada' }).valid).toBe(false);
    expect(assertStatusTransition({ status: 'Ganada' }, { status: 'Perdida' }).valid).toBe(false);
  });
});
