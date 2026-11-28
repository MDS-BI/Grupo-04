import { getConfig } from '../module-config.js';

/**
 * Formulario de actividad (US-13). Tipos desde `ModuleConfig.activityTypes`;
 * responsables desde `accountOwner`/`opportunityOwner`.
 */

function qs(id) {
  return document.getElementById(id);
}

function fillSelect(select, options, blankLabel = '--') {
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

function ownerOptions() {
  const catalogs = (getConfig() && getConfig().catalogs) || {};
  const owners = [...(catalogs.accountOwner || []), ...(catalogs.opportunityOwner || [])];
  return [...new Set(owners)];
}

export function prepareActivityForm() {
  const catalogs = (getConfig() && getConfig().catalogs) || {};
  fillSelect(qs('activity-type'), catalogs.activityTypes || ['llamada', 'correo', 'reunion', 'nota', 'tarea']);
  fillSelect(qs('activity-owner'), ownerOptions());
}

/** Rellena contactos y oportunidades del cliente seleccionado. */
export function populateActivityLinks(contacts = [], documents = []) {
  const contactSelect = qs('activity-contact');
  if (contactSelect) {
    const previous = contactSelect.value;
    contactSelect.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Sin contacto';
    contactSelect.appendChild(none);
    for (const contact of contacts) {
      const option = document.createElement('option');
      option.value = contact.id;
      option.textContent = contact.name || contact.id;
      contactSelect.appendChild(option);
    }
    if (previous && [...contactSelect.options].some((option) => option.value === previous)) {
      contactSelect.value = previous;
    }
  }
  const documentSelect = qs('activity-document');
  if (documentSelect) {
    const previous = documentSelect.value;
    documentSelect.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Sin oportunidad';
    documentSelect.appendChild(none);
    for (const document_ of documents) {
      const option = document.createElement('option');
      option.value = document_.id;
      option.textContent = `${document_.opportunityTitle || 'Oportunidad'} · ${document_.series || 'OPP'}/${document_.folio}`;
      documentSelect.appendChild(option);
    }
    if (previous && [...documentSelect.options].some((option) => option.value === previous)) {
      documentSelect.value = previous;
    }
  }
}

function syncDueDateRequirement() {
  const type = qs('activity-type');
  const dueDate = qs('activity-due-date');
  if (!type || !dueDate) return;
  const required = type.value === 'tarea';
  if (required) dueDate.setAttribute('aria-required', 'true');
  else dueDate.removeAttribute('aria-required');
}

export function clearActivityForm() {
  if (!qs('activity-form')) return;
  qs('activity-id').value = '';
  if (qs('activity-type')) qs('activity-type').value = '';
  qs('activity-subject').value = '';
  qs('activity-notes').value = '';
  qs('activity-due-date').value = '';
  if (qs('activity-owner')) qs('activity-owner').value = '';
  if (qs('activity-contact')) qs('activity-contact').value = '';
  if (qs('activity-document')) qs('activity-document').value = '';
  clearActivityErrors();
  qs('activity-submit').textContent = 'Registrar actividad';
  qs('activity-cancel').hidden = true;
  syncDueDateRequirement();
  const message = qs('activity-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

export function startActivityEdit(activity) {
  qs('activity-id').value = activity.id;
  qs('activity-type').value = activity.type || '';
  qs('activity-subject').value = activity.subject || '';
  qs('activity-notes').value = activity.notes || '';
  qs('activity-due-date').value = activity.dueDate || '';
  qs('activity-owner').value = activity.owner || '';
  if (qs('activity-contact')) qs('activity-contact').value = activity.contactId || '';
  if (qs('activity-document')) qs('activity-document').value = activity.documentId || '';
  clearActivityErrors();
  qs('activity-submit').textContent = 'Actualizar actividad';
  qs('activity-cancel').hidden = false;
  syncDueDateRequirement();
}

export function collectActivityPayload() {
  return {
    entityId: qs('activity-entity-id') ? qs('activity-entity-id').value : '',
    type: qs('activity-type') ? qs('activity-type').value : '',
    subject: qs('activity-subject').value,
    notes: qs('activity-notes').value,
    dueDate: qs('activity-due-date').value,
    owner: qs('activity-owner') ? qs('activity-owner').value : '',
    contactId: qs('activity-contact') ? qs('activity-contact').value : '',
    documentId: qs('activity-document') ? qs('activity-document').value : ''
  };
}

const ACTIVITY_ERRORS = [
  ['type', 'activity-type', 'error-activity-type'],
  ['subject', 'activity-subject', 'error-activity-subject'],
  ['dueDate', 'activity-due-date', 'error-activity-due-date'],
  ['owner', 'activity-owner', 'error-activity-owner'],
  ['contactId', 'activity-contact', 'error-activity-contact'],
  ['documentId', 'activity-document', 'error-activity-document']
];

export function clearActivityErrors() {
  for (const [, inputId, errorId] of ACTIVITY_ERRORS) {
    const error = qs(errorId);
    if (error) error.textContent = '';
    const input = qs(inputId);
    if (input) input.removeAttribute('aria-invalid');
  }
}

export function showActivityErrors(errors = {}) {
  for (const [key, inputId, errorId] of ACTIVITY_ERRORS) {
    const error = qs(errorId);
    if (error) error.textContent = errors[key] || '';
    const input = qs(inputId);
    if (input) {
      if (errors[key]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
}

export { syncDueDateRequirement };
