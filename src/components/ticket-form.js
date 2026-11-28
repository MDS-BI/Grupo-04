import { getConfig } from '../module-config.js';

function qs(id) {
  return document.getElementById(id);
}

function fillCatalog(select, options, blankLabel = '--') {
  if (!select) return;
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = blankLabel;
  select.appendChild(blank);
  for (const option of options || []) {
    const node = document.createElement('option');
    node.value = option;
    node.textContent = option;
    select.appendChild(node);
  }
}

/** Carga los catálogos del ticket declarados en ModuleConfig. */
export function prepareTicketForm() {
  const catalogs = getConfig().catalogs || {};
  fillCatalog(qs('ticket-reason'), catalogs.reason);
  fillCatalog(qs('ticket-priority'), catalogs.priority);
  fillCatalog(qs('ticket-channel'), catalogs.channel);
  fillCatalog(qs('ticket-assignee'), catalogs.assignee, 'Sin asignar');
  fillCatalog(qs('ticket-team'), catalogs.team, 'Sin asignar');
}

/** Contactos del cliente seleccionado; siempre incluye “Sin contacto”. */
export function populateTicketContacts(entityId, selectedId) {
  const select = qs('ticket-contact');
  if (!select) return;
  const previous = selectedId !== undefined ? selectedId : select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'Sin contacto';
  select.appendChild(none);
  for (const contact of contactsFor(entityId)) {
    const option = document.createElement('option');
    option.value = contact.id;
    option.textContent = contact.role ? `${contact.name} — ${contact.role}` : contact.name;
    select.appendChild(option);
  }
  if (previous && [...select.options].some((option) => option.value === previous)) select.value = previous;
}

let cachedContacts = [];

/** Cachea los contactos cargados por `app.js` para no leer el almacenamiento aquí. */
export function setTicketFormContacts(contacts = []) {
  cachedContacts = Array.isArray(contacts) ? contacts : [];
}

function contactsFor(entityId) {
  return cachedContacts.filter((contact) => contact && contact.entity_id === entityId);
}

/** Oportunidades del cliente; siempre incluye “Sin vínculo”. */
export function populateTicketDocuments(entityId, sourceDocuments = [], selectedId) {
  const select = qs('ticket-document');
  if (!select) return;
  const previous = selectedId !== undefined ? selectedId : select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'Sin vínculo';
  select.appendChild(none);
  for (const document_ of sourceDocuments.filter((item) => item && item.entity_id === entityId)) {
    const option = document.createElement('option');
    option.value = document_.id;
    option.textContent = `${document_.series || 'OPP'}-${document_.folio} · ${document_.opportunityTitle || 'Sin asunto'}`;
    select.appendChild(option);
  }
  if (previous && [...select.options].some((option) => option.value === previous)) select.value = previous;
}

/** Copia el respaldo del solicitante desde el contacto elegido. */
export function fillRequesterFromContact(contact) {
  if (!contact) return;
  if (qs('ticket-requester-name')) qs('ticket-requester-name').value = contact.name || '';
  if (qs('ticket-requester-email')) qs('ticket-requester-email').value = contact.email || '';
  if (qs('ticket-requester-phone')) qs('ticket-requester-phone').value = contact.phone || '';
}

const STATUS_TEXT = {
  Nuevo: 'Estado: Nuevo (se fija al crear el ticket)',
  'En proceso': 'Estado: En proceso (se cambia desde el detalle del ticket)',
  'En espera': 'Estado: En espera (se cambia desde el detalle del ticket)',
  Resuelto: 'Estado: Resuelto (solo se editan campos descriptivos)',
  Cerrado: 'Estado: Cerrado (solo lectura)'
};

function setStatusDisplay(status) {
  const display = qs('ticket-status-display');
  if (display) display.textContent = STATUS_TEXT[status] || STATUS_TEXT.Nuevo;
  const hidden = qs('ticket-status');
  if (hidden) hidden.value = status || 'Nuevo';
}

export function clearTicketForm() {
  if (!qs('ticket-form')) return;
  qs('ticket-id').value = '';
  if (qs('ticket-folio')) qs('ticket-folio').value = '';
  if (qs('ticket-subject')) qs('ticket-subject').value = '';
  qs('ticket-product-id').value = '';
  qs('ticket-product-name').value = '';
  if (qs('ticket-equipment')) qs('ticket-equipment').value = '';
  if (qs('ticket-warranty')) qs('ticket-warranty').value = '';
  if (qs('ticket-reason')) qs('ticket-reason').value = '';
  qs('ticket-description').value = '';
  if (qs('ticket-priority')) qs('ticket-priority').value = '';
  if (qs('ticket-channel')) qs('ticket-channel').value = '';
  if (qs('ticket-contact')) qs('ticket-contact').value = '';
  if (qs('ticket-requester-name')) qs('ticket-requester-name').value = '';
  if (qs('ticket-requester-email')) qs('ticket-requester-email').value = '';
  if (qs('ticket-requester-phone')) qs('ticket-requester-phone').value = '';
  if (qs('ticket-assignee')) qs('ticket-assignee').value = '';
  if (qs('ticket-team')) qs('ticket-team').value = '';
  if (qs('ticket-document')) qs('ticket-document').value = '';
  setStatusDisplay('Nuevo');
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
  if (qs('ticket-folio')) qs('ticket-folio').value = ticket.folio || '';
  if (qs('ticket-subject')) qs('ticket-subject').value = ticket.subject || '';
  qs('ticket-product-id').value = ticket.productId || '';
  qs('ticket-product-name').value = ticket.productName || '';
  if (qs('ticket-equipment')) qs('ticket-equipment').value = ticket.equipmentReference || '';
  if (qs('ticket-warranty')) qs('ticket-warranty').value = ticket.warrantyEndsAt || '';
  if (qs('ticket-reason')) qs('ticket-reason').value = ticket.reason || '';
  qs('ticket-description').value = ticket.description || '';
  if (qs('ticket-priority')) qs('ticket-priority').value = ticket.priority || '';
  if (qs('ticket-channel')) qs('ticket-channel').value = ticket.channel || '';
  if (qs('ticket-contact')) qs('ticket-contact').value = ticket.contactId || '';
  if (qs('ticket-requester-name')) qs('ticket-requester-name').value = ticket.requesterName || '';
  if (qs('ticket-requester-email')) qs('ticket-requester-email').value = ticket.requesterEmail || '';
  if (qs('ticket-requester-phone')) qs('ticket-requester-phone').value = ticket.requesterPhone || '';
  if (qs('ticket-assignee')) qs('ticket-assignee').value = ticket.assignee || '';
  if (qs('ticket-team')) qs('ticket-team').value = ticket.team || '';
  if (qs('ticket-document')) qs('ticket-document').value = ticket.documentId || '';
  setStatusDisplay(ticket.status || 'Nuevo');
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
    subject: qs('ticket-subject') ? qs('ticket-subject').value : '',
    productId: qs('ticket-product-id').value,
    productName: qs('ticket-product-name').value,
    equipmentReference: qs('ticket-equipment') ? qs('ticket-equipment').value : '',
    warrantyEndsAt: qs('ticket-warranty') ? qs('ticket-warranty').value : '',
    reason: qs('ticket-reason') ? qs('ticket-reason').value : '',
    description: qs('ticket-description').value,
    priority: qs('ticket-priority') ? qs('ticket-priority').value : '',
    channel: qs('ticket-channel') ? qs('ticket-channel').value : '',
    contactId: qs('ticket-contact') ? qs('ticket-contact').value : '',
    requesterName: qs('ticket-requester-name') ? qs('ticket-requester-name').value : '',
    requesterEmail: qs('ticket-requester-email') ? qs('ticket-requester-email').value : '',
    requesterPhone: qs('ticket-requester-phone') ? qs('ticket-requester-phone').value : '',
    assignee: qs('ticket-assignee') ? qs('ticket-assignee').value : '',
    team: qs('ticket-team') ? qs('ticket-team').value : '',
    documentId: qs('ticket-document') ? qs('ticket-document').value : '',
    status: qs('ticket-status') ? qs('ticket-status').value : 'Nuevo'
  };
}

const TICKET_CONTROLS = [
  ['entityId', 'ticket-entity', 'error-ticket-entity'],
  ['subject', 'ticket-subject', 'error-ticket-subject'],
  ['productName', 'ticket-product-name', 'error-ticket-product'],
  ['warrantyEndsAt', 'ticket-warranty', 'error-ticket-warranty'],
  ['reason', 'ticket-reason', 'error-ticket-reason'],
  ['priority', 'ticket-priority', 'error-ticket-priority'],
  ['channel', 'ticket-channel', 'error-ticket-channel'],
  ['contactId', 'ticket-contact', 'error-ticket-contact'],
  ['requesterName', 'ticket-requester-name', 'error-ticket-requester-name'],
  ['requesterEmail', 'ticket-requester-email', 'error-ticket-requester-email'],
  ['assignee', 'ticket-assignee', 'error-ticket-assignee'],
  ['team', 'ticket-team', 'error-ticket-team'],
  ['documentId', 'ticket-document', 'error-ticket-document'],
  ['description', 'ticket-description', 'error-ticket-description']
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
  for (const [key, inputId, errorId] of TICKET_CONTROLS) {
    let message = errors[key] || '';
    if (key === 'productName') message = errors.productName || errors.productId || '';
    const error = qs(errorId);
    if (error) error.textContent = message;
    const input = qs(inputId);
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
}
