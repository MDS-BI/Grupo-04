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

function typeSearch(value) {
  const input = qs('global-search-input');
  input.value = value;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
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

async function reloadApp() {
  const previous = snapshotStorage();
  dom.window.close();
  await startDom(previous);
}

function createClientThroughUi() {
  qs('nav-entities').click();
  qs('name').value = 'Empresa Demo 1';
  qs('code').value = 'CLI-DEMO-003';
  qs('category').value = 'Prospecto';
  qs('cf-accountOwner').value = 'Ejecutivo A';
  qs('cf-acquisitionSource').value = 'Referido';
  qs('targetDate').value = '2026-11-20';
  submitForm('entity-form');
}

function createOpportunityThroughUi(clientId) {
  qs('nav-documents').click();
  qs('document-entity').value = clientId;
  qs('cf-opportunityTitle').value = 'Adquisición de compresor industrial para planta de producción';
  qs('folio').value = '3001';
  qs('startDate').value = '2026-11-02';
  qs('endDate').value = '2026-11-30';
  qs('totalAmount').value = '8500000';
  qs('cf-opportunityOwner').value = 'Ejecutivo A';
  qs('notes').value = 'Pendiente precisar características técnicas.';
  submitForm('document-form');
}

function advance(documentId, stage) {
  const select = qs('edit-document');
  select.value = documentId;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  const status = qs('status');
  status.value = stage;
  status.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  submitForm('document-form');
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('T070 — recorrido crítico del MVP P1', () => {
  it('goes from client to opportunity, advance, search and reload keeping persistence', async () => {
    createClientThroughUi();
    const client = storage.loadEntities()[0];
    expect(client.name).toBe('Empresa Demo 1');

    createOpportunityThroughUi(client.entity_id);
    const created = storage.loadDocuments()[0];
    expect(created.status).toBe('Nueva');
    expect(created.folio).toBe(3001);

    for (const stage of ['Contactada', 'Propuesta', 'Negociación', 'Ganada']) {
      advance(created.id, stage);
      expect(storage.loadDocuments()[0].status).toBe(stage);
    }

    typeSearch('3001');
    const results = [...qs('search-opportunities-list').querySelectorAll('.opportunity-result')];
    expect(results.length).toBe(1);
    results[0].querySelector('[data-open-document]').click();
    expect(qs('opportunity-detail-body').textContent).toContain('Ganada');
    expect(qs('opportunity-detail-body').textContent).toContain('Empresa Demo 1');

    typeSearch('demo');
    const clients = [...qs('search-results-list').querySelectorAll('.client-summary')];
    expect(clients.length).toBe(1);
    clients[0].querySelector('[data-open-entity]').click();
    expect(qs('entity-detail-body').textContent).toContain('Adquisición de compresor industrial');

    await reloadApp();
    qs('nav-documents').click();

    const documents = storage.loadDocuments();
    expect(documents.length).toBe(1);
    expect(documents[0].id).toBe(created.id);
    expect(documents[0].status).toBe('Ganada');
    expect(documents[0].entity_id).toBe(client.entity_id);
    expect(qs('opportunity-list-items').textContent).toContain('Ganada');

    const entities = storage.loadEntities();
    expect(entities.length).toBe(1);
    expect(entities[0].id).toBe(client.id);
    expect(entities[0].entity_id).toBe(client.entity_id);
  });
});
