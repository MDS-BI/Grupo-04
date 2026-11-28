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

function fill(id, value) {
  const element = qs(id);
  element.value = value;
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
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

function seedClient() {
  return storage.addEntity({
    name: 'Empresa Soporte',
    code: 'CLI-SOP-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
}

function openClientDetail(client) {
  const input = qs('global-search-input');
  input.value = client.code;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  qs('search-results-list').querySelector('[data-open-entity]').click();
}

function addTicket(client, { equipment, priority = 'Alta' } = {}) {
  qs('entity-detail-body').querySelector('[data-new-ticket]').click();
  qs('ticket-entity').value = client.entity_id;
  fill('ticket-subject', 'Falla en el arranque');
  fill('ticket-product-name', 'Compresor industrial');
  if (equipment) fill('ticket-equipment', equipment);
  qs('ticket-reason').value = 'soporte';
  qs('ticket-priority').value = priority;
  qs('ticket-channel').value = 'Teléfono';
  fill('ticket-description', 'Falla en el arranque');
  submitForm('ticket-form');
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US11 — resolución de tickets', () => {
  it('exige resumen y conserva lo escrito cuando está vacío', () => {
    const client = seedClient();
    openClientDetail(client);
    addTicket(client, { equipment: 'EQ-001' });
    storage.changeTicketStatus(storage.loadTickets()[0].id, 'En proceso');
    openClientDetail(client);

    qs('ticket-list-items').querySelector('[data-resolve-ticket]').click();
    const input = qs('ticket-resolution-summary');
    expect(input).not.toBeNull();
    input.value = '   ';
    document.querySelector('[data-dialog-confirm]').click();

    expect(qs('ticket-resolve-dialog')).not.toBeNull();
    expect(document.querySelector('#ticket-resolve-dialog-error').textContent).toMatch(/obligatorio/i);
    expect(storage.loadTickets()[0].status).toBe('En proceso');
  });

  it('resuelve con resumen, distingue equipos y persiste tras recargar', async () => {
    const client = seedClient();
    openClientDetail(client);
    addTicket(client, { equipment: 'EQ-001' });
    addTicket(client, { equipment: 'EQ-002' });
    for (const ticket of storage.loadTickets()) storage.changeTicketStatus(ticket.id, 'En proceso');
    openClientDetail(client);

    const [first] = storage.loadTickets();
    const resolveButton = document.querySelector(`[data-resolve-ticket="${first.id}"]`);
    resolveButton.click();
    qs('ticket-resolution-summary').value = 'Se reemplazó el filtro EQ-001';
    document.querySelector('[data-dialog-confirm]').click();

    const resolved = storage.loadTickets().find((ticket) => ticket.id === first.id);
    expect(resolved.status).toBe('Resuelto');
    expect(resolved.resolutionSummary).toBe('Se reemplazó el filtro EQ-001');
    expect(resolved.resolvedAt).toBeTruthy();
    expect(qs('ticket-list-items').textContent).toContain('EQ-001');
    expect(qs('ticket-list-items').textContent).toContain('EQ-002');
    expect(qs('ticket-list-items').textContent).toContain('Se reemplazó el filtro EQ-001');

    const previous = snapshotStorage();
    dom.window.close();
    await startDom(previous);
    expect(storage.loadTickets().find((ticket) => ticket.id === first.id).status).toBe('Resuelto');

    const entity = storage.loadEntities()[0];
    openClientDetail(entity);
    expect(qs('ticket-list-items').textContent).toContain('Se reemplazó el filtro EQ-001');
  });

  it('muestra “Equipo no individualizado” cuando no hay referencia', () => {
    const client = seedClient();
    openClientDetail(client);
    addTicket(client);
    expect(qs('ticket-list-items').textContent).toContain('Equipo no individualizado');
  });

  it('conserva estado, solución y fecha al editar otros campos', () => {
    const client = seedClient();
    openClientDetail(client);
    addTicket(client, { equipment: 'EQ-010' });
    const ticket = storage.loadTickets()[0];
    storage.changeTicketStatus(ticket.id, 'En proceso');
    storage.resolveTicket(ticket.id, 'Solución original');

    openClientDetail(client);
    qs('ticket-list-items').querySelector('[data-edit-ticket]').click();
    fill('ticket-description', 'Descripción actualizada');
    submitForm('ticket-form');

    const updated = storage.loadTickets()[0];
    expect(updated.status).toBe('Resuelto');
    expect(updated.resolutionSummary).toBe('Solución original');
    expect(updated.description).toBe('Descripción actualizada');
    expect(updated.priority).toBe('Alta');
  });
});
