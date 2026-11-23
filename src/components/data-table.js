import { renderEmptyState } from './ui.js';

/**
 * Primitiva de tabla ordenable y accesible.
 *
 * No conoce el dominio: recibe columnas con `render(row)` y filas arbitrarias.
 * El orden es estable, los valores vacíos quedan al final en ambos sentidos y
 * el estado de orden lo controla quien llama (`sortKey`/`sortDirection`).
 */

function isMissing(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function valueFor(row, column) {
  if (typeof column.value === 'function') return column.value(row);
  return row ? row[column.key] : undefined;
}

function compareValues(a, b) {
  const numberA = typeof a === 'number' ? a : Number(a);
  const numberB = typeof b === 'number' ? b : Number(b);
  const numericA = typeof a === 'number' || (typeof a === 'string' && a.trim() !== '' && Number.isFinite(numberA));
  const numericB = typeof b === 'number' || (typeof b === 'string' && b.trim() !== '' && Number.isFinite(numberB));

  if (numericA && numericB) {
    if (numberA < numberB) return -1;
    if (numberA > numberB) return 1;
    return 0;
  }
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

export function resolveSortKey(columns, sortKey) {
  if (sortKey && columns.some((column) => column.key === sortKey && column.sortable !== false)) return sortKey;
  const firstSortable = columns.find((column) => column.sortable !== false);
  return firstSortable ? firstSortable.key : '';
}

/**
 * Devuelve una copia ordenada de `rows`. Los valores vacíos se colocan al
 * final independientemente de la dirección y los empates conservan el orden
 * de entrada.
 */
export function sortRows(rows, columns, sortKey, sortDirection = 'asc') {
  const list = Array.isArray(rows) ? rows : [];
  const key = resolveSortKey(columns, sortKey);
  const column = columns.find((candidate) => candidate.key === key);
  const decorated = list.map((row, index) => ({ row, index }));
  if (!column) return decorated.map((item) => item.row);

  const direction = sortDirection === 'desc' ? -1 : 1;
  decorated.sort((left, right) => {
    const a = valueFor(left.row, column);
    const b = valueFor(right.row, column);
    const aEmpty = isMissing(a);
    const bEmpty = isMissing(b);

    if (aEmpty && bEmpty) return left.index - right.index;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    const comparison = compareValues(a, b);
    if (comparison !== 0) return comparison * direction;
    return left.index - right.index;
  });
  return decorated.map((item) => item.row);
}

function rowKeyFor(row, index, getRowKey) {
  if (typeof getRowKey === 'function') {
    const key = getRowKey(row);
    if (key !== undefined && key !== null && key !== '') return String(key);
  }
  const candidates = [row && row.key, row && row.id, row && row.entity_id];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') return String(candidate);
  }
  return `row-${index}`;
}

function appendContent(cell, content) {
  if (content === undefined || content === null) return;
  if (Array.isArray(content)) {
    content.forEach((item) => appendContent(cell, item));
    return;
  }
  if (typeof content === 'string' || typeof content === 'number') {
    cell.appendChild(document.createTextNode(String(content)));
    return;
  }
  if (content.nodeType) cell.appendChild(content);
}

function buildHeaderCell(column, sortKey, sortDirection, onSort) {
  const header = document.createElement('th');
  header.setAttribute('scope', 'col');
  if (column.numeric) header.setAttribute('data-numeric', '');
  if (column.className) header.classList.add(column.className);

  if (column.sortable === false) {
    header.textContent = column.label;
    return header;
  }

  const active = column.key === sortKey;
  header.setAttribute('aria-sort', active ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sort-button';
  button.setAttribute('data-sort', column.key);
  button.textContent = column.label;
  if (typeof onSort === 'function') {
    button.addEventListener('click', () => onSort(column.key));
  }
  header.appendChild(button);
  return header;
}

/**
 * Renderiza la tabla o el estado vacío. Devuelve un nodo listo para insertar.
 */
export function renderDataTable({
  caption = '',
  columns = [],
  rows = [],
  sortKey = '',
  sortDirection = 'asc',
  onSort = null,
  emptyState = null,
  ariaLabel = '',
  rowClassName = null,
  getRowKey = null
} = {}) {
  const list = Array.isArray(rows) ? rows : [];

  if (list.length === 0) {
    return renderEmptyState(
      emptyState || { reason: 'no-records', title: 'Sin registros', message: 'No hay registros para mostrar.' }
    );
  }

  const resolvedSortKey = resolveSortKey(columns, sortKey);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', ariaLabel || caption || 'Tabla de datos');
  wrap.setAttribute('tabindex', '0');

  const table = document.createElement('table');
  table.className = 'data-table';

  const captionEl = document.createElement('caption');
  captionEl.className = 'sr-only';
  captionEl.textContent = caption || 'Tabla de datos';
  table.appendChild(captionEl);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach((column) => {
    headerRow.appendChild(buildHeaderCell(column, resolvedSortKey, sortDirection, onSort));
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const sorted = sortRows(list, columns, resolvedSortKey, sortDirection);
  sorted.forEach((row, index) => {
    const tableRow = document.createElement('tr');
    tableRow.dataset.key = rowKeyFor(row, index, getRowKey);
    const extraClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
    if (extraClass) tableRow.className = extraClass;

    columns.forEach((column) => {
      const cell = document.createElement('td');
      if (column.numeric) cell.setAttribute('data-numeric', '');
      if (column.className) cell.classList.add(column.className);
      const content = typeof column.render === 'function' ? column.render(row) : row ? row[column.key] : undefined;
      appendContent(cell, content);
      tableRow.appendChild(cell);
    });

    tbody.appendChild(tableRow);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
