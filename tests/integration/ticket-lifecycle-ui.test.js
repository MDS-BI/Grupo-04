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

function seedClient() {
  return storage.addEntity({
    name: 'Empresa Ciclo',
    code: 'CLI-CICLO',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
}

function createTicketFromInbox(client, overrides = {}) {
  qs('nav-tickets').click();
  qs('new-ticket-inbox').click();
  qs('ticket-entity').value = client.entity_id;
  qs('ticket-subject').value = overrides.subject || 'Falla del compresor';
  qs('ticket-product-name').value = 'Compresor industrial';
  qs('ticket-reason').value = 'soporte';
  qs('ticket-priority').value = overrides.priority || 'Alta';
  qs('ticket-channel').value = 'Teléfono';
  qs('ticket-description').value = 'El equipo no arranca';
  submitForm('ticket-form');
  return storage.loadTickets().find((ticket) => ticket.subject === (overrides.subject || 'Falla del compresor'));
}

function openDetail(ticketId) {
  const row = qs('tickets-table').querySelector(`tr[data-ticket-id="${ticketId}"]`);
  expect(row).not.toBeNull();
  row.click();
  expect(qs('ticket-detail')).not.toBeNull();
}

function confirmTop() {
  const buttons = [...document.querySelectorAll('#overlay-root [data-dialog-confirm]')];
  const button = buttons[buttons.length - 1];
  expect(button).toBeTruthy();
  button.click();
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US-28 — ciclo de vida y cierre en la interfaz', () => {
  it('creates a Nuevo ticket with folio and records the first response when moving to En proceso', () => {
    const client = seedClient();
    const ticket = createTicketFromInbox(client);
    expect(ticket.status).toBe('Nuevo');
    expect(ticket.folio).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(ticket.history[0].type).toBe('creacion');
    expect(qs('ticket-inbox-message').textContent).toMatch(/registrado/i);

    openDetail(ticket.id);
    expect(qs('ticket-detail-status').textContent).toBe('Nuevo');
    expect(qs('ticket-detail-first-response').textContent).toBe('Sin datos');
    expect(qs('ticket-detail-resolve')).toBeNull();

    qs('ticket-detail-change-status').click();
    qs('ticket-status-target').value = 'En proceso';
    confirmTop();

    const updated = storage.loadTickets()[0];
    expect(updated.status).toBe('En proceso');
    expect(updated.firstResponseAt).toBeTruthy();
    expect(updated.history.some((event) => event.type === 'estado')).toBe(true);
    expect(qs('ticket-detail-status').textContent).toBe('En proceso');
    expect(qs('ticket-detail-first-response').textContent).not.toBe('Sin datos');
  });

  it('moves to En espera with a note, resumes, resolves and closes in order', () => {
    const client = seedClient();
    const ticket = createTicketFromInbox(client);
    storage.changeTicketStatus(ticket.id, 'En proceso');
    openDetail(ticket.id);

    qs('ticket-detail-change-status').click();
    qs('ticket-status-target').value = 'En espera';
    qs('ticket-status-target').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('ticket-status-note-wrapper').hidden).toBe(false);
    qs('ticket-status-note').value = 'Esperando repuesto';
    confirmTop();
    let current = storage.loadTickets()[0];
    expect(current.status).toBe('En espera');
    expect(current.history.some((event) => event.note === 'Esperando repuesto')).toBe(true);

    qs('ticket-detail-change-status').click();
    qs('ticket-status-target').value = 'En proceso';
    confirmTop();
    expect(storage.loadTickets()[0].status).toBe('En proceso');

    qs('ticket-detail-resolve').click();
    qs('ticket-resolution-summary').value = 'Se reemplazó el fusible';
    confirmTop();
    current = storage.loadTickets()[0];
    expect(current.status).toBe('Resuelto');
    expect(current.resolutionSummary).toBe('Se reemplazó el fusible');
    expect(current.resolvedAt).toBeTruthy();
    expect(qs('ticket-detail-resolution').textContent).toBe('Se reemplazó el fusible');
    expect(qs('ticket-detail-resolved-at').textContent).not.toBe('Sin datos');

    qs('ticket-detail-close').click();
    const confirm = qs('ticket-close-confirm');
    expect(confirm).not.toBeNull();
    expect(confirm.textContent).toContain('terminal');
    confirm.querySelector('[data-dialog-confirm]').click();
    current = storage.loadTickets()[0];
    expect(current.status).toBe('Cerrado');
    expect(current.closedAt).toBeTruthy();
    expect(qs('ticket-detail-closed-at').textContent).not.toBe('Sin datos');
    expect(qs('ticket-detail-edit')).toBeNull();
    expect(qs('ticket-detail-change-status')).toBeNull();
    expect(qs('ticket-detail-delete')).not.toBeNull();
  });

  it('rejects every invalid transition in storage and does not offer Resolver for Nuevo', () => {
    const client = seedClient();
    const ticket = createTicketFromInbox(client);
    openDetail(ticket.id);
    expect(qs('ticket-detail-resolve')).toBeNull();

    expect(() => storage.changeTicketStatus(ticket.id, 'Resuelto', { resolutionSummary: 'x' })).toThrow(/transición/i);
    expect(() => storage.changeTicketStatus(ticket.id, 'Cerrado')).toThrow(/transición/i);

    storage.changeTicketStatus(ticket.id, 'En proceso');
    storage.changeTicketStatus(ticket.id, 'En espera');
    expect(() => storage.changeTicketStatus(ticket.id, 'Nuevo')).toThrow(/transición/i);
    storage.changeTicketStatus(ticket.id, 'Resuelto', { resolutionSummary: 'Hecho' });
    expect(() => storage.changeTicketStatus(ticket.id, 'En proceso')).toThrow(/transición/i);
    storage.closeTicket(ticket.id);
    expect(() => storage.changeTicketStatus(ticket.id, 'Resuelto')).toThrow(/transición|cerrado/i);
    expect(() => storage.updateTicket(ticket.id, { description: 'Cambio' })).toThrow(/cerrado/i);
  });

  it('deletes one ticket with confirmation and keeps the client and other tickets', () => {
    const client = seedClient();
    const first = createTicketFromInbox(client, { subject: 'Primero' });
    createTicketFromInbox(client, { subject: 'Segundo', priority: 'Baja' });
    expect(storage.loadTickets()).toHaveLength(2);

    openDetail(first.id);
    qs('ticket-detail-delete').click();
    const confirm = qs('ticket-delete-confirm');
    expect(confirm.textContent).toContain(first.folio);
    expect(confirm.textContent).toContain('Primero');
    expect(confirm.textContent).toContain('cliente');
    confirm.querySelector('[data-dialog-cancel]').click();
    expect(storage.loadTickets()).toHaveLength(2);

    qs('ticket-detail-delete').click();
    qs('ticket-delete-confirm').querySelector('[data-dialog-confirm]').click();

    const left = storage.loadTickets();
    expect(left).toHaveLength(1);
    expect(left[0].subject).toBe('Segundo');
    expect(storage.loadEntities().some((entity) => entity.entity_id === client.entity_id)).toBe(true);
    expect(qs('ticket-detail')).toBeNull();
    expect(qs('ticket-inbox-message').textContent).toMatch(/eliminado/i);
  });
});
