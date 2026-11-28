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

function seedClient() {
  return storage.addEntity({
    name: 'Empresa CSAT',
    code: 'CLI-CSAT',
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
      productName: 'Compresor',
      reason: 'soporte',
      description: 'Descripción',
      priority: 'Alta',
      channel: 'Teléfono',
      ...overrides
    },
    overrides.options || {}
  );
}

function openDetail(ticketId) {
  qs('nav-tickets').click();
  qs('tickets-table').querySelector(`tr[data-ticket-id="${ticketId}"]`).click();
}

function confirmTop() {
  const buttons = [...document.querySelectorAll('#overlay-root [data-dialog-confirm]')];
  buttons[buttons.length - 1].click();
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US-32 — satisfacción del cliente', () => {
  it('registers CSAT while resolving and shows it in detail and client average', () => {
    const client = seedClient();
    const first = seedTicket(client, { subject: 'Primero' });
    const second = seedTicket(client, { subject: 'Segundo' });
    storage.changeTicketStatus(first.id, 'En proceso');
    storage.changeTicketStatus(second.id, 'En proceso');
    storage.resolveTicket(first.id, 'Solución uno', { satisfactionScore: 4, satisfactionComment: 'Muy bien' });
    storage.resolveTicket(second.id, 'Solución dos', { satisfactionScore: 2 });

    openDetail(first.id);
    expect(qs('ticket-detail-satisfaction').textContent).toContain('Nota: 4 / 5');
    expect(qs('ticket-detail-satisfaction').textContent).toContain('Muy bien');
    expect(qs('ticket-detail-satisfaction-action')).toBeNull();

    const input = qs('global-search-input');
    input.value = client.code;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    qs('search-results-list').querySelector('[data-open-entity]').click();
    expect(qs('entity-detail-body').textContent).toContain('Satisfacción promedio');
    expect(qs('entity-detail-body').textContent).toContain('3.0');
  });

  it('registers satisfaction later from a Resuelto ticket without changing status or dates', () => {
    const client = seedClient();
    const ticket = seedTicket(client);
    storage.changeTicketStatus(ticket.id, 'En proceso');
    const resolved = storage.resolveTicket(ticket.id, 'Solución');
    openDetail(ticket.id);
    expect(qs('ticket-detail-satisfaction').textContent).toContain('Sin satisfacción registrada');

    qs('ticket-detail-satisfaction-action').click();
    qs('ticket-satisfaction-score').value = '0';
    confirmTop();
    expect(qs('ticket-satisfaction-dialog-error').textContent).toMatch(/nota entera de 1 a 5/i);

    qs('ticket-satisfaction-score').value = '6';
    confirmTop();
    expect(qs('ticket-satisfaction-dialog-error').textContent).toMatch(/nota entera de 1 a 5/i);

    qs('ticket-satisfaction-score').value = '1.5';
    confirmTop();
    expect(qs('ticket-satisfaction-dialog-error').textContent).toMatch(/nota entera de 1 a 5/i);

    qs('ticket-satisfaction-score').value = '4';
    qs('ticket-satisfaction-comment').value = 'a'.repeat(501);
    confirmTop();
    expect(qs('ticket-satisfaction-dialog-error').textContent).toMatch(/500/);

    qs('ticket-satisfaction-comment').value = '  Atención clara  ';
    confirmTop();
    const saved = storage.loadTickets()[0];
    expect(saved.satisfactionScore).toBe(4);
    expect(saved.satisfactionComment).toBe('Atención clara');
    expect(saved.status).toBe('Resuelto');
    expect(saved.resolvedAt).toBe(resolved.resolvedAt);
    expect(saved.history.some((event) => event.type === 'satisfaccion')).toBe(true);
    expect(qs('ticket-detail-satisfaction').textContent).toContain('Nota: 4 / 5');
    expect(qs('ticket-detail-satisfaction-action')).toBeNull();
    expect(() => storage.registerSatisfaction(ticket.id, 5, '')).toThrow(/ya tiene/i);
  });

  it('keeps satisfaction read-only after closing the ticket', () => {
    const client = seedClient();
    const ticket = seedTicket(client);
    storage.changeTicketStatus(ticket.id, 'En proceso');
    storage.resolveTicket(ticket.id, 'Solución', { satisfactionScore: 5 });
    storage.closeTicket(ticket.id);
    openDetail(ticket.id);
    expect(qs('ticket-detail-satisfaction').textContent).toContain('Nota: 5 / 5');
    expect(qs('ticket-detail-satisfaction-action')).toBeNull();
    expect(() => storage.registerSatisfaction(ticket.id, 4, '')).toThrow(/Resuelto/i);
  });

  it('renders a malicious satisfaction comment as safe text', () => {
    const client = seedClient();
    const ticket = seedTicket(client);
    storage.changeTicketStatus(ticket.id, 'En proceso');
    storage.resolveTicket(ticket.id, 'Solución', {
      satisfactionScore: 4,
      satisfactionComment: '<img src=x onerror="window.__xss=1">'
    });
    openDetail(ticket.id);
    const body = qs('ticket-detail-satisfaction');
    expect(body.textContent).toContain('<img src=x onerror="window.__xss=1">');
    expect(body.querySelector('img')).toBeNull();
    expect(dom.window.__xss).toBeUndefined();
  });
});
