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

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function fill(id, value) {
  const element = qs(id);
  element.value = value;
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function snapshotStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  return data;
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

function seedClient(overrides = {}) {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido',
    ...overrides
  });
}

function openClientDetail(client) {
  const input = qs('global-search-input');
  input.value = client.code;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  qs('search-results-list').querySelector('[data-open-entity]').click();
}

function addContactFromForm(values) {
  qs('entity-detail-body').querySelector('[data-new-contact]').click();
  fill('contact-name', values.name);
  if (values.role) fill('contact-role', values.role);
  if (values.email) fill('contact-email', values.email);
  if (values.phone) fill('contact-phone', values.phone);
  qs('contact-primary').checked = Boolean(values.primary);
  submitForm('contact-form');
}

function contactItems() {
  return [...qs('entity-detail-body').querySelectorAll('.contact-item')];
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US12 — contactos múltiples por cliente', () => {
  it('migra contactName al primer contacto y agrega un segundo contacto', () => {
    const client = seedClient({ contactName: 'Contacto Heredado', email: 'heredado@example.com' });
    openClientDetail(client);

    const contacts = storage.loadContacts();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Contacto Heredado');
    expect(contacts[0].isPrimary).toBe(true);
    expect(qs('entity-detail-body').textContent).toContain('Contacto Heredado');

    addContactFromForm({ name: 'Contacto Dos', role: 'Compras', email: 'dos@example.com' });
    const updated = storage.loadContacts();
    expect(updated).toHaveLength(2);
    expect(updated.filter((contact) => contact.isPrimary)).toHaveLength(1);
    expect(contactItems()).toHaveLength(2);
    expect(qs('entity-detail-body').textContent).toContain('dos@example.com');
  });

  it('marca un segundo contacto como principal y deja exactamente uno', () => {
    const client = seedClient({ contactName: 'Contacto Heredado' });
    openClientDetail(client);
    addContactFromForm({ name: 'Contacto Dos' });

    const item = contactItems().find((node) => node.textContent.includes('Contacto Dos'));
    item.querySelector('[data-edit-contact]').click();
    qs('contact-primary').checked = true;
    submitForm('contact-form');

    const contacts = storage.loadContacts();
    const primaries = contacts.filter((contact) => contact.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].name).toBe('Contacto Dos');
  });

  it('busca el cliente por correo o teléfono de un contacto', () => {
    const client = seedClient({ name: 'Empresa Búsqueda', code: 'CLI-BUS-001' });
    openClientDetail(client);
    addContactFromForm({ name: 'Contacto Clave', email: 'clave@example.com', phone: '+56 9 2222 3333' });

    const input = qs('global-search-input');
    input.value = 'clave@example.com';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('search-results-list').textContent).toContain('Empresa Búsqueda');

    input.value = '2222 3333';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('search-results-list').textContent).toContain('Empresa Búsqueda');
  });

  it('elimina un contacto principal y reasigna el principal a otro contacto', () => {
    const client = seedClient({ contactName: 'Contacto Heredado' });
    openClientDetail(client);
    addContactFromForm({ name: 'Contacto Dos' });

    const item = contactItems().find((node) => node.textContent.includes('Contacto Heredado'));
    item.querySelector('[data-delete-contact]').click();

    const remaining = storage.loadContacts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Contacto Dos');
    expect(remaining[0].isPrimary).toBe(true);
  });

  it('conserva los contactos tras recargar la aplicación', async () => {
    const client = seedClient({ contactName: 'Contacto Heredado' });
    openClientDetail(client);
    addContactFromForm({ name: 'Contacto Persistente', email: 'persistente@example.com' });

    const previous = snapshotStorage();
    dom.window.close();
    await startDom(previous);
    const entity = storage.loadEntities().find((item) => item.entity_id === client.entity_id);
    openClientDetail(entity);
    expect(qs('entity-detail-body').textContent).toContain('Contacto Persistente');
    expect(storage.loadContacts()).toHaveLength(2);
  });
});
