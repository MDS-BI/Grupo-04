import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

const CLIENTS = 500;
const OPPORTUNITIES = 1000;

let dom;

function qs(id) {
  return document.getElementById(id);
}

function buildClients() {
  return Array.from({ length: CLIENTS }, (_, index) => ({
    id: `ent_${index}`,
    entity_id: `cli_${index}`,
    name: `Cliente Industrial ${String(index).padStart(3, '0')}`,
    code: `CLI-${String(index).padStart(4, '0')}`,
    category: index % 3 === 0 ? 'Prospecto' : 'Activo',
    accountOwner: index % 2 === 0 ? 'Ejecutivo A' : 'Ejecutivo B',
    acquisitionSource: 'Referido',
    targetDate: '2026-11-20',
    createdAt: '2026-11-03T12:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z'
  }));
}

function buildDocuments() {
  return Array.from({ length: OPPORTUNITIES }, (_, index) => ({
    id: `doc_${index}`,
    entity_id: `cli_${index % CLIENTS}`,
    series: 'OPP',
    folio: 4000 + index,
    opportunityTitle: `Oportunidad comercial ${String(index).padStart(4, '0')}`,
    startDate: '2026-11-02',
    endDate: '2026-11-30',
    totalAmount: 1000 + index,
    currency: 'CLP',
    status: index % 4 === 0 ? 'Ganada' : 'Nueva',
    opportunityOwner: index % 2 === 0 ? 'Ejecutivo A' : 'Ejecutivo B',
    createdAt: '2026-11-03T12:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z'
  }));
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
  w.localStorage.setItem('erp_base_module:entities', JSON.stringify(buildClients()));
  w.localStorage.setItem('erp_base_module:documents', JSON.stringify(buildDocuments()));
  w.localStorage.setItem('erp_base_module:schemaVersion', JSON.stringify({ schemaVersion: 1 }));
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
  qs('nav-search').click();
});

afterEach(() => {
  dom.window.close();
});

function runSearch(query) {
  const start = performance.now();
  qs('search-input').value = query;
  qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  return performance.now() - start;
}

describe('T063 — rendimiento de búsqueda con 500 clientes y 1000 oportunidades', () => {
  it('renders 20 searches correctly and keeps 19 of 20 under 500 ms', () => {
    const measurements = [];
    const queries = [];
    for (let index = 0; index < 10; index += 1) {
      queries.push({ value: `CLI-${String(index * 37).padStart(4, '0')}`, type: 'client' });
      queries.push({ value: String(4000 + index * 41), type: 'opportunity' });
    }

    for (const query of queries) {
      const elapsed = runSearch(query.value);
      measurements.push(elapsed);

      if (query.type === 'client') {
        const items = [...qs('search-results-list').querySelectorAll('.client-summary')];
        expect(items.length).toBe(1);
        expect(items[0].textContent).toContain(`CLI-${query.value.replace('CLI-', '')}`);
      } else {
        const items = [...qs('search-opportunities-list').querySelectorAll('.opportunity-result')];
        expect(items.length).toBe(1);
        expect(items[0].textContent).toContain(query.value);
      }
    }

    const underBudget = measurements.filter((value) => value < 500).length;
    expect(measurements.length).toBe(20);
    expect(underBudget).toBeGreaterThanOrEqual(19);
  });
});
