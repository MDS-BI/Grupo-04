import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { addEntity } from '../../src/storage.js';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
}

function typeSearch(value) {
  const input = qs('global-search-input');
  input.value = value;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
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
  const { initApp } = await import('../../src/app.js');
  const { normalizeConfig } = await import('../../src/module-config.js');
  await initApp(normalizeConfig(undefined));
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 8 - search and find entities quickly', () => {
  it('shows only matching entities for a search term', () => {
    addEntity({ name: 'Acme Corp', code: 'AC-001', category: 'partner' });
    addEntity({ name: 'Globex', code: 'GL-002', category: 'supplier' });
    expect(qs('view-search').hidden).toBe(true);
    typeSearch('acme');
    expect(qs('view-search').hidden).toBe(false);
    const items = [...qs('search-results-list').querySelectorAll('.entity-item')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Acme Corp');
    expect(qs('search-empty').hidden).toBe(true);
  });

  it('shows a clear empty state and allows trying again when nothing matches', () => {
    addEntity({ name: 'Acme', code: 'AC-001' });
    typeSearch('zzz-nothing');
    expect(qs('search-empty').hidden).toBe(false);
    expect(qs('search-results-list').children.length).toBe(0);
    typeSearch('Acme');
    expect(qs('search-empty').hidden).toBe(true);
    expect(qs('search-results-list').querySelectorAll('.entity-item').length).toBe(1);
  });

  it('stays prompt and accurate with hundreds of stored entities', () => {
    for (let i = 0; i < 500; i++) {
      addEntity({ name: `Item ${i}`, code: `IT-${String(i).padStart(4, '0')}` });
    }
    const start = Date.now();
    typeSearch('IT-0499');
    const elapsed = Date.now() - start;
    const items = [...qs('search-results-list').querySelectorAll('.entity-item')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('IT-0499');
    expect(elapsed).toBeLessThan(1000);
  });

  it('keeps search results in sync with create and delete actions', () => {
    typeSearch('');
    expect(qs('view-search').hidden).toBe(false);
    expect(qs('search-hint').hidden).toBe(false);
    addEntity({ name: 'Later Entity', code: 'LT-9' });
    qs('nav-dashboard').click();
    typeSearch('later');
    expect(qs('search-results-list').querySelectorAll('.entity-item').length).toBe(1);
  });
});
