import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles.css'), 'utf8');

let dom;
let storage;

function qs(id) {
  return document.getElementById(id);
}

function pressEscape() {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

function drawer() {
  return document.querySelector('#overlay-root [role="dialog"][data-variant="drawer"]');
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
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
  const button = qs('search-results-list').querySelector('[data-open-entity]');
  button.click();
}

function fillTicket(overrides = {}) {
  if (overrides.entityId !== undefined) qs('ticket-entity').value = overrides.entityId;
  qs('ticket-subject').value = overrides.subject ?? 'Compresor no arranca';
  qs('ticket-product-name').value = overrides.productName ?? 'Compresor industrial';
  qs('ticket-reason').value = overrides.reason ?? 'soporte';
  qs('ticket-description').value = overrides.description ?? 'Falla en el arranque';
  qs('ticket-priority').value = overrides.priority ?? 'Alta';
  qs('ticket-channel').value = overrides.channel ?? 'Teléfono';
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US3 — tickets de soporte', () => {
  it('registers a ticket linked to a client and shows it as En proceso', () => {
    const client = seedClient();
    openClientDetail(client);

    expect(qs('ticket-section').hidden).toBe(false);
    fillTicket({ entityId: client.entity_id });
    submitForm('ticket-form');

    const tickets = storage.loadTickets();
    expect(tickets.length).toBe(1);
    expect(tickets[0].entity_id).toBe(client.entity_id);
    expect(tickets[0].status).toBe('Nuevo');
    expect(tickets[0].subject).toBe('Compresor no arranca');
    expect(tickets[0].folio).toMatch(/^TKT-\d{4}-\d{4}$/);
    expect(tickets[0].channel).toBe('Teléfono');
    expect(tickets[0].reason).toBe('soporte');
    expect(tickets[0].priority).toBe('Alta');
    expect(tickets[0].productName).toBe('Compresor industrial');

    const list = qs('ticket-list-items');
    expect(list.textContent).toContain('soporte');
    expect(list.textContent).toContain('Alta');
    expect(list.textContent).toContain('Nuevo');
    expect(list.textContent).toMatch(/Fecha: \d{4}-\d{2}-\d{2}/);
    expect(qs('ticket-list-empty').hidden).toBe(true);
    expect(qs('ticket-message').textContent).toMatch(/registrado/i);
  });

  it('rejects a ticket without client or product and keeps the entered data', () => {
    const client = seedClient();
    openClientDetail(client);

    fillTicket({ entityId: client.entity_id, productName: '' });
    submitForm('ticket-form');

    expect(qs('error-ticket-product').textContent).toMatch(/producto/i);
    expect(storage.loadTickets().length).toBe(0);

    fillTicket({ entityId: '', productName: 'Compresor industrial' });
    submitForm('ticket-form');

    expect(qs('error-ticket-entity').textContent).toMatch(/cliente/i);
    expect(storage.loadTickets().length).toBe(0);
    expect(qs('ticket-description').value).toBe('Falla en el arranque');
  });

  it('rejects a priority outside Alta, Media or Baja', () => {
    const client = seedClient();
    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });

    const urgent = document.createElement('option');
    urgent.value = 'Urgente';
    urgent.textContent = 'Urgente';
    qs('ticket-priority').appendChild(urgent);
    qs('ticket-priority').value = 'Urgente';
    submitForm('ticket-form');

    expect(qs('error-ticket-priority').textContent).toMatch(/prioridad/i);
    expect(storage.loadTickets().length).toBe(0);
    expect(() =>
      storage.addTicket({
        entityId: client.entity_id,
        subject: 'Compresor',
        productName: 'Compresor',
        reason: 'soporte',
        description: 'Falla',
        priority: 'Urgente',
        channel: 'Teléfono'
      })
    ).toThrow(/prioridad/i);
  });

  it('moves En proceso → Resuelto and rejects reopening the ticket', () => {
    const client = seedClient();
    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    submitForm('ticket-form');

    const created = storage.loadTickets()[0];
    storage.changeTicketStatus(created.id, 'En proceso');
    openClientDetail(client);
    const resolve = qs('ticket-list-items').querySelector('[data-resolve-ticket]');
    expect(resolve).not.toBeNull();
    resolve.click();

    const dialogInput = document.getElementById('ticket-resolution-summary');
    expect(dialogInput).not.toBeNull();
    dialogInput.value = 'Se reemplazó el filtro';
    document.querySelector('[data-dialog-confirm]').click();

    const resolved = storage.loadTickets()[0];
    expect(resolved.status).toBe('Resuelto');
    expect(resolved.resolutionSummary).toBe('Se reemplazó el filtro');
    expect(resolved.resolvedAt).toBeTruthy();
    expect(qs('ticket-list-items').textContent).toContain('Resuelto');
    expect(qs('ticket-inbox-message').textContent).toMatch(/resuelto/i);

    expect(() => storage.updateTicket(created.id, { status: 'En proceso' })).toThrow(/reabr|transici/i);
    expect(storage.loadTickets()[0].status).toBe('Resuelto');
  });

  it('edits description of a resolved ticket without changing its status or frozen priority', () => {
    const client = seedClient();
    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    submitForm('ticket-form');
    const created = storage.loadTickets()[0];
    storage.changeTicketStatus(created.id, 'En proceso');
    storage.resolveTicket(created.id, 'Se reemplazó el filtro');

    openClientDetail(client);
    qs('ticket-list-items').querySelector('[data-edit-ticket]').click();

    expect(qs('ticket-id').value).toBe(created.id);
    expect(qs('ticket-status-display').textContent).toContain('Resuelto');
    expect(qs('ticket-folio').value).toBe(created.folio);
    expect(qs('ticket-description').value).toBe('Falla en el arranque');
    expect(document.querySelector('#ticket-form select#ticket-status')).toBeNull();

    qs('ticket-description').value = 'Se limpió el filtro';
    submitForm('ticket-form');

    const updated = storage.loadTickets()[0];
    expect(updated.id).toBe(created.id);
    expect(updated.entity_id).toBe(created.entity_id);
    expect(updated.status).toBe('Resuelto');
    expect(updated.description).toBe('Se limpió el filtro');
    expect(updated.priority).toBe('Alta');
  });

  it('rejects changing the priority of a resolved ticket from the form', () => {
    const client = seedClient();
    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    submitForm('ticket-form');
    const created = storage.loadTickets()[0];
    storage.changeTicketStatus(created.id, 'En proceso');
    storage.resolveTicket(created.id, 'Solución');

    openClientDetail(client);
    qs('ticket-list-items').querySelector('[data-edit-ticket]').click();
    qs('ticket-priority').value = 'Media';
    submitForm('ticket-form');

    expect(storage.loadTickets()[0].priority).toBe('Alta');
    expect(qs('ticket-message').textContent).toMatch(/congelada/i);
  });

  it('shows the client tickets on the client detail card', () => {
    const client = seedClient();
    storage.addTicket({
      entityId: client.entity_id,
      subject: 'Ruido anormal',
      productName: 'Compresor industrial',
      reason: 'reclamo',
      description: 'Ruido anormal',
      priority: 'Media',
      channel: 'Teléfono'
    });

    openClientDetail(client);

    expect(qs('entity-detail').hidden).toBe(false);
    expect(qs('ticket-section').hidden).toBe(false);
    expect(qs('ticket-list-items').textContent).toContain('Ruido anormal');
    expect(qs('ticket-list-items').textContent).toContain('reclamo');
    expect(qs('ticket-list-items').textContent).toContain('Media');
  });

  it('deletes the client tickets in cascade after confirmation', () => {
    const client = seedClient();
    const other = seedClient({ name: 'Empresa Demo 2', code: 'CLI-DEMO-004' });
    storage.addTicket({
      entityId: client.entity_id,
      subject: 'Falla 1',
      productName: 'Compresor',
      reason: 'soporte',
      description: 'Falla 1',
      priority: 'Alta',
      channel: 'Teléfono'
    });
    storage.addTicket({
      entityId: client.entity_id,
      subject: 'Duda 2',
      productName: 'Bomba',
      reason: 'consulta',
      description: 'Duda 2',
      priority: 'Baja',
      channel: 'Correo'
    });
    storage.addTicket({
      entityId: other.entity_id,
      subject: 'Ruido 3',
      productName: 'Compresor',
      reason: 'reclamo',
      description: 'Ruido 3',
      priority: 'Media',
      channel: 'Portal'
    });

    qs('nav-entities').click();
    const select = qs('edit-entity');
    select.value = client.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(globalThis.confirm.mock.calls[0][0]).toMatch(/2 tickets/i);
    expect(storage.loadTickets().length).toBe(1);
    expect(storage.loadTickets()[0].entity_id).toBe(other.entity_id);
  });

  it('keeps the tickets and their status after reloading the application', async () => {
    const client = seedClient();
    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    submitForm('ticket-form');
    storage.changeTicketStatus(storage.loadTickets()[0].id, 'En proceso');
    storage.resolveTicket(storage.loadTickets()[0].id, 'Se reemplazó el filtro');

    const previous = snapshotStorage();
    dom.window.close();
    await startDom(previous);

    const reloaded = storage.loadEntities()[0];
    openClientDetail(reloaded);

    const tickets = storage.loadTickets();
    expect(tickets.length).toBe(1);
    expect(tickets[0].status).toBe('Resuelto');
    expect(qs('ticket-list-items').textContent).toContain('Resuelto');
  });

  it('abre el drawer de ticket con el cliente preseleccionado desde el detalle en dos columnas', () => {
    const client = seedClient();
    openClientDetail(client);

    const summary = qs('entity-detail-body').querySelector('.detail-grid');
    expect(summary).not.toBeNull();
    expect(summary.querySelectorAll('dt').length).toBeGreaterThan(3);
    expect(css).toMatch(/\.detail-grid\s*\{[^}]*grid-template-columns:\s*minmax\([^)]*\)\s+minmax\(/);

    const action = qs('entity-detail-body').querySelector('[data-new-ticket]');
    expect(action).not.toBeNull();
    action.focus();
    action.click();

    const panel = drawer();
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.querySelector('#ticket-form')).not.toBeNull();
    expect(qs('ticket-entity').value).toBe(client.entity_id);
    expect(panel.contains(document.activeElement)).toBe(true);

    pressEscape();

    expect(drawer()).toBeNull();
    expect(qs('entity-detail').hidden).toBe(false);
    expect(qs('ticket-section').hidden).toBe(false);
    expect(qs('ticket-form').parentElement).toBe(qs('ticket-section'));
  });

  it('abre la edición de un ticket en el drawer y apila el modal de descarte', () => {
    const client = seedClient();
    storage.addTicket({
      entityId: client.entity_id,
      subject: 'Falla en el arranque',
      productName: 'Compresor industrial',
      reason: 'soporte',
      description: 'Falla en el arranque',
      priority: 'Alta',
      channel: 'Teléfono'
    });
    openClientDetail(client);

    qs('ticket-list-items').querySelector('[data-edit-ticket]').click();

    const panel = drawer();
    expect(panel).not.toBeNull();
    expect(panel.querySelector('#ticket-form')).not.toBeNull();
    expect(qs('ticket-id').value).toBe(storage.loadTickets()[0].id);

    qs('ticket-description').value = 'Cambio sin guardar';
    qs('ticket-description').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    pressEscape();

    const confirm = qs('confirm-discard');
    expect(confirm).not.toBeNull();
    expect(confirm.querySelector('[data-cancel-discard]').textContent).toBe('Seguir editando');
    confirm.querySelector('[data-cancel-discard]').click();

    expect(drawer()).not.toBeNull();
    expect(qs('ticket-description').value).toBe('Cambio sin guardar');
    expect(panel.contains(document.activeElement)).toBe(true);

    pressEscape();
    qs('confirm-discard').querySelector('[data-confirm-discard]').click();

    expect(drawer()).toBeNull();
    expect(storage.loadTickets()[0].description).toBe('Falla en el arranque');
  });

  it('requires a subject, trims it and limits it to 120 characters', () => {
    const client = seedClient();
    openClientDetail(client);

    fillTicket({ entityId: client.entity_id, subject: '' });
    submitForm('ticket-form');
    expect(qs('error-ticket-subject').textContent).toMatch(/asunto/i);
    expect(storage.loadTickets()).toHaveLength(0);
    expect(qs('ticket-product-name').value).toBe('Compresor industrial');

    fillTicket({ entityId: client.entity_id, subject: 'a'.repeat(121) });
    submitForm('ticket-form');
    expect(qs('error-ticket-subject').textContent).toMatch(/120/);
    expect(storage.loadTickets()).toHaveLength(0);

    fillTicket({ entityId: client.entity_id, subject: '  Compresor sin arranque  ' });
    submitForm('ticket-form');
    expect(storage.loadTickets()[0].subject).toBe('Compresor sin arranque');
    expect(qs('ticket-list-items').textContent).toContain('TKT-');
  });

  it('shows the folio as read-only and rejects direct folio changes', () => {
    const client = seedClient();
    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    submitForm('ticket-form');
    const created = storage.loadTickets()[0];

    openClientDetail(client);
    qs('ticket-list-items').querySelector('[data-edit-ticket]').click();
    expect(qs('ticket-folio').value).toBe(created.folio);
    expect(qs('ticket-folio').readOnly).toBe(true);
    expect(qs('ticket-folio').hasAttribute('readonly')).toBe(true);
    pressEscape();
    if (qs('confirm-discard')) qs('confirm-discard').querySelector('[data-confirm-discard]').click();

    expect(() => storage.updateTicket(created.id, { folio: 'TKT-1999-0001' })).toThrow(/folio/i);
    expect(storage.loadTickets()[0].folio).toBe(created.folio);
  });

  it('limits contacts to the client, copies the requester backup and clears it when changing client', () => {
    const client = seedClient();
    seedClient({ name: 'Empresa Demo 2', code: 'CLI-DEMO-004' });
    const contact = storage.addContact({
      entityId: client.entity_id,
      name: 'María Pérez',
      role: 'Compras',
      email: 'maria@example.com',
      phone: '+56 9 1234 5678',
      isPrimary: true
    });
    const otherContact = storage.addContact({
      entityId: storage.loadEntities().find((entity) => entity.code === 'CLI-DEMO-004').entity_id,
      name: 'Otro Contacto',
      isPrimary: true
    });

    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    const options = [...qs('ticket-contact').options].map((option) => option.value);
    expect(options).toContain(contact.id);
    expect(options).not.toContain(otherContact.id);

    qs('ticket-contact').value = contact.id;
    qs('ticket-contact').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('ticket-requester-name').value).toBe('María Pérez');
    expect(qs('ticket-requester-email').value).toBe('maria@example.com');
    expect(qs('ticket-requester-phone').value).toBe('+56 9 1234 5678');
    submitForm('ticket-form');

    const saved = storage.loadTickets()[0];
    expect(saved.contactId).toBe(contact.id);
    expect(saved.requesterName).toBe('María Pérez');
    expect(saved.requesterEmail).toBe('maria@example.com');
    expect(() => storage.addTicket({ ...saved, contactId: otherContact.id, folio: undefined })).toThrow(/contacto/i);

    openClientDetail(client);
    fillTicket({ entityId: client.entity_id });
    qs('ticket-entity').value = 'cli_otro';
    qs('ticket-entity').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('ticket-requester-name').value).toBe('');
    expect([...qs('ticket-contact').options].some((option) => option.value === contact.id)).toBe(false);
  });

  it('stores channel, assignee, team, warranty and source document and shows their labels', () => {
    const client = seedClient();
    const document_ = storage.addDocument({
      entityId: client.entity_id,
      folio: 3001,
      opportunityTitle: 'Venta del compresor',
      startDate: '2026-11-02',
      endDate: '2026-11-30',
      totalAmount: 1000,
      opportunityOwner: 'Ejecutivo A'
    });

    openClientDetail(client);
    fillTicket({ entityId: client.entity_id, channel: 'WhatsApp' });
    qs('ticket-assignee').value = 'Técnico B';
    qs('ticket-team').value = 'Terreno';
    qs('ticket-warranty').value = '2027-12-31';
    qs('ticket-document').value = document_.id;
    submitForm('ticket-form');

    const saved = storage.loadTickets()[0];
    expect(saved.channel).toBe('WhatsApp');
    expect(saved.assignee).toBe('Técnico B');
    expect(saved.team).toBe('Terreno');
    expect(saved.warrantyEndsAt).toBe('2027-12-31');
    expect(saved.documentId).toBe(document_.id);

    qs('ticket-list-items').querySelector('[data-open-ticket]').click();
    expect(qs('ticket-detail-channel').textContent).toBe('WhatsApp');
    expect(qs('ticket-detail-assignee').textContent).toBe('Técnico B');
    expect(qs('ticket-detail-team').textContent).toBe('Terreno');
    expect(qs('ticket-detail-warranty').textContent).toBe('En garantía');
    expect(qs('ticket-detail-document').textContent).toContain('Venta del compresor');
    pressEscape();

    storage.deleteDocument(document_.id);
    qs('ticket-list-items').querySelector('[data-open-ticket]').click();
    expect(qs('ticket-detail-document').textContent).toBe('Venta de origen no disponible');
  });
});
