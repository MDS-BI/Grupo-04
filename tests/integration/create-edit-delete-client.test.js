import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { addDocument, loadDocuments, loadEntities } from '../../src/storage.js';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function fillClient({ name = 'Empresa Demo 1', code = 'CLI-DEMO-003', category = 'Prospecto' } = {}) {
  qs('name').value = name;
  qs('code').value = code;
  qs('category').value = category;
  qs('cf-accountOwner').value = 'Ejecutivo A';
  qs('cf-acquisitionSource').value = 'Referido';
}

function snapshotStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  return data;
}

async function startDom(storage = null) {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  if (storage) {
    Object.entries(storage).forEach(([key, value]) => w.localStorage.setItem(key, value));
  }
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
}

async function reloadApp() {
  const storage = snapshotStorage();
  dom.window.close();
  await startDom(storage);
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US1 — registrar clientes y prospectos', () => {
  it('creates a valid client and shows it in the client list', () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');

    const entities = loadEntities();
    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('Empresa Demo 1');
    expect(entities[0].entity_id).toBeTruthy();
    expect(entities[0].id).not.toBe(entities[0].entity_id);

    const items = [...qs('client-list-items').querySelectorAll('.client-summary')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Empresa Demo 1');
    expect(qs('entity-message').textContent).toMatch(/guardado|registrad/i);
    expect(qs('client-list-empty').hidden).toBe(true);
  });

  it('normalizes the code with trim and uppercase', () => {
    qs('nav-entities').click();
    fillClient({ name: 'Empresa Demo 2', code: '  cli-demo-004 ' });
    submitForm('entity-form');
    expect(loadEntities()[0].code).toBe('CLI-DEMO-004');
  });

  it('rejects a duplicated code without altering the existing record', () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');
    const original = loadEntities()[0];

    fillClient({ name: 'Otra Empresa', code: '  cli-demo-003 ' });
    submitForm('entity-form');

    const entities = loadEntities();
    expect(entities.length).toBe(1);
    expect(entities[0].id).toBe(original.id);
    expect(entities[0].code).toBe('CLI-DEMO-003');
    expect(qs('entity-message').textContent).toMatch(/código|existe/i);
    expect(qs('name').value).toBe('Otra Empresa');
  });

  it('blocks saving when required fields are blank and keeps what was typed', () => {
    qs('nav-entities').click();
    qs('name').value = '   ';
    qs('code').value = '';
    qs('category').value = '';
    submitForm('entity-form');

    expect(loadEntities().length).toBe(0);
    expect(qs('error-name').textContent).toContain('obligatorio');
    expect(qs('error-code').textContent).toContain('obligatorio');
    expect(qs('error-category').textContent).toContain('obligatorio');
    expect(qs('name').value).toBe('   ');
    expect(qs('entity-message').textContent).toMatch(/revisa/i);
  });

  it('rejects an email with invalid format', () => {
    qs('nav-entities').click();
    fillClient();
    qs('email').value = 'no-es-correo';
    submitForm('entity-form');
    expect(loadEntities().length).toBe(0);
    expect(qs('error-email').textContent).toContain('correo electrónico');
  });

  it('edits a client preserving id and entity_id', () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');
    const created = loadEntities()[0];

    const select = qs('edit-entity');
    select.value = created.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('entity-id').value).toBe(created.id);
    expect(qs('name').value).toBe('Empresa Demo 1');

    qs('name').value = 'Empresa Demo 1 Renombrada';
    qs('email').value = 'contacto@example.com';
    submitForm('entity-form');

    const updated = loadEntities()[0];
    expect(updated.id).toBe(created.id);
    expect(updated.entity_id).toBe(created.entity_id);
    expect(updated.name).toBe('Empresa Demo 1 Renombrada');
    expect(updated.email).toBe('contacto@example.com');
  });

  it('rejects changing the code to another client code while editing', () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');
    fillClient({ name: 'Segunda', code: 'CLI-DEMO-004' });
    submitForm('entity-form');
    const second = loadEntities().find((e) => e.code === 'CLI-DEMO-004');

    const select = qs('edit-entity');
    select.value = second.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('code').value = 'cli-demo-003';
    submitForm('entity-form');

    expect(loadEntities().find((e) => e.id === second.id).code).toBe('CLI-DEMO-004');
    expect(qs('entity-message').textContent).toMatch(/código|existe/i);
  });

  it('deletes a client with confirmation and cascades its opportunities', () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');
    const entity = loadEntities()[0];
    addDocument({ entityId: entity.entity_id, folio: 3001, startDate: '2026-11-02', endDate: '2026-11-30' });

    const select = qs('edit-entity');
    select.value = entity.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(globalThis.confirm.mock.calls[0][0]).toMatch(/1/);
    expect(globalThis.confirm.mock.calls[0][0]).toMatch(/oportunidad/i);
    expect(loadEntities().length).toBe(0);
    expect(loadDocuments().length).toBe(0);
  });

  it('keeps the client and its opportunities when deletion is cancelled', () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');
    const entity = loadEntities()[0];
    addDocument({ entityId: entity.entity_id, folio: 3001, startDate: '2026-11-02', endDate: '2026-11-30' });

    globalThis.confirm = vi.fn(() => false);
    const select = qs('edit-entity');
    select.value = entity.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();

    expect(loadEntities().length).toBe(1);
    expect(loadDocuments().length).toBe(1);
  });

  it('keeps the client list and identifiers after a reload', async () => {
    qs('nav-entities').click();
    fillClient();
    submitForm('entity-form');
    const created = loadEntities()[0];

    await reloadApp();
    qs('nav-entities').click();

    const entities = loadEntities();
    expect(entities.length).toBe(1);
    expect(entities[0].id).toBe(created.id);
    expect(entities[0].entity_id).toBe(created.entity_id);
    expect(qs('client-list-items').textContent).toContain('Empresa Demo 1');
    expect(qs('client-list-empty').hidden).toBe(true);
  });

  it('shows the empty state with an action when there are no clients', () => {
    qs('nav-entities').click();
    expect(qs('client-list-empty').hidden).toBe(false);
    expect(qs('client-list-empty').textContent).toMatch(/No hay clientes/i);
    qs('client-list-create').click();
    expect(qs('view-entities').hidden).toBe(false);
    expect(qs('entity-id').value).toBe('');
  });
});
