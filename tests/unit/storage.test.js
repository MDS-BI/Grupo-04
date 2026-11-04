import { describe, it, expect, beforeEach } from 'vitest';
import { clearAll, loadEntities, addEntity, updateEntity, deleteEntity, validateEntity, searchEntities, loadDocuments, addDocument, updateDocument, deleteDocument, deleteDocumentsForEntity, validateDocument } from '../../src/storage.js';
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
    expect(validateEntity({name:'', code:''}).valid).toBe(false);
    expect(validateEntity({name:'Acme', code:''}).valid).toBe(false);
    expect(validateEntity({name:'A', code:'B'}).valid).toBe(true);
    expect(validateEntity({name:'', code:''}).errors.name).toContain('obligatorio');
  });

  it('adds and loads entities', () => {
    const e = addEntity({name:'Acme', code:'AC-001'});
    const all = loadEntities();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(e.id);
  });

  it('generates a unique entity_id for each entity', () => {
    const e1 = addEntity({name:'Acme', code:'AC-001'});
    const e2 = addEntity({name:'Globex', code:'GL-002'});
    expect(e1.entity_id).toBeDefined();
    expect(e1.entity_id).not.toBe(e2.entity_id);
    expect(loadEntities()[0].entity_id).toBe(e1.entity_id);
  });

  it('updates an entity', () => {
    const e = addEntity({name:'X', code:'X-1'});
    const updated = updateEntity(e.id, { name: 'X2' });
    expect(updated.name).toBe('X2');
  });

  it('deletes an entity', () => {
    const e1 = addEntity({name:'A', code:'A-1'});
    const e2 = addEntity({name:'C', code:'C-1'});
    deleteEntity(e1.id);
    const all = loadEntities();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(e2.id);
  });

  it('persists ERP identity and contact fields', () => {
    const e = addEntity({name:'Acme', code:'AC-001', taxId:'RFC800101AB1', email:'ventas@acme.mx', phone:'555-1234', address:'Av. Reforma 100'});
    const saved = loadEntities()[0];
    expect(saved.taxId).toBe('RFC800101AB1');
    expect(saved.email).toBe('ventas@acme.mx');
    expect(saved.phone).toBe('555-1234');
    expect(saved.address).toBe('Av. Reforma 100');
    const updated = updateEntity(e.id, { phone: '555-9999' });
    expect(updated.phone).toBe('555-9999');
  });

  it('rejects a malformed email address', () => {
    const res = validateEntity({name:'A', code:'B', email:'not-an-email'});
    expect(res.valid).toBe(false);
    expect(res.errors.email).toContain('correo electrónico');
    expect(validateEntity({name:'A', code:'B', email:'ventas@acme.mx'}).valid).toBe(true);
    expect(validateEntity({name:'A', code:'B', email:''}).valid).toBe(true);
  });

  it('validates the credit limit as a non-negative number', () => {
    expect(validateEntity({name:'A', code:'B', creditLimit:-1}).valid).toBe(false);
    expect(validateEntity({name:'A', code:'B', creditLimit:-1}).errors.creditLimit).toContain('no negativo');
    expect(validateEntity({name:'A', code:'B', creditLimit:5000}).valid).toBe(true);
    const e = addEntity({name:'A', code:'B', creditLimit:'5000'});
    expect(loadEntities()[0].creditLimit).toBe(5000);
  });

  it('accepts a valid target date', () => {
    const res = validateEntity({name:'A', code:'B', targetDate:'2026-08-06'});
    expect(res.valid).toBe(true);
  });

  it('rejects an invalid target date', () => {
    const res = validateEntity({name:'A', code:'B', targetDate:'2026-13-45'});
    expect(res.valid).toBe(false);
    expect(res.errors.targetDate).toBeDefined();
  });

  it('allows an empty target date', () => {
    const res = validateEntity({name:'A', code:'B', targetDate:''});
    expect(res.valid).toBe(true);
  });

  it('persists target date on create and update', () => {
    const e = addEntity({name:'Acme', code:'AC-001', targetDate:'2026-09-01'});
    expect(loadEntities()[0].targetDate).toBe('2026-09-01');
    const updated = updateEntity(e.id, { targetDate:'2026-10-01' });
    expect(updated.targetDate).toBe('2026-10-01');
  });

  it('searches by target date', () => {
    addEntity({name:'Acme', code:'AC-001', targetDate:'2026-09-01'});
    addEntity({name:'Globex', code:'GL-002', targetDate:'2026-11-20'});
    const results = searchEntities('2026-09-01');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Acme');
  });

  it('searches by tax id and email', () => {
    addEntity({name:'Acme', code:'AC-001', taxId:'RFC800101AB1', email:'ventas@acme.mx'});
    addEntity({name:'Globex', code:'GL-002', taxId:'RFC991231CD2', email:'hola@globex.mx'});
    expect(searchEntities('RFC800101AB1').length).toBe(1);
    expect(searchEntities('ventas@acme.mx').length).toBe(1);
    expect(searchEntities('globex.mx').length).toBe(1);
  });

  it('validates required custom fields declared in configuration', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number', required: true }]
    });
    const res = validateEntity({name:'A', code:'B'});
    expect(res.valid).toBe(false);
    expect(res.errors.riesgo).toContain('obligatorio');
    expect(validateEntity({name:'A', code:'B', riesgo: 500}).valid).toBe(true);
  });

  it('rejects non-numeric values for number custom fields', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number' }]
    });
    const res = validateEntity({name:'A', code:'B', riesgo: 'alto'});
    expect(res.valid).toBe(false);
    expect(res.errors.riesgo).toContain('número');
  });

  it('persists custom field values alongside base fields without schema changes', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'region', label: 'Region', type: 'text' }]
    });
    const e = addEntity({name:'Acme', code:'AC-001', region:'EMEA'});
    expect(loadEntities()[0].region).toBe('EMEA');
    const updated = updateEntity(e.id, { region: 'APAC' });
    expect(updated.region).toBe('APAC');
    expect(updated.name).toBe('Acme');
  });

  it('includes custom field values in search results', () => {
    setActiveConfig({
      customFields: [{ target: 'entity', key: 'region', label: 'Region', type: 'text' }]
    });
    addEntity({name:'Acme', code:'AC-001', region:'EMEA'});
    addEntity({name:'Globex', code:'GL-002', region:'APAC'});
    const results = searchEntities('emea');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Acme');
  });

  it('ignores undeclared custom keys when persisting', () => {
    const e = addEntity({name:'Acme', code:'AC-001', rogueField:'x'});
    expect(e.rogueField).toBeUndefined();
  });
});

describe('document storage', () => {
  let entity;
  beforeEach(() => {
    entity = addEntity({name:'Acme', code:'AC-001'});
  });

  it('validates a document against base rules', () => {
    const base = { entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05' };
    expect(validateDocument(base).valid).toBe(true);
    expect(validateDocument({...base, entityId:'missing'}).valid).toBe(false);
    expect(validateDocument({...base, folio:''}).valid).toBe(false);
    expect(validateDocument({...base, endDate:'2026-08-01', startDate:'2026-08-05'}).valid).toBe(false);
    expect(validateDocument({...base, quantity:0}).valid).toBe(false);
    expect(validateDocument({...base, quantity:2.5}).valid).toBe(false);
    expect(validateDocument({...base, quantity:3}).valid).toBe(true);
    expect(validateDocument({...base, totalAmount:-1}).valid).toBe(false);
    expect(validateDocument({...base, totalAmount:99.5}).valid).toBe(true);
  });

  it('requires a positive integer folio', () => {
    const base = { entityId:entity.entity_id, startDate:'2026-08-01', endDate:'2026-08-05' };
    expect(validateDocument(base).errors.folio).toContain('obligatorio');
    expect(validateDocument({...base, folio:0}).errors.folio).toContain('entero positivo');
    expect(validateDocument({...base, folio:2.5}).errors.folio).toContain('entero positivo');
    expect(validateDocument({...base, folio:'1001'}).valid).toBe(true);
  });

  it('validates subtotal, discount, tax and their relationship', () => {
    const base = { entityId:entity.entity_id, folio:5, startDate:'2026-08-01', endDate:'2026-08-05' };
    expect(validateDocument({...base, subtotal:-5}).errors.subtotal).toContain('no negativo');
    expect(validateDocument({...base, discount:-1}).errors.discount).toContain('no negativo');
    expect(validateDocument({...base, taxAmount:-2}).errors.taxAmount).toContain('no negativo');
    expect(validateDocument({...base, subtotal:100, discount:200}).valid).toBe(false);
    expect(validateDocument({...base, subtotal:100, discount:150}).errors.discount).toContain('superar el subtotal');
    expect(validateDocument({...base, subtotal:100, discount:16, taxAmount:13.44, totalAmount:97.44}).valid).toBe(true);
  });

  it('adds and loads documents linked by entity_id', () => {
    const d = addDocument({entityId:entity.entity_id, series:'FAC', folio:1001, startDate:'2026-08-01', endDate:'2026-08-05', quantity:2, subtotal:500, discount:50, taxAmount:72.8, totalAmount:522.8, currency:'MXN', status:'pendiente', paymentTerms:'neto 30', notes:'Entrega en almacén'});
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
    const d = addDocument({entityId:entity.entity_id, folio:1001, startDate:'2026-08-01', endDate:'2026-08-05'});
    const updated = updateDocument(d.id, { folio: 1002 });
    expect(updated.folio).toBe(1002);
  });

  it('deletes a document', () => {
    const d1 = addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05'});
    const d2 = addDocument({entityId:entity.entity_id, folio:2, startDate:'2026-08-02', endDate:'2026-08-06'});
    deleteDocument(d1.id);
    const all = loadDocuments();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(d2.id);
  });

  it('deletes documents for an entity', () => {
    const other = addEntity({name:'Globex', code:'GL-002'});
    addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05'});
    addDocument({entityId:entity.entity_id, folio:2, startDate:'2026-08-02', endDate:'2026-08-06'});
    addDocument({entityId:other.entity_id, folio:3, startDate:'2026-08-03', endDate:'2026-08-07'});
    deleteDocumentsForEntity(entity.entity_id);
    const all = loadDocuments();
    expect(all.length).toBe(1);
    expect(all[0].entity_id).toBe(other.entity_id);
  });

  it('cascades document deletion when an entity is deleted', () => {
    const other = addEntity({name:'Globex', code:'GL-002'});
    addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05'});
    addDocument({entityId:other.entity_id, folio:2, startDate:'2026-08-02', endDate:'2026-08-06'});
    deleteEntity(entity.id);
    const docs = loadDocuments();
    expect(docs.length).toBe(1);
    expect(docs[0].entity_id).toBe(other.entity_id);
  });

  it('persists declared document custom fields', () => {
    setActiveConfig({
      customFields: [{ target: 'document', key: 'metodoEnvio', label: 'Método de envío', type: 'select', options: ['estándar','exprés'] }]
    });
    const d = addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05', metodoEnvio:'exprés'});
    expect(loadDocuments()[0].metodoEnvio).toBe('exprés');
    expect(validateDocument({entityId:entity.entity_id, folio:2, startDate:'2026-08-01', endDate:'2026-08-05', metodoEnvio:'urgentemente'}).errors.metodoEnvio).toContain('debe ser uno de');
  });
});

describe('document status lifecycle', () => {
  let entity;
  beforeEach(() => {
    entity = addEntity({name:'Acme', code:'AC-001'});
  });

  it('keeps status free-form when no lifecycle is configured', () => {
    const d = addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05', status:'libre'});
    expect(loadDocuments()[0].status).toBe('libre');
    const updated = updateDocument(d.id, { status: 'otro estado' });
    expect(updated.status).toBe('otro estado');
  });

  it('rejects unknown statuses on creation when a lifecycle is configured', () => {
    setActiveConfig({
      statusLifecycle: { statuses:['cotización','pedido','facturado'], transitions:{ cotización:['pedido'], pedido:['facturado'], facturado:[] } }
    });
    const res = validateDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05', status:'inventado'});
    expect(res.valid).toBe(false);
    expect(res.errors.status).toContain('debe ser uno de');
  });

  it('allows any configured status on creation', () => {
    setActiveConfig({
      statusLifecycle: { statuses:['cotización','pedido','facturado'], transitions:{ cotización:['pedido'], pedido:['facturado'], facturado:[] } }
    });
    const d = addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05', status:'pedido'});
    expect(loadDocuments()[0].status).toBe('pedido');
  });

  it('enforces permitted transitions on update regardless of how a change is submitted', () => {
    setActiveConfig({
      statusLifecycle: { statuses:['cotización','pedido','facturado'], transitions:{ cotización:['pedido'], pedido:['facturado'], facturado:[] } }
    });
    const d = addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05', status:'cotización'});
    expect(() => updateDocument(d.id, { status: 'facturado' })).toThrow(/Transición de estado inválida/);
    expect(loadDocuments()[0].status).toBe('cotización');
    const updated = updateDocument(d.id, { status: 'pedido' });
    expect(updated.status).toBe('pedido');
    expect(updateDocument(d.id, { status: 'facturado' }).status).toBe('facturado');
  });

  it('allows keeping the same status on update', () => {
    setActiveConfig({
      statusLifecycle: { statuses:['borrador'], transitions:{ borrador: [] } }
    });
    const d = addDocument({entityId:entity.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-05', status:'borrador'});
    expect(updateDocument(d.id, { folio: 11 }).status).toBe('borrador');
  });
});

describe('clearAll', () => {
  it('empties both stores', () => {
    const e = addEntity({name:'A', code:'A-1'});
    addDocument({entityId:e.entity_id, folio:1, startDate:'2026-08-01', endDate:'2026-08-02'});
    clearAll();
    expect(loadEntities().length).toBe(0);
    expect(loadDocuments().length).toBe(0);
  });
});
