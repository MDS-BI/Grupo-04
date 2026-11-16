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

function seedClient() {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
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

describe('US-UX-03 — estados vacíos contextuales de tabla', () => {
  it('shows no-records with a create CTA when the client list has no records', () => {
    qs('nav-entities').click();

    const empty = qs('client-list-empty').querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(empty.dataset.reason).toBe('no-records');
    expect(empty.textContent).toContain('No hay clientes');
    expect(qs('client-list-items').querySelector('tbody')).toBeNull();
    expect(qs('client-list-items').querySelector('table')).toBeNull();

    const cta = qs('client-list-create');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toMatch(/Nuevo cliente/i);
    cta.click();

    expect(document.querySelector('#overlay-root [role="dialog"]')).not.toBeNull();
    expect(qs('entity-id').value).toBe('');
    expect(storage.loadEntities().length).toBe(0);
  });

  it('shows no-records with a create CTA when the opportunity list has no records', () => {
    qs('nav-documents').click();

    const empty = qs('opportunity-list-empty-state').querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(empty.dataset.reason).toBe('no-records');
    expect(qs('opportunity-list-empty').textContent).toBe('No se encontraron oportunidades');
    expect(qs('opportunity-list-items').querySelector('tbody')).toBeNull();

    const cta = empty.querySelector('.empty-state__cta');
    expect(cta.textContent).toMatch(/Nueva oportunidad/i);
    cta.click();
    expect(document.querySelector('#overlay-root [role="dialog"]')).not.toBeNull();
    expect(qs('document-id').value).toBe('');
  });

  it('shows no-matches with a clear-filters CTA when there are no coincidences', () => {
    seedClient();
    typeSearch('zzz-sin-coincidencias');

    const empty = qs('search-empty').querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(empty.dataset.reason).toBe('no-matches');
    expect(qs('search-results-list').querySelector('tbody')).toBeNull();
    expect(qs('search-empty').hidden).toBe(false);

    const cta = empty.querySelector('.empty-state__cta');
    expect(cta.textContent).toMatch(/Limpiar filtros/i);
    expect(qs('global-search-input').value).toBe('zzz-sin-coincidencias');
    cta.click();
    expect(qs('global-search-input').value).toBe('zzz-sin-coincidencias');
  });

  it('reports no-matches when active filters exclude every record', () => {
    seedClient();
    typeSearch('Demo');

    qs('search-filter-owner').value = 'Ejecutivo B';
    qs('search-filter-owner').dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const empty = qs('search-empty').querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(empty.dataset.reason).toBe('no-matches');
  });

  it('keeps the search hint and renders no empty state or table without a criterion', () => {
    seedClient();
    typeSearch('');

    expect(qs('search-hint').hidden).toBe(false);
    expect(qs('search-empty').hidden).toBe(true);
    expect(qs('search-results-list').children.length).toBe(0);
    expect(qs('search-results-list').querySelector('.empty-state')).toBeNull();
  });
});
