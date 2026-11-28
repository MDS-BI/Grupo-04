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

function seedClient(overrides = {}) {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido',
    ...overrides
  });
}

function openClientDetail(client) {
  const input = qs('global-search-input');
  input.value = client.code;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  qs('search-results-list').querySelector('[data-open-entity]').click();
}

function timelineItems() {
  return [...document.querySelectorAll('#detail-timeline .timeline-item')];
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US14 — timeline por cliente y oportunidad', () => {
  it('ordena actividades y tickets del más reciente al más antiguo', () => {
    const client = seedClient();
    storage.addActivity({
      entityId: client.entity_id,
      type: 'llamada',
      subject: 'Llamada antigua',
      owner: 'Ejecutivo A',
      dueDate: '2026-11-20'
    });
    storage.addActivity({
      entityId: client.entity_id,
      type: 'nota',
      subject: 'Nota reciente',
      owner: 'Ejecutivo B',
      dueDate: '2026-11-27'
    });
    const ticket = storage.addTicket({
      entityId: client.entity_id,
      productName: 'Compresor',
      reason: 'soporte',
      description: 'Falla',
      priority: 'Alta'
    });
    storage.resolveTicket(ticket.id, 'Se reemplazó el filtro');

    openClientDetail(client);
    const items = timelineItems();
    expect(items).toHaveLength(3);
    // El ticket se resolvió hoy: es el evento más reciente.
    expect(items[0].textContent).toContain('Ticket');
    expect(items[1].textContent).toContain('Nota reciente');
    expect(items[2].textContent).toContain('Llamada antigua');
  });

  it('filtra por tipo y el detalle del evento es de solo lectura', () => {
    const client = seedClient();
    storage.addActivity({
      entityId: client.entity_id,
      type: 'llamada',
      subject: 'Llamada',
      owner: 'Ejecutivo A',
      dueDate: '2026-11-20'
    });
    storage.addActivity({
      entityId: client.entity_id,
      type: 'nota',
      subject: 'Nota',
      owner: 'Ejecutivo A',
      dueDate: '2026-11-21'
    });
    openClientDetail(client);

    const filter = document.querySelector('#detail-timeline #timeline-filter-type');
    filter.value = 'nota';
    filter.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const items = timelineItems();
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Nota');
    expect(items[0].querySelector('[data-edit-activity]')).toBeNull();
  });

  it('en la oportunidad muestra solo sus actividades, no tickets ni eventos de sistema', () => {
    const client = seedClient();
    const opportunity = storage.addDocument({
      entityId: client.entity_id,
      folio: 3001,
      opportunityTitle: 'Compra de compresor',
      opportunityOwner: 'Ejecutivo A',
      totalAmount: 1000000,
      startDate: '2026-11-02',
      endDate: '2026-11-30'
    });
    storage.addActivity({
      entityId: client.entity_id,
      documentId: opportunity.id,
      type: 'llamada',
      subject: 'Llamada de la oportunidad',
      owner: 'Ejecutivo A',
      dueDate: '2026-11-25'
    });
    storage.addActivity({
      entityId: client.entity_id,
      type: 'nota',
      subject: 'Nota del cliente',
      owner: 'Ejecutivo A',
      dueDate: '2026-11-26'
    });

    const input = qs('global-search-input');
    input.value = '3001';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    qs('search-opportunities-list').querySelector('[data-open-document]').click();

    const timeline = document.getElementById('opportunity-timeline');
    expect(timeline.textContent).toContain('Llamada de la oportunidad');
    expect(timeline.textContent).not.toContain('Nota del cliente');
    expect(timeline.querySelectorAll('.timeline-item')).toHaveLength(1);
  });
});
