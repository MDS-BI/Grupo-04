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

function seedClient(overrides = {}) {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido',
    ...overrides
  });
}

function fillOpportunity({ entityId, folio = '3001', amount = '8500000', startDate, endDate } = {}) {
  qs('document-entity').value = entityId;
  qs('cf-opportunityTitle').value = 'Adquisición de compresor industrial para planta de producción';
  qs('folio').value = folio;
  qs('startDate').value = startDate || '2026-11-02';
  qs('endDate').value = endDate || '2026-11-30';
  qs('totalAmount').value = amount;
  qs('cf-opportunityOwner').value = 'Ejecutivo A';
  qs('notes').value = 'Cliente solicita evaluar un compresor.';
}

function storageSnapshot() {
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
  const previous = storageSnapshot();
  dom.window.close();
  await startDom(previous);
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US4 — registrar una oportunidad comercial', () => {
  it('creates a valid OPP/3001 opportunity with fixed series, currency and initial stage', () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id });
    submitForm('document-form');

    const documents = storage.loadDocuments();
    expect(documents.length).toBe(1);
    const saved = documents[0];
    expect(saved.entity_id).toBe(client.entity_id);
    expect(saved.series).toBe('OPP');
    expect(saved.folio).toBe(3001);
    expect(saved.currency).toBe('CLP');
    expect(saved.status).toBe('Nueva');
    expect(saved.totalAmount).toBe(8500000);
    expect(saved.opportunityTitle).toContain('compresor');
    expect(saved.opportunityOwner).toBe('Ejecutivo A');
    expect(saved.id).not.toBe(saved.entity_id);
    expect(qs('opportunity-message').textContent).toBe('Oportunidad registrada correctamente.');
    expect(qs('opportunity-list-items').textContent).toContain('OPP-3001');
    expect(qs('document-fixed').textContent).toContain('Nueva');
  });

  it('rejects a duplicated series and folio without creating another record', () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id });
    submitForm('document-form');

    fillOpportunity({ entityId: client.entity_id, amount: '1000' });
    submitForm('document-form');

    expect(storage.loadDocuments().length).toBe(1);
    expect(qs('opportunity-message').textContent).toMatch(/folio/i);
  });

  it('rejects an opportunity without a valid client', () => {
    seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: 'cli_inexistente' });
    expect(qs('document-entity').value).toBe('');
    submitForm('document-form');

    expect(storage.loadDocuments().length).toBe(0);
    expect(qs('error-document-entity').textContent).toMatch(/cliente|entidad/i);
  });

  it('blocks creation when there are no clients and offers to create one', () => {
    qs('nav-documents').click();
    expect(qs('document-no-clients').hidden).toBe(false);
    expect(qs('document-no-clients').textContent).toMatch(/registrar .*cliente/i);
    submitForm('document-form');
    expect(storage.loadDocuments().length).toBe(0);
    qs('document-no-clients-action').click();
    expect(qs('quick-create-client')).not.toBeNull();
    expect(qs('view-documents').hidden).toBe(false);
    expect(qs('entity-id').value).toBe('');
  });

  it('accepts an amount of zero', () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id, folio: '3010', amount: '0' });
    submitForm('document-form');

    expect(storage.loadDocuments().length).toBe(1);
    expect(storage.loadDocuments()[0].totalAmount).toBe(0);
  });

  it('rejects negative, decimal and blank amounts', () => {
    const client = seedClient();
    qs('nav-documents').click();
    for (const [index, amount] of ['-1', '10.5', ''].entries()) {
      fillOpportunity({ entityId: client.entity_id, folio: String(4000 + index), amount });
      submitForm('document-form');
      expect(storage.loadDocuments().length).toBe(0);
    }
    expect(qs('error-totalAmount').textContent).toMatch(/monto/i);
  });

  it('rejects inverted and impossible dates', () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id, startDate: '2026-11-30', endDate: '2026-11-02' });
    submitForm('document-form');
    expect(storage.loadDocuments().length).toBe(0);
    expect(qs('error-endDate').textContent).toMatch(/igual o posterior/i);

    fillOpportunity({ entityId: client.entity_id, startDate: '2026-02-30', endDate: '2026-03-01' });
    submitForm('document-form');
    expect(storage.loadDocuments().length).toBe(0);
  });

  it('persists at most one opportunity on repeated submission', () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id });
    submitForm('document-form');
    submitForm('document-form');
    expect(storage.loadDocuments().length).toBe(1);
  });

  it('cancels without creating records', () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id });
    qs('document-cancel-edit').click();
    expect(qs('document-id').value).toBe('');
    expect(qs('cf-opportunityTitle').value).toBe('');
    expect(storage.loadDocuments().length).toBe(0);
  });

  it('keeps the opportunity after a reload', async () => {
    const client = seedClient();
    qs('nav-documents').click();
    fillOpportunity({ entityId: client.entity_id });
    submitForm('document-form');
    const created = storage.loadDocuments()[0];

    await reloadApp();
    qs('nav-documents').click();

    const documents = storage.loadDocuments();
    expect(documents.length).toBe(1);
    expect(documents[0].id).toBe(created.id);
    expect(documents[0].entity_id).toBe(created.entity_id);
    expect(qs('opportunity-list-items').textContent).toContain('OPP-3001');
  });
});
