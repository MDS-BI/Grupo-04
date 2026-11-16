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

function seedClient() {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
}

function seedOpportunity(client, overrides = {}) {
  return storage.addDocument({
    entityId: client.entity_id,
    series: 'OPP',
    folio: 3001,
    startDate: '2026-11-02',
    endDate: '2026-11-30',
    totalAmount: 8500000,
    currency: 'CLP',
    status: 'Nueva',
    opportunityTitle: 'Adquisición de compresor industrial',
    opportunityOwner: 'Ejecutivo A',
    ...overrides
  });
}

function selectForEdit(documentId) {
  const select = qs('edit-document');
  select.value = documentId;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function changeStatus(value) {
  const status = qs('status');
  status.value = value;
  status.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function statusOptions() {
  return [...qs('status').options].map((o) => o.value);
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

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US5 — gestionar oportunidades y ciclo de vida', () => {
  it('advances through the full commercial cycle up to Ganada', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();

    for (const stage of ['Contactada', 'Propuesta', 'Negociación', 'Ganada']) {
      selectForEdit(opportunity.id);
      expect(qs('status').tagName).toBe('SELECT');
      changeStatus(stage);
      submitForm('document-form');
      expect(storage.loadDocuments()[0].status).toBe(stage);
    }
    expect(qs('opportunity-message').textContent).toMatch(/actualizada correctamente/i);
    selectForEdit(opportunity.id);
    expect(statusOptions()).toEqual(['Ganada']);
  });

  it('offers only the current and next stages when editing', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();
    selectForEdit(opportunity.id);
    expect(statusOptions()).toEqual(['Nueva', 'Contactada', 'Perdida']);

    changeStatus('Contactada');
    submitForm('document-form');
    selectForEdit(opportunity.id);
    expect(statusOptions()).toEqual(['Contactada', 'Propuesta', 'Perdida']);
  });

  it('requires a loss reason before saving a lost opportunity', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();

    selectForEdit(opportunity.id);
    changeStatus('Perdida');
    const wrap = qs('cf-lossReason').closest('.custom-field');
    expect(wrap.hidden).toBe(false);

    submitForm('document-form');
    expect(storage.loadDocuments()[0].status).toBe('Nueva');
    expect(qs('error-cf-lossReason').textContent).toContain('obligatorio');
  });

  it('saves a lost opportunity with a non-blank reason and keeps it after reload', async () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();

    selectForEdit(opportunity.id);
    changeStatus('Perdida');
    qs('cf-lossReason').value = 'Precio fuera de rango';
    submitForm('document-form');

    expect(storage.loadDocuments()[0].status).toBe('Perdida');
    expect(storage.loadDocuments()[0].lossReason).toBe('Precio fuera de rango');

    const previous = storageSnapshot();
    dom.window.close();
    await startDom(previous);
    qs('nav-documents').click();
    expect(storage.loadDocuments()[0].status).toBe('Perdida');
    expect(qs('opportunity-list-items').textContent).toContain('Perdida');
  });

  it('rejects forbidden jumps and reopenings at the storage layer', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);

    expect(() => storage.updateDocument(opportunity.id, { status: 'Ganada' })).toThrow(/transición|permitida/i);
    expect(storage.loadDocuments()[0].status).toBe('Nueva');

    storage.updateDocument(opportunity.id, { status: 'Contactada' });
    storage.updateDocument(opportunity.id, { status: 'Propuesta' });
    expect(() => storage.updateDocument(opportunity.id, { status: 'Ganada' })).toThrow(/transición|permitida/i);
    expect(storage.loadDocuments()[0].status).toBe('Propuesta');

    storage.updateDocument(opportunity.id, { status: 'Negociación' });
    storage.updateDocument(opportunity.id, { status: 'Ganada' });
    expect(() => storage.updateDocument(opportunity.id, { status: 'Nueva' })).toThrow(/transición|permitida|reabr/i);
    expect(storage.loadDocuments()[0].status).toBe('Ganada');
  });

  it('edits other fields while keeping the final stage', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();
    for (const stage of ['Contactada', 'Propuesta', 'Negociación', 'Ganada']) {
      selectForEdit(opportunity.id);
      changeStatus(stage);
      submitForm('document-form');
    }

    selectForEdit(opportunity.id);
    expect(qs('status').value).toBe('Ganada');
    qs('totalAmount').value = '9000000';
    qs('notes').value = 'Monto ajustado después del cierre.';
    submitForm('document-form');

    const saved = storage.loadDocuments()[0];
    expect(saved.status).toBe('Ganada');
    expect(saved.totalAmount).toBe(9000000);
    expect(saved.id).toBe(opportunity.id);
    expect(saved.entity_id).toBe(client.entity_id);
  });

  it('deletes only the opportunity after confirmation and keeps the client', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();

    qs('edit-document').value = opportunity.id;
    qs('delete-document').click();

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(storage.loadDocuments().length).toBe(0);
    expect(storage.loadEntities().length).toBe(1);
  });

  it('keeps the opportunity when deletion is cancelled', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();
    globalThis.confirm = vi.fn(() => false);

    qs('edit-document').value = opportunity.id;
    qs('delete-document').click();
    expect(storage.loadDocuments().length).toBe(1);
  });

  it('opens the edit form from the list action', () => {
    const client = seedClient();
    const opportunity = seedOpportunity(client);
    qs('nav-documents').click();

    qs('opportunity-list-items').querySelector('[data-action="edit"]').click();
    expect(qs('document-id').value).toBe(opportunity.id);
    expect(qs('document-submit-button').textContent).toMatch(/Actualizar/i);
    expect(qs('cf-opportunityTitle').value).toContain('compresor');
  });

  it('keeps folio uniqueness when editing an opportunity', () => {
    const client = seedClient();
    const first = seedOpportunity(client);
    seedOpportunity(client, { folio: 3002, opportunityTitle: 'Otra' });
    qs('nav-documents').click();

    selectForEdit(first.id);
    qs('folio').value = '3002';
    submitForm('document-form');

    expect(storage.loadDocuments().find((d) => d.id === first.id).folio).toBe(3001);
    expect(qs('opportunity-message').textContent).toMatch(/folio/i);
  });
});
