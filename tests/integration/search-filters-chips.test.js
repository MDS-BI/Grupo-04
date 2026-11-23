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

function changeSelect(id, value) {
  qs(id).value = value;
  qs(id).dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function chip(filter, value) {
  return qs('search-filter-chips').querySelector(`button.chip[data-filter="${filter}"][data-value="${value}"]`);
}

function clientResults() {
  return [...qs('search-results-list').querySelectorAll('.client-summary')];
}

function seed() {
  storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-001',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  storage.addEntity({
    name: 'Compañía Ñuble',
    code: 'CLI-002',
    category: 'Activo',
    accountOwner: 'Ejecutivo B',
    acquisitionSource: 'Sitio web'
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
  seed();
});

afterEach(() => {
  dom.window.close();
});

describe('US-UX-03 — filtros colapsables y chips sincronizados', () => {
  it('mounts the filter bar and chips only inside the search view', () => {
    expect(qs('view-search').contains(qs('search-filters'))).toBe(true);
    expect(qs('view-entities').querySelector('#search-filters')).toBeNull();
    expect(qs('view-documents').querySelector('#search-filters')).toBeNull();
    expect(qs('view-entities').querySelector('#search-filter-chips')).toBeNull();
    expect(qs('view-documents').querySelector('#search-filter-chips')).toBeNull();
  });

  it('toggles the filter bar with aria-expanded and aria-controls', () => {
    const toggle = qs('toggle-filters');
    expect(toggle.getAttribute('aria-controls')).toBe('search-filters');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(qs('search-filters').hidden).toBe(true);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(qs('search-filters').hidden).toBe(false);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(qs('search-filters').hidden).toBe(true);
  });

  it('announces the active filter count with aria-live', () => {
    const counter = qs('active-filter-count');
    expect(counter.getAttribute('aria-live')).toBe('polite');
    expect(counter.textContent).toBe('0');

    changeSelect('search-filter-category', 'Prospecto');
    expect(counter.textContent).toBe('1');
  });

  it('synchronizes chip to select, select to chip and the active count', () => {
    typeSearch('CLI');
    const prospecto = chip('category', 'Prospecto');
    expect(prospecto).not.toBeNull();
    expect(prospecto.getAttribute('aria-pressed')).toBe('false');

    prospecto.click();
    expect(qs('search-filter-category').value).toBe('Prospecto');
    expect(chip('category', 'Prospecto').getAttribute('aria-pressed')).toBe('true');
    expect(qs('active-filter-count').textContent).toBe('1');
    expect(clientResults().length).toBe(1);

    changeSelect('search-filter-owner', 'Ejecutivo A');
    expect(chip('owner', 'Ejecutivo A')).toBeNull();
    expect(chip('accountOwner', 'Ejecutivo A').getAttribute('aria-pressed')).toBe('true');
    expect(qs('active-filter-count').textContent).toBe('2');

    changeSelect('search-filter-owner', '');
    expect(chip('accountOwner', 'Ejecutivo A').getAttribute('aria-pressed')).toBe('false');
    expect(qs('active-filter-count').textContent).toBe('1');
  });

  it('combines several chips with AND and reports no matches', () => {
    typeSearch('CLI');
    expect(clientResults().length).toBe(2);

    chip('category', 'Prospecto').click();
    chip('accountOwner', 'Ejecutivo B').click();

    expect(qs('search-filter-category').value).toBe('Prospecto');
    expect(qs('search-filter-owner').value).toBe('Ejecutivo B');
    expect(clientResults().length).toBe(0);
    expect(qs('search-empty').querySelector('.empty-state').dataset.reason).toBe('no-matches');
  });

  it('clears chips and selectors without touching the search criterion', () => {
    typeSearch('CLI');
    chip('category', 'Prospecto').click();
    changeSelect('search-filter-owner', 'Ejecutivo A');
    expect(qs('active-filter-count').textContent).toBe('2');
    expect(clientResults().length).toBe(1);

    qs('clear-filters').click();

    expect(qs('global-search-input').value).toBe('CLI');
    expect(qs('search-filter-category').value).toBe('');
    expect(qs('search-filter-owner').value).toBe('');
    expect(qs('search-filter-source').value).toBe('');
    expect(chip('category', 'Prospecto').getAttribute('aria-pressed')).toBe('false');
    expect(qs('active-filter-count').textContent).toBe('0');
    expect(clientResults().length).toBe(2);
  });
});
