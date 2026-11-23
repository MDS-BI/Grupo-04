import { renderDataTable } from './data-table.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function folioLabel(doc) {
  return `${doc.series ? `${doc.series}-` : ''}${doc.folio}`;
}

export function createDocumentItem(doc, entityName) {
  const li = document.createElement('li');
  li.className = 'document-item';
  const amount =
    doc.totalAmount !== undefined
      ? ` &middot; ${escapeHtml(String(doc.currency || ''))}${escapeHtml(String(doc.totalAmount))}`
      : '';
  const status = doc.status ? ` <span class="status-badge">${escapeHtml(doc.status)}</span>` : '';
  const info = document.createElement('span');
  info.innerHTML =
    `<strong>${escapeHtml(folioLabel(doc))}</strong> &middot; ${escapeHtml(doc.startDate)} &rarr; ${escapeHtml(doc.endDate)}` +
    `${doc.quantity ? ' &middot; ' + escapeHtml(String(doc.quantity)) + ' cant.' : ''}${amount}${status}` +
    `${entityName ? `<div class="muted">${escapeHtml(entityName)}</div>` : ''}`;
  li.appendChild(info);
  return li;
}

export function renderDocumentList(listEl, documents, entityNameFor) {
  listEl.innerHTML = '';
  if (!documents || documents.length === 0) return false;
  for (const d of documents) {
    listEl.appendChild(createDocumentItem(d, entityNameFor ? entityNameFor(d) : undefined));
  }
  return true;
}

function display(value, fallback = 'sin información') {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return String(value);
}

const AMOUNT_FORMATTER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function formatAmount(amount, currency) {
  if (amount === undefined || amount === null || String(amount).trim() === '') return 'sin monto';
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);
  return `${AMOUNT_FORMATTER.format(numeric)}${currency ? ` ${currency}` : ''}`;
}

function normalizeOpportunity(item, entityNameFor) {
  const document_ = item && item.document ? item.document : item;
  const client = item && item.client ? item.client : null;
  let clientName = 'Cliente desconocido';
  if (client) clientName = client.code ? `${client.name} (${client.code})` : display(client.name);
  else if (entityNameFor) clientName = entityNameFor(document_) || 'Cliente desconocido';
  return { ...document_, clientName };
}

/** Columnas de la tabla de oportunidades con el cliente vinculado. */
export function opportunityTableColumns({ openDetail = true } = {}) {
  return [
    {
      key: 'clientName',
      label: 'Cliente',
      sortable: true,
      className: 'cell-truncate',
      render: (row) => display(row.clientName, 'Cliente desconocido')
    },
    {
      key: 'folio',
      label: 'Folio',
      sortable: true,
      numeric: true,
      render: (row) => {
        if (!openDetail) {
          const text = document.createElement('span');
          text.textContent = folioLabel(row);
          return text;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'link-button';
        button.dataset.openDocument = row.id || '';
        button.setAttribute('aria-label', `Ver detalle de ${folioLabel(row)}`);
        button.textContent = folioLabel(row);
        return button;
      }
    },
    {
      key: 'opportunityTitle',
      label: 'Asunto',
      sortable: true,
      className: 'cell-truncate',
      render: (row) => display(row.opportunityTitle, 'Sin asunto')
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      render: (row) => {
        const badge = document.createElement('span');
        badge.className = 'status-badge';
        badge.textContent = display(row.status, 'Sin etapa');
        return badge;
      }
    },
    {
      key: 'totalAmount',
      label: 'Monto',
      sortable: true,
      numeric: true,
      render: (row) => formatAmount(row.totalAmount, row.currency)
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
        button.dataset.editDocument = row.id || '';
        button.setAttribute('aria-label', `Editar ${folioLabel(row)}`);
        button.textContent = 'Editar';
        return button;
      }
    }
  ];
}

/**
 * Tabla de oportunidades. Acepta documentos o resultados de búsqueda
 * (`{ document, client }`) y resuelve el nombre del cliente en el render.
 */
export function renderOpportunityTable({
  items = [],
  entityNameFor = null,
  sortKey = 'folio',
  sortDirection = 'asc',
  onSort = null,
  emptyState = null,
  caption = 'Oportunidades',
  ariaLabel = '',
  rowClassName = 'opportunity-item',
  openDetail = true
} = {}) {
  const rows = (items || []).map((item) => normalizeOpportunity(item, entityNameFor));
  return renderDataTable({
    caption,
    ariaLabel: ariaLabel || caption,
    columns: opportunityTableColumns({ openDetail }),
    rows,
    sortKey,
    sortDirection,
    onSort,
    emptyState,
    rowClassName: () => rowClassName,
    getRowKey: (row) => row.id
  });
}
