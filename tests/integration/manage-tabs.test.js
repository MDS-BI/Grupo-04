import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, loadEntities, loadDocuments } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

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
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 4 - manage entities and documents via the workspace sidebar', () => {
  it('shows a persistent module navigation with Dashboard, Entities, Documents, and Search buttons', () => {
    const buttons = [...document.querySelectorAll('.nav-module')];
    expect(buttons.length).toBe(4);
    expect(buttons.map(b => b.dataset.module)).toEqual(['dashboard', 'entities', 'documents', 'search']);
  });

  it('switches between the entities and documents management views', () => {
    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    expect(qs('view-documents').hidden).toBe(true);

    qs('nav-documents').click();
    expect(qs('view-entities').hidden).toBe(true);
    expect(qs('view-documents').hidden).toBe(false);

    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    expect(qs('view-documents').hidden).toBe(true);
  });

  it('does not display an entity list anywhere in the management views', () => {
    addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-entities').click();
    expect(document.getElementById('entity-list')).toBeNull();

    qs('nav-search').click();
    expect(qs('search-input')).not.toBeNull();
  });

  it('creates, edits, and deletes an entity from the entities view', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(1);

    const editSelect = qs('edit-entity');
    editSelect.value = editSelect.options[1].value;
    editSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('submit-button').textContent).toBe('Actualizar');
    qs('name').value = 'Acme Updated';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities()[0].name).toBe('Acme Updated');

    qs('delete-entity').click();
    expect(loadEntities().length).toBe(0);
  });

  it('adds and deletes a document from the documents view', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('series').value = 'FAC';
    qs('folio').value = '1001';
    qs('startDate').value = '2026-08-01';
    qs('endDate').value = '2026-08-05';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadDocuments().length).toBe(1);

    qs('edit-document').value = qs('edit-document').options[1].value;
    qs('edit-document').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('document-id').value).toBe(loadDocuments()[0].id);

    qs('delete-document').click();
    expect(loadDocuments().length).toBe(0);
  });

  it('returns to the dashboard via the Dashboard module button', () => {
    qs('nav-entities').click();
    expect(qs('view-dashboard').hidden).toBe(true);
    qs('nav-dashboard').click();
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('view-entities').hidden).toBe(true);
  });
});
