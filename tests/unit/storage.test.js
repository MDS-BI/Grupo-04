import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearAll,
  loadEntities,
  addEntity,
  updateEntity,
  deleteEntity,
  validateEntity,
  searchEntities,
  loadDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteDocumentsForEntity,
  validateDocument,
  addTicket,
  updateTicket,
  loadTickets,
  assignTicket,
  changeTicketStatus,
  resolveTicket,
  closeTicket,
  registerSatisfaction,
  deleteTicket
} from '../../src/storage.js';
import { setActiveConfig } from '../../src/module-config.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
});

describe('entity storage', () => {
  it('validates entity name and code', () => {
    expect(validateEntity({ name: '', code: '' }).valid).toBe(false);
    expect(validateEntity({ name: 'Acme', code: '' }).valid).toBe(false);
    expect(validateEntity({ name: 'A', code: 'B' }).valid).toBe(true);
    expect(validateEntity({ name: '', code: '' }).errors.name).toContain('obligatorio');
  });

  it('adds and loads entities', () => {
    const e = addEntity({ name: 'Acme', code: 'AC-001' });
    const all = loadEntities();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(e.id);
  });

  it('generates a unique entity_id for each entity', () => {
    const e1 = addEntity({ name: 'Acme', code: 'AC-001' });
    const e2 = addEntity({ name: 'Globex', code: 'GL-002' });
    expect(e1.entity_id).toBeDefined();
    expect(e1.entity_id).not.toBe(e2.entity_id);
    expect(loadEntities()[0].entity_id).toBe(e1.entity_id);
  });

  it('updates an entity', () => {
    const e = addEntity({ name: 'X', code: 'X-1' });
    const updated = updateEntity(e.id, { name: 'X2' });
    expect(updated.name).toBe('X2');
  });

  it('deletes an entity', () => {
    const e1 = addEntity({ name: 'A', code: 'A-1' });
    const e2 = addEntity({ name: 'C', code: 'C-1' });
    deleteEntity(e1.id);
    const all = loadEntities();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(e2.id);
  });

  it('persists ERP identity and contact fields', () => {
    const e = addEntity({
      name: 'Acme',
      code: 'AC-001',
      taxId: 'RFC800101AB1',
      email: 'ventas@acme.mx',
      phone: '555-1234',
      address: 'Av. Reforma 100'
    });
    const saved = loadEntities()[0];
    expect(saved.taxId).toBe('RFC800101AB1');
    expect(saved.email).toBe('ventas@acme.mx');
    expect(saved.phone).toBe('555-1234');
    expect(saved.address).toBe('Av. Reforma 100');
    const updated = updateEntity(e.id, { phone: '555-9999' });
    expect(updated.phone).toBe('555-9999');
  });

  it('rejects a malformed email address', () => {
    const res = validateEntity({ name: 'A', code: 'B', email: 'not-an-email' });
    expect(res.valid).toBe(false);
    expect(res.errors.email).toContain('correo electrónico');
    expect(validateEntity({ name: 'A', code: 'B', email: 'ventas@acme.mx' }).valid).toBe(true);
    expect(validateEntity({ name: 'A', code: 'B', email: '' }).valid).toBe(true);
  });

  it('validates the credit limit as a non-negative number', () => {
    expect(validateEntity({ name: 'A', code: 'B', creditLimit: -1 }).valid).toBe(false);
    expect(validateEntity({ name: 'A', code: 'B', creditLimit: -1 }).errors.creditLimit).toContain('no negativo');
    expect(validateEntity({ name: 'A', code: 'B', creditLimit: 5000 }).valid).toBe(true);
    addEntity({ name: 'A', code: 'B', creditLimit: '5000' });
    expect(loadEntities()[0].creditLimit).toBe(5000);
  });

  it('accepts a valid target date', () => {
    const res = validateEntity({ name: 'A', code: 'B', targetDate: '2026-08-06' });
    expect(res.valid).toBe(true);
  });

  it('rejects an invalid target date', () => {
    const res = validateEntity({ name: 'A', code: 'B', targetDate: '2026-13-45' });
    expect(res.valid).toBe(false);
    expect(res.errors.targetDate).toBeDefined();
  });

  it('allows an empty target date', () => {
    const res = validateEntity({ name: 'A', code: 'B', targetDate: '' });
    expect(res.valid).toBe(true);
  });

  it('persists target date on create and update', () => {
    const e = addEntity({ name: 'Acme', code: 'AC-001', targetDate: '2026-09-01' });
    expect(loadEntities()[0].targetDate).toBe('2026-09-01');
    const updated = updateEntity(e.id, { targetDate: '2026-10-01' });
    expect(updated.targetDate).toBe('2026-10-01');
  });

  it('searches by target date', () => {
    addEntity({ name: 'Acme', code: 'AC-001', targetDate: '2026-09-01' });
    addEntity({ name: 'Globex', code: 'GL-002', targetDate: '2026-11-20' });
    const results = searchEntities('2026-09-01');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Acme');
  });

  it('searches by tax id and email', () => {
    addEntity({ name: 'Acme', code: 'AC-001', taxId: 'RFC800101AB1', email: 'ventas@acme.mx' });
    addEntity({ name: 'Globex', code: 'GL-002', taxId: 'RFC991231CD2', email: 'hola@globex.mx' });
    expect(searchEntities('RFC800101AB1').length).toBe(1);
    expect(searchEntities('ventas@acme.mx').length).toBe(1);
    expect(searchEntities('globex.mx').length).toBe(1);
  });

  it('validates required custom fields declared in configuration', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number', required: true }]
    });
    const res = validateEntity({ name: 'A', code: 'B' });
    expect(res.valid).toBe(false);
    expect(res.errors.riesgo).toContain('obligatorio');
    expect(validateEntity({ name: 'A', code: 'B', riesgo: 500 }).valid).toBe(true);
  });

  it('rejects non-numeric values for number custom fields', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number' }]
    });
    const res = validateEntity({ name: 'A', code: 'B', riesgo: 'alto' });
    expect(res.valid).toBe(false);
    expect(res.errors.riesgo).toContain('número');
  });

  it('persists custom field values alongside base fields without schema changes', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'region', label: 'Region', type: 'text' }]
    });
    const e = addEntity({ name: 'Acme', code: 'AC-001', region: 'EMEA' });
    expect(loadEntities()[0].region).toBe('EMEA');
    const updated = updateEntity(e.id, { region: 'APAC' });
    expect(updated.region).toBe('APAC');
    expect(updated.name).toBe('Acme');
  });

  it('includes custom field values in search results', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'region', label: 'Region', type: 'text' }]
    });
    addEntity({ name: 'Acme', code: 'AC-001', region: 'EMEA' });
    addEntity({ name: 'Globex', code: 'GL-002', region: 'APAC' });
    const results = searchEntities('emea');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Acme');
  });

  it('ignores undeclared custom keys when persisting', () => {
    const e = addEntity({ name: 'Acme', code: 'AC-001', rogueField: 'x' });
    expect(e.rogueField).toBeUndefined();
  });
});

describe('document storage', () => {
  let entity;
  beforeEach(() => {
    entity = addEntity({ name: 'Acme', code: 'AC-001' });
  });

  it('validates a document against base rules', () => {
    const base = { entityId: entity.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' };
    expect(validateDocument(base).valid).toBe(true);
    expect(validateDocument({ ...base, entityId: 'missing' }).valid).toBe(false);
    expect(validateDocument({ ...base, folio: '' }).valid).toBe(false);
    expect(validateDocument({ ...base, endDate: '2026-08-01', startDate: '2026-08-05' }).valid).toBe(false);
    expect(validateDocument({ ...base, quantity: 0 }).valid).toBe(false);
    expect(validateDocument({ ...base, quantity: 2.5 }).valid).toBe(false);
    expect(validateDocument({ ...base, quantity: 3 }).valid).toBe(true);
    expect(validateDocument({ ...base, totalAmount: -1 }).valid).toBe(false);
    expect(validateDocument({ ...base, totalAmount: 99.5 }).valid).toBe(true);
  });

  it('requires a positive integer folio', () => {
    const base = { entityId: entity.entity_id, startDate: '2026-08-01', endDate: '2026-08-05' };
    expect(validateDocument(base).errors.folio).toContain('obligatorio');
    expect(validateDocument({ ...base, folio: 0 }).errors.folio).toContain('entero positivo');
    expect(validateDocument({ ...base, folio: 2.5 }).errors.folio).toContain('entero positivo');
    expect(validateDocument({ ...base, folio: '1001' }).valid).toBe(true);
  });

  it('validates subtotal, discount, tax and their relationship', () => {
    const base = { entityId: entity.entity_id, folio: 5, startDate: '2026-08-01', endDate: '2026-08-05' };
    expect(validateDocument({ ...base, subtotal: -5 }).errors.subtotal).toContain('no negativo');
    expect(validateDocument({ ...base, discount: -1 }).errors.discount).toContain('no negativo');
    expect(validateDocument({ ...base, taxAmount: -2 }).errors.taxAmount).toContain('no negativo');
    expect(validateDocument({ ...base, subtotal: 100, discount: 200 }).valid).toBe(false);
    expect(validateDocument({ ...base, subtotal: 100, discount: 150 }).errors.discount).toContain(
      'superar el subtotal'
    );
    expect(validateDocument({ ...base, subtotal: 100, discount: 16, taxAmount: 13.44, totalAmount: 97.44 }).valid).toBe(
      true
    );
  });

  it('adds and loads documents linked by entity_id', () => {
    const d = addDocument({
      entityId: entity.entity_id,
      series: 'FAC',
      folio: 1001,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      quantity: 2,
      subtotal: 500,
      discount: 50,
      taxAmount: 72.8,
      totalAmount: 522.8,
      currency: 'MXN',
      status: 'pendiente',
      paymentTerms: 'neto 30',
      notes: 'Entrega en almacén'
    });
    const all = loadDocuments();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(d.id);
    expect(all[0].entity_id).toBe(entity.entity_id);
    expect(all[0].series).toBe('FAC');
    expect(all[0].folio).toBe(1001);
    expect(all[0].quantity).toBe(2);
    expect(all[0].subtotal).toBe(500);
    expect(all[0].discount).toBe(50);
    expect(all[0].taxAmount).toBe(72.8);
    expect(all[0].totalAmount).toBe(522.8);
    expect(all[0].paymentTerms).toBe('neto 30');
    expect(all[0].notes).toBe('Entrega en almacén');
  });

  it('updates a document', () => {
    const d = addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });
    const updated = updateDocument(d.id, { folio: 1002 });
    expect(updated.folio).toBe(1002);
  });

  it('deletes a document', () => {
    const d1 = addDocument({ entityId: entity.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' });
    const d2 = addDocument({ entityId: entity.entity_id, folio: 2, startDate: '2026-08-02', endDate: '2026-08-06' });
    deleteDocument(d1.id);
    const all = loadDocuments();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(d2.id);
  });

  it('deletes documents for an entity', () => {
    const other = addEntity({ name: 'Globex', code: 'GL-002' });
    addDocument({ entityId: entity.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' });
    addDocument({ entityId: entity.entity_id, folio: 2, startDate: '2026-08-02', endDate: '2026-08-06' });
    addDocument({ entityId: other.entity_id, folio: 3, startDate: '2026-08-03', endDate: '2026-08-07' });
    deleteDocumentsForEntity(entity.entity_id);
    const all = loadDocuments();
    expect(all.length).toBe(1);
    expect(all[0].entity_id).toBe(other.entity_id);
  });

  it('cascades document deletion when an entity is deleted', () => {
    const other = addEntity({ name: 'Globex', code: 'GL-002' });
    addDocument({ entityId: entity.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' });
    addDocument({ entityId: other.entity_id, folio: 2, startDate: '2026-08-02', endDate: '2026-08-06' });
    deleteEntity(entity.id);
    const docs = loadDocuments();
    expect(docs.length).toBe(1);
    expect(docs[0].entity_id).toBe(other.entity_id);
  });

  it('persists declared document custom fields', () => {
    setActiveConfig({
      customFields: [
        {
          target: 'document',
          key: 'metodoEnvio',
          label: 'Método de envío',
          type: 'select',
          options: ['estándar', 'exprés']
        }
      ]
    });
    addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      metodoEnvio: 'exprés'
    });
    expect(loadDocuments()[0].metodoEnvio).toBe('exprés');
    expect(
      validateDocument({
        entityId: entity.entity_id,
        folio: 2,
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        metodoEnvio: 'urgentemente'
      }).errors.metodoEnvio
    ).toContain('debe ser uno de');
  });
});

describe('document status lifecycle', () => {
  let entity;
  beforeEach(() => {
    entity = addEntity({ name: 'Acme', code: 'AC-001' });
  });

  it('keeps status free-form when no lifecycle is configured', () => {
    const d = addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'libre'
    });
    expect(loadDocuments()[0].status).toBe('libre');
    const updated = updateDocument(d.id, { status: 'otro estado' });
    expect(updated.status).toBe('otro estado');
  });

  it('rejects unknown statuses on creation when a lifecycle is configured', () => {
    setActiveConfig({
      statusLifecycle: {
        statuses: ['cotización', 'pedido', 'facturado'],
        transitions: { cotización: ['pedido'], pedido: ['facturado'], facturado: [] }
      }
    });
    const res = validateDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'inventado'
    });
    expect(res.valid).toBe(false);
    expect(res.errors.status).toContain('debe ser uno de');
  });

  it('allows any configured status on creation', () => {
    setActiveConfig({
      statusLifecycle: {
        statuses: ['cotización', 'pedido', 'facturado'],
        transitions: { cotización: ['pedido'], pedido: ['facturado'], facturado: [] }
      }
    });
    addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'pedido'
    });
    expect(loadDocuments()[0].status).toBe('pedido');
  });

  it('enforces permitted transitions on update regardless of how a change is submitted', () => {
    setActiveConfig({
      statusLifecycle: {
        statuses: ['cotización', 'pedido', 'facturado'],
        transitions: { cotización: ['pedido'], pedido: ['facturado'], facturado: [] }
      }
    });
    const d = addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'cotización'
    });
    expect(() => updateDocument(d.id, { status: 'facturado' })).toThrow(/Transición de estado inválida/);
    expect(loadDocuments()[0].status).toBe('cotización');
    const updated = updateDocument(d.id, { status: 'pedido' });
    expect(updated.status).toBe('pedido');
    expect(updateDocument(d.id, { status: 'facturado' }).status).toBe('facturado');
  });

  it('allows keeping the same status on update', () => {
    setActiveConfig({
      statusLifecycle: { statuses: ['borrador'], transitions: { borrador: [] } }
    });
    const d = addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'borrador'
    });
    expect(updateDocument(d.id, { folio: 11 }).status).toBe('borrador');
  });
});

describe('clearAll', () => {
  it('empties both stores', () => {
    const e = addEntity({ name: 'A', code: 'A-1' });
    addDocument({ entityId: e.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-02' });
    clearAll();
    expect(loadEntities().length).toBe(0);
    expect(loadDocuments().length).toBe(0);
  });
});

describe('ticket storage v4', () => {
  function seedClient() {
    return addEntity({ name: 'Empresa Tickets', code: `CLI-T-${Math.random().toString(36).slice(2, 7)}` });
  }

  function seedTicket(overrides = {}) {
    const entity = seedClient();
    return addTicket({
      entityId: entity.entity_id,
      subject: 'Compresor no arranca',
      productName: 'Compresor industrial',
      reason: 'soporte',
      description: 'Falla en el arranque',
      priority: 'Alta',
      channel: 'Teléfono',
      ...overrides
    });
  }

  it('assigns folio, Nuevo status, creacion event and empty generated dates', () => {
    const ticket = seedTicket();
    expect(ticket.folio).toMatch(/^TKT-\d{4}-0001$/);
    expect(ticket.status).toBe('Nuevo');
    expect(ticket.firstResponseAt).toBeNull();
    expect(ticket.resolvedAt).toBeNull();
    expect(ticket.closedAt).toBeNull();
    expect(ticket.satisfactionScore).toBeNull();
    expect(ticket.history).toHaveLength(1);
    expect(ticket.history[0].type).toBe('creacion');
    expect(ticket.history[0].note).toBe(ticket.folio);
    expect(ticket.slaDueAt).toBeTruthy();
  });

  it('ignores folio, status and generated fields sent by the caller', () => {
    const entity = seedClient();
    const ticket = addTicket({
      entityId: entity.entity_id,
      subject: 'Caso',
      productName: 'P',
      reason: 'soporte',
      description: 'D',
      priority: 'Baja',
      channel: 'Portal',
      folio: 'TKT-1999-9999',
      status: 'Cerrado',
      firstResponseAt: '1999-01-01T00:00:00.000Z',
      resolvedAt: '1999-01-01T00:00:00.000Z',
      satisfactionScore: 5
    });
    expect(ticket.folio).not.toBe('TKT-1999-9999');
    expect(ticket.status).toBe('Nuevo');
    expect(ticket.firstResponseAt).toBeNull();
    expect(ticket.satisfactionScore).toBeNull();
  });

  it('rejects a ticket without subject, channel or a valid reference', () => {
    const entity = seedClient();
    const base = {
      entityId: entity.entity_id,
      subject: 'Caso',
      productName: 'P',
      reason: 'soporte',
      description: 'D',
      priority: 'Alta',
      channel: 'Teléfono'
    };
    expect(() => addTicket({ ...base, subject: '' })).toThrow(/asunto/i);
    expect(() => addTicket({ ...base, channel: '' })).toThrow(/canal/i);
    expect(() => addTicket({ ...base, contactId: 'con_x' })).toThrow(/contacto/i);
    expect(() => addTicket({ ...base, documentId: 'doc_x' })).toThrow(/venta de origen/i);
    expect(() => addTicket({ ...base, warrantyEndsAt: '2027-02-30' })).toThrow(/garantía/i);
  });

  it('rejects changes to id, folio, client and createdAt', () => {
    const ticket = seedTicket();
    expect(() => updateTicket(ticket.id, { folio: 'TKT-2026-9999' })).toThrow(/folio/i);
    expect(() => updateTicket(ticket.id, { entity_id: 'cli_otro' })).toThrow(/cliente/i);
    expect(() => updateTicket(ticket.id, { createdAt: '1999-01-01T00:00:00.000Z' })).toThrow(/creación/i);
    expect(loadTickets()[0].folio).toBe(ticket.folio);
  });

  it('records the first response when leaving Nuevo and rejects invalid jumps', () => {
    const ticket = seedTicket();
    expect(() => changeTicketStatus(ticket.id, 'Resuelto', { resolutionSummary: 'Hecho' })).toThrow(/transición/i);
    expect(() => changeTicketStatus(ticket.id, 'Cerrado')).toThrow(/transición/i);
    const inProgress = changeTicketStatus(ticket.id, 'En proceso');
    expect(inProgress.status).toBe('En proceso');
    expect(inProgress.firstResponseAt).toBeTruthy();
    expect(inProgress.history.some((event) => event.type === 'estado')).toBe(true);
    expect(() => changeTicketStatus(ticket.id, 'En espera', { note: 'Cliente' })).not.toThrow();
  });

  it('assigns technician and team with one event per effective change', () => {
    const ticket = seedTicket();
    const assigned = assignTicket(ticket.id, { assignee: 'Técnico B', team: 'Terreno' });
    expect(assigned.assignee).toBe('Técnico B');
    expect(assigned.team).toBe('Terreno');
    expect(assigned.history.filter((event) => event.type === 'asignacion')).toHaveLength(1);
    expect(assigned.history.filter((event) => event.type === 'equipo')).toHaveLength(1);
    expect(() => assignTicket(ticket.id, { assignee: 'Técnico Z' })).toThrow(/técnico/i);
    const same = assignTicket(ticket.id, { assignee: 'Técnico B', team: 'Terreno' });
    expect(same.history).toHaveLength(assigned.history.length);
  });

  it('resolves with summary and optional CSAT in one write and closes terminally', () => {
    const ticket = seedTicket();
    changeTicketStatus(ticket.id, 'En proceso');
    const resolved = resolveTicket(ticket.id, 'Se reemplazó el fusible', {
      satisfactionScore: 5,
      satisfactionComment: 'Atención rápida'
    });
    expect(resolved.status).toBe('Resuelto');
    expect(resolved.resolutionSummary).toBe('Se reemplazó el fusible');
    expect(resolved.resolvedAt).toBeTruthy();
    expect(resolved.satisfactionScore).toBe(5);
    expect(resolved.history.some((event) => event.type === 'resolucion')).toBe(true);
    expect(resolved.history.some((event) => event.type === 'satisfaccion')).toBe(true);
    const closed = closeTicket(ticket.id);
    expect(closed.status).toBe('Cerrado');
    expect(closed.closedAt).toBeTruthy();
    expect(() => updateTicket(ticket.id, { description: 'Otro' })).toThrow(/cerrado/i);
    expect(() => changeTicketStatus(ticket.id, 'En proceso')).toThrow(/transición/i);
  });

  it('registers satisfaction once while Resuelto and rejects invalid scores', () => {
    const ticket = seedTicket();
    expect(() => registerSatisfaction(ticket.id, 5, '')).toThrow(/Resuelto/i);
    changeTicketStatus(ticket.id, 'En proceso');
    resolveTicket(ticket.id, 'Solución');
    expect(() => registerSatisfaction(ticket.id, 0, '')).toThrow(/nota entera de 1 a 5/i);
    expect(() => registerSatisfaction(ticket.id, 1.5, '')).toThrow(/nota entera de 1 a 5/i);
    const saved = registerSatisfaction(ticket.id, 4, '  Bien  ');
    expect(saved.satisfactionScore).toBe(4);
    expect(saved.satisfactionComment).toBe('Bien');
    expect(() => registerSatisfaction(ticket.id, 5, '')).toThrow(/ya tiene/i);
    closeTicket(ticket.id);
    expect(() => registerSatisfaction(ticket.id, 5, '')).toThrow(/Resuelto/i);
  });

  it('deletes only the selected ticket and keeps the client', () => {
    const client = seedClient();
    const first = addTicket({
      entityId: client.entity_id,
      subject: 'Uno',
      productName: 'P',
      reason: 'soporte',
      description: 'D',
      priority: 'Alta',
      channel: 'Correo'
    });
    addTicket({
      entityId: client.entity_id,
      subject: 'Dos',
      productName: 'P',
      reason: 'consulta',
      description: 'D',
      priority: 'Baja',
      channel: 'Portal'
    });
    const result = deleteTicket(first.id);
    expect(result.deleted).toBe(true);
    expect(loadTickets()).toHaveLength(1);
    expect(loadTickets()[0].subject).toBe('Dos');
    expect(loadEntities().some((entity) => entity.entity_id === client.entity_id)).toBe(true);
    expect(() => deleteTicket('tkt_x')).toThrow(/no encontrado/i);
  });

  it('does not leave a partial ticket when the write fails', () => {
    const entity = seedClient();
    const real = globalThis.localStorage;
    const broken = {
      getItem: (key) => real.getItem(key),
      setItem: (key, value) => {
        if (key === 'erp_base_module:tickets') throw new Error('QuotaExceededError');
        real.setItem(key, value);
      },
      removeItem: (key) => real.removeItem(key),
      clear: () => real.clear()
    };
    globalThis.localStorage = broken;
    try {
      expect(() =>
        addTicket({
          entityId: entity.entity_id,
          subject: 'Falla',
          productName: 'P',
          reason: 'soporte',
          description: 'D',
          priority: 'Alta',
          channel: 'Teléfono'
        })
      ).toThrow(/guard|espacio|cuota|almacen/i);
    } finally {
      globalThis.localStorage = real;
    }
    expect(loadTickets()).toHaveLength(0);
  });

  it('blocks writes while the stored version is lower than 4', () => {
    globalThis.localStorage.setItem('erp_base_module:schemaVersion', JSON.stringify({ schemaVersion: 3 }));
    expect(() => addEntity({ name: 'Bloqueada', code: 'BL-1' })).toThrow(/migración/i);
    expect(loadEntities()).toHaveLength(0);
  });
});

describe('schema, identity and recovery (T005)', () => {
  const SCHEMA_KEY = 'erp_base_module:schemaVersion';

  function withBrokenStorage(failingKey) {
    const real = globalThis.localStorage;
    const nested = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        if (k === failingKey) throw new Error('QuotaExceededError');
        store.set(k, String(v));
        nested.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
        nested.delete(k);
      },
      clear: () => {
        store.clear();
        nested.clear();
      }
    };
    return {
      restore: () => {
        globalThis.localStorage = real;
      },
      writes: nested
    };
  }

  it('generates a distinct id and entity_id and keeps them stable', () => {
    const e1 = addEntity({ name: 'Acme', code: 'AC-001' });
    const e2 = addEntity({ name: 'Globex', code: 'GL-002' });
    expect(typeof e1.id).toBe('string');
    expect(typeof e1.entity_id).toBe('string');
    expect(e1.id).not.toBe(e1.entity_id);
    expect(new Set([e1.id, e1.entity_id, e2.id, e2.entity_id]).size).toBe(4);

    const updated = updateEntity(e1.id, { name: 'Acme Renamed' });
    expect(updated.id).toBe(e1.id);
    expect(updated.entity_id).toBe(e1.entity_id);
    expect(updated.createdAt).toBe(e1.createdAt);
  });

  it('writes ISO timestamps and refreshes updatedAt on save', async () => {
    const e = addEntity({ name: 'Acme', code: 'AC-001' });
    expect(Number.isNaN(Date.parse(e.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(e.updatedAt))).toBe(false);
    expect(e.updatedAt).toBe(e.createdAt);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = updateEntity(e.id, { name: 'Acme 2' });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(e.updatedAt));
    expect(updated.createdAt).toBe(e.createdAt);
  });

  it('persists an explicit schema version', () => {
    addEntity({ name: 'Acme', code: 'AC-001' });
    const raw = globalThis.localStorage.getItem(SCHEMA_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw).schemaVersion).toBe(4);
  });

  it('reports corrupt JSON without deleting the stored data', () => {
    globalThis.localStorage.setItem('erp_base_module:entities', '{not-json');
    expect(() => loadEntities()).toThrow(/no se pudo leer|corrupto|inválid/i);
    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe('{not-json');
    expect(() => addEntity({ name: 'Acme', code: 'AC-001' })).toThrow(/no se pudo leer|corrupto|inválid/i);
    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe('{not-json');
  });

  it('propagates quota failures without reporting success', () => {
    addEntity({ name: 'Acme', code: 'AC-001' });
    const previous = globalThis.localStorage.getItem('erp_base_module:entities');
    const broken = withBrokenStorage('erp_base_module:entities');
    try {
      expect(() => addEntity({ name: 'Globex', code: 'GL-002' })).toThrow(/guard|espacio|cuota|almacen/i);
    } finally {
      broken.restore();
    }
    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe(previous);
    expect(loadEntities().length).toBe(1);
  });

  it('keeps both collections intact when an atomic write fails midway', () => {
    const e = addEntity({ name: 'Acme', code: 'AC-001' });
    addDocument({ entityId: e.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' });
    const previousEntities = globalThis.localStorage.getItem('erp_base_module:entities');
    const previousDocuments = globalThis.localStorage.getItem('erp_base_module:documents');

    const broken = withBrokenStorage('erp_base_module:documents');
    try {
      expect(() => deleteEntity(e.id)).toThrow(/guard|espacio|cuota|almacen/i);
    } finally {
      broken.restore();
    }

    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe(previousEntities);
    expect(globalThis.localStorage.getItem('erp_base_module:documents')).toBe(previousDocuments);
    expect(loadEntities().length).toBe(1);
    expect(loadDocuments().length).toBe(1);
  });

  it('rejects a future schema version instead of migrating silently', () => {
    globalThis.localStorage.setItem(SCHEMA_KEY, JSON.stringify({ schemaVersion: 99 }));
    globalThis.localStorage.setItem('erp_base_module:entities', '[]');
    expect(() => loadEntities()).toThrow(/esquema|versión/i);
  });
});
