import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { sortRows } from '../../src/components/data-table.js';

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
});

afterEach(() => {
  dom.window.close();
});

function runSearch(query) {
  const start = performance.now();
  const input = qs('global-search-input');
  input.value = query;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  return performance.now() - start;
}

function expectedOpenSummary() {
  const documents = JSON.parse(localStorage.getItem('erp_base_module:documents'));
  const open = documents.filter((doc) => ['Nueva', 'Contactada', 'Propuesta', 'Negociación'].includes(doc.status));
  return {
    clients: JSON.parse(localStorage.getItem('erp_base_module:entities')).length,
    open: open.length,
    amount: open.reduce((total, doc) => total + Number(doc.totalAmount), 0)
  };
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
    console.info(
      `[T063] búsquedas: ${underBudget}/20 bajo 500 ms; más lenta ${Math.max(...measurements).toFixed(1)} ms`
    );
  });

  it('recalculates the panel 20 times with correct indicators and 19 of 20 under 500 ms', () => {
    const expected = expectedOpenSummary();
    const measurements = [];

    for (let index = 0; index < 20; index += 1) {
      const start = performance.now();
      qs('nav-dashboard').click();
      measurements.push(performance.now() - start);

      expect(qs('stat-clients').textContent).toBe(String(expected.clients));
      expect(qs('stat-open-opportunities').textContent).toBe(String(expected.open));
      expect(qs('stat-open-amount').textContent).toBe(String(expected.amount));
      expect(qs('stat-close-rate').textContent).toMatch(/%|Sin datos/);
    }

    const underBudget = measurements.filter((value) => value < 500).length;
    expect(measurements.length).toBe(20);
    expect(underBudget).toBeGreaterThanOrEqual(19);
    console.info(
      `[T063] panel: ${underBudget}/20 recálculos bajo 500 ms; más lento ${Math.max(...measurements).toFixed(1)} ms`
    );
  });
});

const clientSortColumns = [
  { key: 'name', label: 'Cliente', sortable: true },
  { key: 'accountOwner', label: 'Responsable', sortable: true },
  { key: 'targetDate', label: 'Próximo contacto', sortable: true, numeric: true }
];

const opportunitySortColumns = [
  { key: 'folio', label: 'Folio', sortable: true, numeric: true },
  { key: 'opportunityTitle', label: 'Asunto', sortable: true },
  { key: 'totalAmount', label: 'Monto', sortable: true, numeric: true }
];

function storageSnapshot() {
  const data = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    data[key] = localStorage.getItem(key);
  }
  return data;
}

describe('T030 — rendimiento de ordenamiento con 500 clientes y 1000 oportunidades', () => {
  it('sorts 20 times with 19 of 20 under 500 ms and without touching localStorage', () => {
    const clients = buildClients();
    const documents = buildDocuments();
    const before = storageSnapshot();
    const measurements = [];

    const targets = [
      { rows: clients, columns: clientSortColumns, keys: ['name', 'accountOwner', 'targetDate'] },
      { rows: documents, columns: opportunitySortColumns, keys: ['folio', 'opportunityTitle', 'totalAmount'] }
    ];

    for (let index = 0; index < 20; index += 1) {
      const target = targets[index % targets.length];
      const key = target.keys[index % target.keys.length];
      const direction = index % 2 === 0 ? 'asc' : 'desc';
      const start = performance.now();
      const sorted = sortRows(target.rows, target.columns, key, direction);
      measurements.push(performance.now() - start);
      expect(sorted.length).toBe(target.rows.length);
    }

    expect(storageSnapshot()).toEqual(before);
    const underBudget = measurements.filter((value) => value < 500).length;
    expect(measurements.length).toBe(20);
    expect(underBudget).toBeGreaterThanOrEqual(19);
    console.info(
      `[T030] ordenamientos: ${underBudget}/20 bajo 500 ms; más lento ${Math.max(...measurements).toFixed(1)} ms`
    );
  });
});
