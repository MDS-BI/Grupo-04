import { loadDocuments } from '../storage.js';
import { labelFor, getConfig } from '../module-config.js';
import { createDocumentItem } from './document-list.js';
import { getTargetDateStatus, todayLocal } from '../crm-rules.js';
import { renderDataTable } from './data-table.js';
import { renderMonogram } from './ui.js';

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

function display(value, fallback = 'sin información') {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return String(value);
}

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
 * Columnas de la tabla de clientes: identificación con monograma, tipo,
 * responsable, origen, próximo contacto y una única acción «Editar».
 */
export function clientTableColumns() {
  return [
    {
      key: 'name',
      label: 'Cliente',
      sortable: true,
      className: 'cell-truncate',
      value: (row) => row.name || '',
      render: (row) => {
        const content = document.createElement('div');
        content.className = 'name-cell';
        content.appendChild(renderMonogram(row.name));

        const text = document.createElement('span');
        text.className = 'name-cell__text';

        const name = document.createElement('button');
        name.type = 'button';
        name.className = 'link-button name-cell__name';
        name.dataset.openEntity = row.entity_id || '';
        name.setAttribute('aria-label', `Ver ficha de ${display(row.name, 'cliente')}`);
        name.textContent = display(row.name, 'Sin nombre');
        text.appendChild(name);

        const code = document.createElement('span');
        code.className = 'muted';
        code.textContent = display(row.code);
        text.appendChild(code);

        content.appendChild(text);
        return content;
      }
    },
    {
      key: 'category',
      label: 'Tipo',
      sortable: true,
      className: 'cell-truncate',
      render: (row) => display(row.category)
    },
    {
      key: 'accountOwner',
      label: 'Responsable',
      sortable: true,
      className: 'cell-truncate',
      render: (row) => display(row.accountOwner)
    },
    {
      key: 'acquisitionSource',
      label: 'Origen',
      sortable: true,
      className: 'cell-truncate',
      render: (row) => display(row.acquisitionSource)
    },
    {
      key: 'targetDate',
      label: 'Próximo contacto',
      sortable: true,
      numeric: true,
      value: (row) => row.targetDate || '',
      render: (row) => {
        const content = document.createElement('span');
        content.className = 'date-cell';
        const status = getTargetDateStatus(row.targetDate, todayLocal());
        const badge = document.createElement('span');
        badge.className = `status-badge ${STATUS_CLASS[status] || ''}`.trim();
        badge.textContent = status;
        badge.dataset.targetStatus = status;
        const date = document.createElement('span');
        date.className = 'muted';
        date.textContent = display(row.targetDate);
        content.append(date, badge);
        return content;
      }
    },
    {
      key: 'actions',
      label: 'Acciones',
      sortable: false,
      render: (row) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-ghost btn-sm';
        button.dataset.action = 'edit';
        button.dataset.editEntity = row.entity_id || '';
        button.setAttribute('aria-label', `Editar ${display(row.name, 'cliente')}`);
        button.textContent = 'Editar';
        return button;
      }
    }
  ];
}

/**
 * Tabla de clientes. El estado vacío lo decide quien llama para distinguir
 * «sin registros» de «sin coincidencias».
 */
export function renderClientTable({
  entities = [],
  sortKey = 'name',
  sortDirection = 'asc',
  onSort = null,
  emptyState = null,
  caption = 'Clientes',
  ariaLabel = ''
} = {}) {
  return renderDataTable({
    caption,
    ariaLabel: ariaLabel || caption,
    columns: clientTableColumns(),
    rows: entities,
    sortKey,
    sortDirection,
    onSort,
    emptyState,
    rowClassName: () => 'client-summary',
    getRowKey: (row) => row.entity_id || row.id
  });
}
