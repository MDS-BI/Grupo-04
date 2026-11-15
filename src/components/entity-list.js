import { loadDocuments } from '../storage.js';
import { labelFor, getConfig } from '../module-config.js';
import { createDocumentItem } from './document-list.js';
import { getTargetDateStatus, todayLocal } from '../crm-rules.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const STATUS_CLASS = {
  Vencido: 'status-overdue',
  'Para hoy': 'status-today',
  Programado: '',
  'Sin programar': 'status-none'
};

export function createEntityItem(entity) {
  const li = document.createElement('li');
  li.className = 'entity-item';
  const custom = getConfig().customFields.filter((f) => f.target === 'entity');
  const customBits = custom
    .filter((f) => entity[f.key] !== undefined && entity[f.key] !== null)
    .map((f) => ` &middot; ${escapeHtml(f.label)}: ${escapeHtml(String(entity[f.key]))}`)
    .join('');
  const meta = document.createElement('div');
  meta.className = 'entity-meta';
  meta.innerHTML =
    `<strong>${escapeHtml(entity.name)}</strong><div>${escapeHtml(entity.code)}${entity.category ? ' • ' + escapeHtml(entity.category) : ''}</div>` +
    `${entity.targetDate ? '<div class="muted">Fecha objetivo: ' + escapeHtml(entity.targetDate) + '</div>' : ''}` +
    `${entity.description ? '<div class="muted">' + escapeHtml(entity.description) + '</div>' : ''}` +
    (customBits ? `<div class="muted">${customBits}</div>` : '');
  const docs = document.createElement('div');
  docs.className = 'entity-documents';
  renderDocumentsFor(entity, docs);
  li.appendChild(meta);
  li.appendChild(docs);
  return li;
}

export function renderDocumentsFor(entity, container) {
  const documents = loadDocuments().filter((d) => d.entity_id === entity.entity_id);
  const heading = document.createElement('div');
  heading.className = 'muted';
  heading.textContent = labelFor('documents') + ':';
  container.appendChild(heading);
  if (documents.length === 0) {
    const none = document.createElement('div');
    none.className = 'muted';
    none.textContent = `Aún no hay ${labelFor('documents').toLowerCase()}.`;
    container.appendChild(none);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'document-list';
    for (const d of documents) ul.appendChild(createDocumentItem(d));
    container.appendChild(ul);
  }
}

export function renderEntityList(listEl, entities) {
  listEl.innerHTML = '';
  if (!entities || entities.length === 0) return false;
  for (const e of entities) listEl.appendChild(createEntityItem(e));
  return true;
}

/**
 * Resumen de cliente para la gestión: identificación, clasificación,
 * responsable, origen y estado del próximo contacto.
 */
export function createClientSummary(entity, today = todayLocal()) {
  const li = document.createElement('li');
  li.className = 'client-summary';
  li.dataset.entityId = entity.entity_id || '';

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const name = document.createElement('strong');
  name.textContent = entity.name || 'Sin nombre';
  headline.appendChild(name);
  const status = getTargetDateStatus(entity.targetDate, today);
  const badge = document.createElement('span');
  badge.className = `status-badge ${STATUS_CLASS[status] || ''}`.trim();
  badge.textContent = status;
  badge.dataset.targetStatus = status;
  headline.appendChild(badge);
  li.appendChild(headline);

  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  meta.textContent = [
    `Código: ${entity.code || 'sin información'}`,
    `Tipo: ${entity.category || 'sin información'}`,
    `Responsable: ${entity.accountOwner || 'sin información'}`,
    `Origen: ${entity.acquisitionSource || 'sin información'}`,
    `Próximo contacto: ${entity.targetDate || 'sin información'}`
  ].join(' · ');
  li.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'link-button';
  open.dataset.openEntity = entity.entity_id || '';
  open.textContent = 'Ver ficha';
  actions.appendChild(open);
  li.appendChild(actions);

  return li;
}

export function renderClientList(listEl, entities) {
  listEl.innerHTML = '';
  if (!entities || entities.length === 0) return false;
  for (const e of entities) listEl.appendChild(createClientSummary(e));
  return true;
}
