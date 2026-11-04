import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';
import { addEntity, loadDocuments } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

const lifecycle = {
  statusLifecycle: {
    statuses: ['quote', 'order', 'invoiced'],
    transitions: { quote: ['order'], order: ['invoiced'], invoiced: [] }
  }
};

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
});

afterEach(() => {
  dom.window.close();
});

async function bootWith(configOverride){
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(configOverride));
}

describe('User Story 10 - manage documents (edit, delete, cascade)', () => {
  it('edits a selected document through the selector and persists the change', async () => {
    await bootWith(undefined);
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const doc = await (await import('../../src/storage.js')).addDocument({ entityId: entity.entity_id, series: 'FAC', folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });
    qs('nav-entities').click();
    qs('nav-documents').click();
    const select = qs('edit-document');
    select.value = doc.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('document-id').value).toBe(doc.id);
    expect(qs('series').value).toBe('FAC');
    expect(qs('folio').value).toBe('1001');
    expect(qs('document-submit-button').textContent).toBe('Actualizar Documento');

    qs('folio').value = '1002';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadDocuments()[0].folio).toBe(1002);
  });

  it('deletes a selected document', async () => {
    await bootWith(undefined);
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const { addDocument } = await import('../../src/storage.js');
    const doc = addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });
    qs('nav-entities').click();
    qs('nav-documents').click();
    const select = qs('edit-document');
    select.value = doc.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-document').click();
    expect(loadDocuments().length).toBe(0);
  });

  it('cascades document deletion when the parent entity is deleted', async () => {
    await bootWith(undefined);
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const other = addEntity({ name: 'Globex', code: 'GL-002' });
    const { addDocument } = await import('../../src/storage.js');
    addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });
    addDocument({ entityId: other.entity_id, folio: 2001, startDate: '2026-08-02', endDate: '2026-08-06' });

    qs('nav-entities').click();
    const select = qs('edit-entity');
    select.value = select.options[1].value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();

    const docs = loadDocuments();
    expect(docs.length).toBe(1);
    expect(docs[0].entity_id).toBe(other.entity_id);
  });
});

describe('User Story 12 - configured document status lifecycle', () => {
  it('offers only permitted next statuses when editing an existing document', async () => {
    await bootWith(lifecycle);
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const { addDocument } = await import('../../src/storage.js');
    addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05', status: 'quote' });

    qs('nav-entities').click();
    qs('nav-documents').click();
    const select = qs('edit-document');
    select.value = select.options[1].value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const statusOptions = [...qs('status').options].map(o => o.value);
    expect(statusOptions).toEqual(['quote', 'order']);
    expect(statusOptions).not.toContain('invoiced');
  });

  it('offers all configured statuses when creating a document', async () => {
    await bootWith(lifecycle);
    qs('nav-entities').click();
    qs('nav-documents').click();
    const statusOptions = [...qs('status').options].map(o => o.value);
    expect(statusOptions).toEqual(['', 'quote', 'order', 'invoiced']);
  });

  it('keeps status free-form text input when no lifecycle is configured', async () => {
    await bootWith(undefined);
    qs('nav-entities').click();
    qs('nav-documents').click();
    const control = qs('status');
    expect(control.tagName).toBe('INPUT');
    expect(control.getAttribute('type')).toBe('text');
  });

  it('shows the current status at a glance in search results', async () => {
    await bootWith(lifecycle);
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const { addDocument } = await import('../../src/storage.js');
    addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05', status: 'order' });

    qs('nav-search').click();
    qs('search-input').value = 'acme';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const badge = qs('search-results-list').querySelector('.status-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('order');
  });
});
