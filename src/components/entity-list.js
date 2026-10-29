import { loadDocuments } from '../storage.js';
import { labelFor, getConfig } from '../module-config.js';
import { createDocumentItem } from './document-list.js';

function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

export function createEntityItem(entity){
  const li = document.createElement('li');
  li.className = 'entity-item';
  const custom = getConfig().customFields.filter(f => f.target === 'entity');
  const customBits = custom
    .filter(f => entity[f.key] !== undefined && entity[f.key] !== null)
    .map(f => ` &middot; ${escapeHtml(f.label)}: ${escapeHtml(String(entity[f.key]))}`)
    .join('');
  const meta = document.createElement('div');
  meta.className = 'entity-meta';
  meta.innerHTML = `<strong>${escapeHtml(entity.name)}</strong><div>${escapeHtml(entity.code)}${entity.category ? ' • ' + escapeHtml(entity.category) : ''}</div>` +
    `${entity.targetDate ? '<div class="muted">Fecha objetivo: ' + escapeHtml(entity.targetDate) + '</div>' : ''}` +
    `${entity.description ? '<div class="muted">' + escapeHtml(entity.description) + '</div>' : ''}` +
    (customBits ? `<div class="muted">${customBits}</div>` : '');;
  const docs = document.createElement('div');
  docs.className = 'entity-documents';
  renderDocumentsFor(entity, docs);
  li.appendChild(meta);
  li.appendChild(docs);
  return li;
}

export function renderDocumentsFor(entity, container){
  const documents = loadDocuments().filter(d => d.entity_id === entity.entity_id);
  const heading = document.createElement('div');
  heading.className = 'muted';
  heading.textContent = labelFor('documents') + ':';
  container.appendChild(heading);
  if(documents.length === 0){
    const none = document.createElement('div');
    none.className = 'muted';
    none.textContent = `Aún no hay ${labelFor('documents').toLowerCase()}.`;
    container.appendChild(none);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'document-list';
    for(const d of documents) ul.appendChild(createDocumentItem(d));
    container.appendChild(ul);
  }
}

export function renderEntityList(listEl, entities){
  listEl.innerHTML = '';
  if(!entities || entities.length === 0) return false;
  for(const e of entities) listEl.appendChild(createEntityItem(e));
  return true;
}
