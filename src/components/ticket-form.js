import { getConfig } from '../module-config.js';

function qs(id) {
  return document.getElementById(id);
}

function fillCatalog(select, options) {
  if (!select) return;
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  select.appendChild(blank);
  for (const option of options || []) {
    const node = document.createElement('option');
    node.value = option;
    node.textContent = option;
    select.appendChild(node);
  }
}

/** Carga motivos y prioridades declarados en ModuleConfig. */
export function prepareTicketForm() {
  const catalogs = getConfig().catalogs || {};
  fillCatalog(qs('ticket-reason'), catalogs.reason);
  fillCatalog(qs('ticket-priority'), catalogs.priority);
}

function setStatusDisplay(status) {
  const display = qs('ticket-status-display');
  if (display) {
    display.textContent =
      status === 'Resuelto'
        ? 'Estado: Resuelto (no editable en esta edición)'
        : 'Estado: En proceso (se fija al crear el ticket)';
  }
  const hidden = qs('ticket-status');
  if (hidden) hidden.value = status || 'En proceso';
}

export function clearTicketForm() {
  if (!qs('ticket-form')) return;
  qs('ticket-id').value = '';
  qs('ticket-product-id').value = '';
  qs('ticket-product-name').value = '';
  if (qs('ticket-equipment')) qs('ticket-equipment').value = '';
  if (qs('ticket-reason')) qs('ticket-reason').value = '';
  qs('ticket-description').value = '';
  if (qs('ticket-priority')) qs('ticket-priority').value = '';
  setStatusDisplay('En proceso');
  clearTicketErrors();
  qs('ticket-cancel-edit').hidden = true;
  qs('ticket-submit').textContent = 'Registrar ticket';
  const message = qs('ticket-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

export function startTicketEdit(ticket) {
  qs('ticket-id').value = ticket.id;
  if (qs('ticket-entity')) qs('ticket-entity').value = ticket.entity_id || '';
  qs('ticket-product-id').value = ticket.productId || '';
  qs('ticket-product-name').value = ticket.productName || '';
  if (qs('ticket-equipment')) qs('ticket-equipment').value = ticket.equipmentReference || '';
  if (qs('ticket-reason')) qs('ticket-reason').value = ticket.reason || '';
  qs('ticket-description').value = ticket.description || '';
  if (qs('ticket-priority')) qs('ticket-priority').value = ticket.priority || '';
  setStatusDisplay(ticket.status || 'En proceso');
  clearTicketErrors();
  qs('ticket-cancel-edit').hidden = false;
  qs('ticket-submit').textContent = 'Actualizar ticket';
  const message = qs('ticket-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

export function collectTicketPayload() {
  return {
    entityId: qs('ticket-entity') ? qs('ticket-entity').value : '',
    productId: qs('ticket-product-id').value,
    productName: qs('ticket-product-name').value,
    equipmentReference: qs('ticket-equipment') ? qs('ticket-equipment').value : '',
    reason: qs('ticket-reason') ? qs('ticket-reason').value : '',
    description: qs('ticket-description').value,
    priority: qs('ticket-priority') ? qs('ticket-priority').value : '',
    status: qs('ticket-status') ? qs('ticket-status').value : 'En proceso'
  };
}

const TICKET_CONTROLS = [
  ['entityId', 'ticket-entity', 'error-ticket-entity'],
  ['productName', 'ticket-product-name', 'error-ticket-product'],
  ['reason', 'ticket-reason', 'error-ticket-reason'],
  ['description', 'ticket-description', 'error-ticket-description'],
  ['priority', 'ticket-priority', 'error-ticket-priority']
];

export function clearTicketErrors() {
  for (const [, inputId, errorId] of TICKET_CONTROLS) {
    const error = qs(errorId);
    if (error) error.textContent = '';
    const input = qs(inputId);
    if (input) input.removeAttribute('aria-invalid');
  }
}

export function showTicketErrors(errors = {}) {
  const messages = {
    entityId: errors.entityId || '',
    productName: errors.productName || errors.productId || '',
    reason: errors.reason || '',
    description: errors.description || '',
    priority: errors.priority || ''
  };
  for (const [key, inputId, errorId] of TICKET_CONTROLS) {
    const message = messages[key];
    const error = qs(errorId);
    if (error) error.textContent = message;
    const input = qs(inputId);
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
}
