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

async function startDom() {
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
}

function seedControlSample() {
  const now = Date.now();
  const ago = (hours) => new Date(now - hours * 3600000).toISOString();
  const client = storage.addEntity({
    name: 'Empresa Panel',
    code: 'CLI-PANEL',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  const base = {
    entityId: client.entity_id,
    productName: 'Compresor',
    reason: 'soporte',
    description: 'Caso',
    channel: 'Teléfono',
    contactId: null,
    requesterName: null
  };
  const make = (subject, priority, createdHours) =>
    storage.addTicket({ ...base, subject, priority }, { now: ago(createdHours), createdAt: ago(createdHours) });

  make('A', 'Alta', 2);
  const b = make('B', 'Media', 60);
  storage.changeTicketStatus(b.id, 'En proceso', { now: ago(59) });
  const c = make('C', 'Alta', 30);
  storage.changeTicketStatus(c.id, 'En proceso', { now: ago(29) });
  storage.changeTicketStatus(c.id, 'En espera', { now: ago(28) });
  const d = make('D', 'Baja', 200);
  storage.changeTicketStatus(d.id, 'En proceso', { now: ago(199) });
  storage.resolveTicket(d.id, 'Solución D', { now: ago(100), satisfactionScore: 5 });
  const e = make('E', 'Media', 100);
  storage.changeTicketStatus(e.id, 'En proceso', { now: ago(99) });
  storage.resolveTicket(e.id, 'Solución E', { now: ago(10), satisfactionScore: 3 });
  const f = make('F', 'Baja', 300);
  storage.changeTicketStatus(f.id, 'En proceso', { now: ago(299) });
  storage.resolveTicket(f.id, 'Solución F', { now: ago(250), satisfactionScore: 4 });
  storage.closeTicket(f.id, { now: ago(240) });
  return { client, first: b };
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US-31 — indicadores de soporte en el panel', () => {
  it('shows the control sample values and recalculates after a change', () => {
    const { client, first } = seedControlSample();
    qs('nav-dashboard').click();
    expect(qs('support-stat-grid').hidden).toBe(false);
    expect(qs('stat-open-tickets').textContent).toBe('3');
    expect(qs('stat-overdue-tickets').textContent).toBe('1');
    expect(qs('stat-priority-distribution').textContent).toBe('Alta 2 · Media 1 · Baja 0');
    expect(qs('stat-avg-resolution').textContent).toBe('80.0');
    expect(qs('stat-sla-compliance').textContent).toBe('66.7 %');
    expect(qs('stat-avg-satisfaction').textContent).toBe('4.0');

    storage.resolveTicket(first.id, 'Resuelto B', { satisfactionScore: 5 });
    qs('nav-dashboard').click();
    expect(qs('stat-open-tickets').textContent).toBe('2');
    expect(qs('stat-avg-satisfaction').textContent).toBe('4.3');
    expect(qs('stat-clients').textContent).toBe('1');
    expect(client).toBeTruthy();
  });

  it('shows zero and “Sin datos” in an empty storage and keeps commercial cards', () => {
    qs('nav-dashboard').click();
    expect(qs('stat-open-tickets').textContent).toBe('0');
    expect(qs('stat-overdue-tickets').textContent).toBe('0');
    expect(qs('stat-priority-distribution').textContent).toBe('Alta 0 · Media 0 · Baja 0');
    expect(qs('stat-avg-resolution').textContent).toBe('Sin datos');
    expect(qs('stat-sla-compliance').textContent).toBe('Sin datos');
    expect(qs('stat-avg-satisfaction').textContent).toBe('Sin datos');
    for (const id of [
      'stat-clients',
      'stat-open-opportunities',
      'stat-open-amount',
      'stat-overdue-followups',
      'stat-today-contacts',
      'stat-close-rate',
      'stat-activities-today',
      'stat-activities-overdue'
    ]) {
      expect(qs(id)).not.toBeNull();
    }
  });
});
