import { describe, it, expect } from 'vitest';
import { validateIntegrity, assertImmutableIdentity, assertStatusTransition } from '../../src/crm-rules.js';
import { normalizeConfig, setActiveConfig, userConfig } from '../../src/module-config.js';

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
          folio: 'TKT-2026-0001',
          entity_id: 'cli_inexistente',
          subject: 'Falla',
          reason: 'soporte',
          description: 'Falla',
          priority: 'Alta',
          status: 'En proceso',
          history: [{ id: 'tkt_1:1', at: '2026-11-20T10:00:00.000Z', type: 'creacion', actor: 'Sistema' }]
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

  it('aplica a los clientes las mismas reglas de los formularios', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity({ category: 'Inexistente', accountOwner: '', acquisitionSource: undefined })],
      documents: [document_()]
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'category')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'accountOwner')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'acquisitionSource')).toBe(true);

    const badEmail = validateIntegrity({ ...empty, entities: [entity({ email: 'no-es-correo' })] });
    expect(badEmail.issues.some((issue) => issue.field === 'email')).toBe(true);
  });

  it('aplica a las oportunidades título, responsable, fechas y monto entero', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity()],
      documents: [
        document_({
          opportunityTitle: '',
          opportunityOwner: '',
          endDate: '2026-11-01',
          totalAmount: 10.5,
          status: 'Inventada'
        })
      ]
    });
    expect(result.valid).toBe(false);
    for (const field of ['opportunityTitle', 'opportunityOwner', 'endDate', 'totalAmount', 'status']) {
      expect(result.issues.some((issue) => issue.field === field)).toBe(true);
    }
  });

  it('valida motivo y prioridad de ticket y correo de contacto', () => {
    const result = validateIntegrity({
      ...empty,
      entities: [entity()],
      tickets: [
        {
          id: 'tkt_1',
          folio: 'TKT-2026-0001',
          entity_id: 'cli_1',
          subject: 'Falla',
          reason: 'otro',
          description: 'Falla',
          priority: 'Urgente',
          status: 'En proceso',
          history: [{ id: 'tkt_1:1', at: '2026-11-20T10:00:00.000Z', type: 'creacion', actor: 'Sistema' }]
        }
      ],
      contacts: [{ id: 'con_1', entity_id: 'cli_1', name: 'Contacto A', isPrimary: true, email: 'malo' }]
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.field === 'reason')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'priority')).toBe(true);
    expect(result.issues.some((issue) => issue.field === 'email')).toBe(true);
  });

  it('no aplica las reglas CRM cuando el perfil es genérico', () => {
    const generic = normalizeConfig(undefined).config;
    const result = validateIntegrity(
      {
        ...empty,
        entities: [{ id: 'ent_1', entity_id: 'cli_1', name: 'Entidad base', code: 'E-1' }]
      },
      generic
    );
    expect(result.valid).toBe(true);
  });

  it('tolera tickets v3 sin folio, asunto, historial ni campos opcionales', () => {
    const result = validateIntegrity(
      {
        ...empty,
        entities: [entity()],
        tickets: [
          {
            id: 'tkt_1',
            entity_id: 'cli_1',
            reason: 'soporte',
            description: 'Falla',
            priority: 'Alta',
            status: 'En proceso'
          }
        ]
      },
      undefined,
      { version: 3 }
    );
    expect(result.valid).toBe(true);
  });

  it('exige folio único, asunto e historial en datos v4 estrictos', () => {
    const missing = validateIntegrity({
      ...empty,
      entities: [entity()],
      tickets: [
        {
          id: 'tkt_1',
          entity_id: 'cli_1',
          reason: 'soporte',
          description: 'Falla',
          priority: 'Alta',
          status: 'En proceso'
        }
      ]
    });
    expect(missing.valid).toBe(false);
    expect(missing.issues.some((issue) => issue.field === 'folio')).toBe(true);
    expect(missing.issues.some((issue) => issue.field === 'subject')).toBe(true);
    expect(missing.issues.some((issue) => issue.field === 'history')).toBe(true);

    const duplicated = validateIntegrity({
      ...empty,
      entities: [entity()],
      tickets: [
        {
          id: 'tkt_1',
          folio: 'TKT-2026-0001',
          entity_id: 'cli_1',
          subject: 'Falla',
          reason: 'soporte',
          description: 'Falla',
          priority: 'Alta',
          status: 'En proceso',
          history: [{ id: 'tkt_1:1', at: '2026-11-20T10:00:00.000Z', type: 'creacion' }]
        },
        {
          id: 'tkt_2',
          folio: 'TKT-2026-0001',
          entity_id: 'cli_1',
          subject: 'Otra falla',
          reason: 'soporte',
          description: 'Otra',
          priority: 'Baja',
          status: 'Nuevo',
          history: [{ id: 'tkt_2:1', at: '2026-11-20T10:00:00.000Z', type: 'creacion' }]
        }
      ]
    });
    expect(duplicated.valid).toBe(false);
    expect(duplicated.issues.some((issue) => issue.field === 'folio' && /repetido/i.test(issue.message))).toBe(true);
  });

  it('valida referencias opcionales v4 sin invalidar un contacto eliminado', () => {
    const results = validateIntegrity({
      ...empty,
      entities: [entity()],
      tickets: [
        {
          id: 'tkt_1',
          folio: 'TKT-2026-0001',
          entity_id: 'cli_1',
          subject: 'Falla',
          reason: 'soporte',
          description: 'Falla',
          priority: 'Alta',
          status: 'En proceso',
          contactId: 'con_eliminado',
          channel: 'Fax',
          warrantyEndsAt: '2027-02-30',
          history: [{ id: 'tkt_1:1', at: '2026-11-20T10:00:00.000Z', type: 'creacion' }]
        }
      ]
    });
    expect(results.issues.some((issue) => issue.field === 'contactId')).toBe(false);
    expect(results.issues.some((issue) => issue.field === 'channel')).toBe(true);
    expect(results.issues.some((issue) => issue.field === 'warrantyEndsAt')).toBe(true);
  });
});
