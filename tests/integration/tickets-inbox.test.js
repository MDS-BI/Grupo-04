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

function snapshotStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }
  return data;
}

async function startDom(previous = null) {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  if (previous) Object.entries(previous).forEach(([key, value]) => w.localStorage.setItem(key, value));
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
  storage = await import('../../src/storage.js');
}

function seedClient(name, code) {
  return storage.addEntity({
    name,
    code,
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
}

function seedTicket(client, overrides = {}) {
  return storage.addTicket(
    {
      entityId: client.entity_id,
      subject: 'Caso de soporte',
      productName: 'Compresor industrial',
      reason: 'soporte',
      description: 'Descripción del caso',
      priority: 'Media',
      channel: 'Teléfono',
      ...overrides
    },
    overrides.options || {}
  );
}

function openInbox() {
  qs('nav-tickets').click();
}

function rowTickets() {
  return [...qs('tickets-table').querySelectorAll('tbody tr[data-ticket-id]')];
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US-25 — bandeja global de tickets', () => {
  it('opens #view-tickets from navigation and from #/tickets', () => {
    openInbox();
    expect(qs('view-tickets').hidden).toBe(false);
    expect(qs('tickets-heading').textContent).toBe('Tickets');
    expect(qs('nav-tickets').getAttribute('aria-current')).toBe('page');

    window.location.hash = '#/tickets';
    window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    expect(qs('view-tickets').hidden).toBe(false);
  });

  it('lists tickets from three clients with every contracted column', () => {
    const a = seedClient('Cliente A', 'CLI-A');
    const b = seedClient('Cliente B', 'CLI-B');
    const c = seedClient('Cliente C', 'CLI-C');
    seedTicket(a, {
      subject: 'Compresor no arranca',
      assignee: 'Técnico A',
      priority: 'Alta',
      contactId: null,
      requesterName: 'Ana Pérez',
      channel: 'WhatsApp'
    });
    seedTicket(b, { subject: 'Ruido anormal', assignee: null, priority: 'Media', channel: 'Correo' });
    seedTicket(c, { subject: 'Consulta de repuesto', assignee: 'Técnico B', priority: 'Baja', channel: 'Portal' });

    openInbox();
    const rows = rowTickets();
    expect(rows).toHaveLength(3);
    const text = qs('tickets-table').textContent;
    expect(text).toContain('Cliente A');
    expect(text).toContain('Cliente B');
    expect(text).toContain('Cliente C');
    expect(text).toContain('Compresor no arranca');
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('WhatsApp');
    expect(text).toContain('Solicitante no registrado');
    expect(text).toContain('Sin asignar');
    expect(text).toMatch(/TKT-\d{4}-\d{4}/);
    expect(text).toMatch(/En plazo|Por vencer|Vencido|Sin datos/);
    expect(rows[0].getAttribute('tabindex')).toBe('0');
    expect(rows[0].getAttribute('aria-label')).toMatch(/Abrir ticket TKT-/);
  });

  it('combines filters with AND, “Todos” resets one field and clearing restores order and announces', () => {
    const client = seedClient('Cliente Filtros', 'CLI-F');
    seedTicket(client, { subject: 'Alta de Ana', priority: 'Alta', assignee: 'Técnico A', channel: 'Correo' });
    seedTicket(client, { subject: 'Alta de Beto', priority: 'Alta', assignee: 'Técnico B', channel: 'Correo' });
    seedTicket(client, { subject: 'Baja de Carla', priority: 'Baja', assignee: 'Técnico A', channel: 'Portal' });

    openInbox();
    qs('ticket-filter-priority').value = 'Alta';
    qs('ticket-filter-priority').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(rowTickets()).toHaveLength(2);

    qs('ticket-filter-assignee').value = 'Técnico A';
    qs('ticket-filter-assignee').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(rowTickets()).toHaveLength(1);
    expect(qs('tickets-table').textContent).toContain('Alta de Ana');

    qs('ticket-filter-priority').value = '';
    qs('ticket-filter-priority').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(rowTickets()).toHaveLength(2);

    qs('ticket-sort').value = 'recent';
    qs('ticket-sort').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('ticket-clear-filters').click();
    expect(qs('ticket-filter-assignee').value).toBe('');
    expect(qs('ticket-sort').value).toBe('priority-sla');
    expect(qs('ticket-filter-announcer').textContent).toMatch(/Se muestran 3 tickets/);
    expect(qs('ticket-inbox-message').textContent).toMatch(/Filtros limpiados/);
  });

  it('sorts by priority+SLA, SLA and recency with stable tie-breakers', () => {
    const client = seedClient('Cliente Orden', 'CLI-O');
    const now = new Date('2026-11-28T12:00:00.000Z');
    seedTicket(client, {
      subject: 'Media reciente',
      priority: 'Media',
      options: { now: now.toISOString(), createdAt: new Date(now.getTime() - 1000).toISOString() }
    });
    seedTicket(client, {
      subject: 'Alta antigua',
      priority: 'Alta',
      options: { now: now.toISOString(), createdAt: new Date(now.getTime() - 7200000).toISOString() }
    });
    seedTicket(client, {
      subject: 'Baja',
      priority: 'Baja',
      options: { now: now.toISOString(), createdAt: new Date(now.getTime() - 5000).toISOString() }
    });

    openInbox();
    let rows = rowTickets();
    expect(rows[0].textContent).toContain('Alta antigua');
    expect(rows[1].textContent).toContain('Media reciente');
    expect(rows[2].textContent).toContain('Baja');

    qs('ticket-sort').value = 'recent';
    qs('ticket-sort').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    rows = rowTickets();
    expect(rows[0].textContent).toContain('Media reciente');
    expect(rows[2].textContent).toContain('Alta antigua');

    qs('ticket-sort').value = 'sla';
    qs('ticket-sort').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    rows = rowTickets();
    expect(rows[0].textContent).toContain('Alta antigua');
    expect(rows[1].textContent).toContain('Media reciente');
    expect(rows[2].textContent).toContain('Baja');
  });

  it('shows the two empty states and does not persist filters after reload', async () => {
    openInbox();
    expect(qs('tickets-table').textContent).toContain('No hay tickets registrados');
    expect(qs('tickets-table').querySelector('[data-reason="no-records"]')).not.toBeNull();

    const client = seedClient('Cliente Vacío', 'CLI-V');
    seedTicket(client, { priority: 'Alta' });
    openInbox();
    qs('ticket-filter-priority').value = 'Baja';
    qs('ticket-filter-priority').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('tickets-table').textContent).toContain('No hay tickets que coincidan con los filtros');
    expect(qs('tickets-table').querySelector('[data-reason="no-matches"]')).not.toBeNull();

    qs('ticket-filter-priority').value = 'Alta';
    qs('ticket-filter-priority').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const previous = snapshotStorage();
    dom.window.close();
    await startDom(previous);
    openInbox();
    expect(qs('ticket-filter-priority').value).toBe('');
    expect(qs('ticket-sort').value).toBe('priority-sla');
    expect(rowTickets()).toHaveLength(1);
  });

  it('opens the read-only detail from a row with click, Enter and Space', () => {
    const client = seedClient('Cliente Detalle', 'CLI-D');
    seedTicket(client, { subject: 'Detalle accesible', assignee: 'Técnico A' });
    openInbox();

    let row = rowTickets()[0];
    row.click();
    expect(qs('ticket-detail')).not.toBeNull();
    expect(qs('ticket-detail-folio').textContent).toMatch(/TKT-/);
    expect(qs('ticket-detail-subject').textContent).toBe('Detalle accesible');
    expect(qs('ticket-detail-assignee').textContent).toBe('Técnico A');
    expect(qs('ticket-detail-history').getAttribute('role')).toBe('list');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(qs('ticket-detail')).toBeNull();

    row = rowTickets()[0];
    row.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(qs('ticket-detail')).not.toBeNull();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    row = rowTickets()[0];
    row.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(qs('ticket-detail')).not.toBeNull();
  });
});
