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
  storage = await import('../../src/storage.js');
});

afterEach(() => {
  dom.window.close();
});

const SCRIPT_NAME = '<img src=x onerror="window.__xss=1">';
const SCRIPT_TEXT = '<script>window.__xss=2</script>';

describe('T060 — renderizado seguro de texto', () => {
  it('renders a malicious client name as text without executing it', () => {
    qs('nav-entities').click();
    qs('name').value = SCRIPT_NAME;
    qs('code').value = 'CLI-XSS';
    qs('category').value = 'Prospecto';
    qs('cf-accountOwner').value = 'Ejecutivo A';
    qs('cf-acquisitionSource').value = 'Referido';
    qs('description').value = SCRIPT_TEXT;
    submitForm('entity-form');

    const list = qs('client-list-items');
    expect(list.textContent).toContain(SCRIPT_NAME);
    expect(list.querySelector('img')).toBeNull();
    expect(list.querySelector('script')).toBeNull();
    expect(dom.window.__xss).toBeUndefined();

    list.querySelector('[data-open-entity]').click();
    const detail = qs('entity-detail-body');
    expect(detail.textContent).toContain(SCRIPT_NAME);
    expect(detail.textContent).toContain(SCRIPT_TEXT);
    expect(detail.querySelector('img')).toBeNull();
    expect(detail.querySelector('script')).toBeNull();
    expect(dom.window.__xss).toBeUndefined();
  });

  it('renders a malicious opportunity title and notes as text', () => {
    const client = storage.addEntity({
      name: 'Empresa Demo',
      code: 'CLI-DEMO-003',
      category: 'Prospecto',
      accountOwner: 'Ejecutivo A',
      acquisitionSource: 'Referido'
    });
    storage.addDocument({
      entityId: client.entity_id,
      folio: 3001,
      startDate: '2026-11-02',
      endDate: '2026-11-30',
      totalAmount: 1000,
      opportunityTitle: SCRIPT_NAME,
      opportunityOwner: 'Ejecutivo A',
      notes: SCRIPT_TEXT
    });

    qs('nav-documents').click();
    const list = qs('opportunity-list-items');
    expect(list.textContent).toContain(SCRIPT_NAME);
    expect(list.querySelector('img')).toBeNull();

    qs('nav-search').click();
    qs('search-input').value = 'img';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const results = qs('search-opportunities-list');
    expect(results.textContent).toContain(SCRIPT_NAME);
    expect(results.querySelector('img')).toBeNull();

    results.querySelector('[data-open-document]').click();
    const detail = qs('opportunity-detail-body');
    expect(detail.textContent).toContain(SCRIPT_NAME);
    expect(detail.textContent).toContain(SCRIPT_TEXT);
    expect(detail.querySelector('img')).toBeNull();
    expect(detail.querySelector('script')).toBeNull();
    expect(dom.window.__xss).toBeUndefined();
  });
});
