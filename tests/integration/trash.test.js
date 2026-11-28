import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;
let storage;

function qs(id) {
  return document.getElementById(id);
}

async function startDom(previous = null) {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  if (previous) Object.entries(previous).forEach(([key, value]) => w.localStorage.setItem(key, value));
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
  storage = await import('../../src/storage.js');
}

function seedAggregate() {
  const client = storage.addEntity({
    name: 'Empresa Papelera',
    code: 'CLI-PAP-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  storage.addDocument({
    entityId: client.entity_id,
    folio: 3001,
    opportunityTitle: 'Compra',
    opportunityOwner: 'Ejecutivo A',
    totalAmount: 1000,
    startDate: '2026-11-02',
    endDate: '2026-11-30'
  });
  storage.addTicket({
    entityId: client.entity_id,
    productName: 'Compresor',
    reason: 'soporte',
    description: 'Falla',
    priority: 'Alta'
  });
  storage.addContact({ entityId: client.entity_id, name: 'Contacto Uno', isPrimary: true });
  storage.addActivity({
    entityId: client.entity_id,
    type: 'llamada',
    subject: 'Seguimiento',
    owner: 'Ejecutivo A'
  });
  return client;
}

function deleteClientFromUi(client) {
  qs('nav-entities').click();
  const select = qs('edit-entity');
  select.value = client.id;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  qs('delete-entity').click();
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US16 — papelera con cascada', () => {
  it('mueve el agregado completo a la papelera y lo muestra con su cantidad de registros', () => {
    const client = seedAggregate();
    deleteClientFromUi(client);

    expect(storage.loadEntities()).toHaveLength(0);
    expect(storage.loadDocuments()).toHaveLength(0);
    expect(storage.loadTickets()).toHaveLength(0);
    expect(storage.loadContacts()).toHaveLength(0);
    expect(storage.loadActivities()).toHaveLength(0);

    const trash = storage.loadTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0].documents).toHaveLength(1);
    expect(trash[0].contacts).toHaveLength(1);

    qs('nav-trash').click();
    expect(qs('view-trash').hidden).toBe(false);
    expect(qs('trash-list-items').textContent).toContain('Empresa Papelera');
    expect(qs('trash-list-items').textContent).toContain('5 registros');
  });

  it('restaura el cliente con el 100% de sus relaciones', () => {
    const client = seedAggregate();
    deleteClientFromUi(client);
    qs('nav-trash').click();
    qs('trash-list-items').querySelector('[data-restore-trash]').click();

    expect(storage.loadEntities()).toHaveLength(1);
    expect(storage.loadDocuments()).toHaveLength(1);
    expect(storage.loadTickets()).toHaveLength(1);
    expect(storage.loadContacts()).toHaveLength(1);
    expect(storage.loadActivities()).toHaveLength(1);
    expect(storage.loadTrash()).toHaveLength(0);
    expect(qs('trash-message').textContent).toMatch(/restaurado/i);
    expect(qs('trash-empty').hidden).toBe(false);
  });

  it('purga definitivamente con confirmación', () => {
    const client = seedAggregate();
    deleteClientFromUi(client);
    qs('nav-trash').click();
    qs('trash-list-items').querySelector('[data-purge-trash]').click();

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(storage.loadTrash()).toHaveLength(0);
    expect(storage.loadEntities()).toHaveLength(0);
    expect(qs('trash-message').textContent).toMatch(/purgado/i);
  });

  it('detecta conflictos de identificadores al restaurar sin reasignar', () => {
    const client = seedAggregate();
    deleteClientFromUi(client);
    const snapshot = storage.readSnapshotForBackup();
    // Se vuelve a crear un cliente con el mismo identificador que el de papelera.
    globalThis.localStorage.setItem(
      storage.ENTITIES_KEY,
      JSON.stringify([{ ...snapshot.trash[0].entity, name: 'Conflicto' }])
    );
    qs('nav-trash').click();
    qs('trash-list-items').querySelector('[data-restore-trash]').click();

    expect(qs('trash-message').textContent).toMatch(/ya existe|conflicto/i);
    expect(storage.loadTrash()).toHaveLength(1);
    expect(storage.loadEntities()).toHaveLength(1);
  });
});
