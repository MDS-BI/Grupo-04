export function setupSearchBar(inputEl, onInput) {
  inputEl.addEventListener('input', () => onInput(inputEl.value));
}

export const SEARCH_FILTERS = [
  { key: 'category', id: 'search-filter-category' },
  { key: 'accountOwner', id: 'search-filter-owner' },
  { key: 'acquisitionSource', id: 'search-filter-source' }
];

/** Lee los filtros activos del formulario de búsqueda. */
export function readSearchFilters() {
  const filters = {};
  for (const { key, id } of SEARCH_FILTERS) {
    const el = document.getElementById(id);
    if (el && el.value) filters[key] = el.value;
  }
  return filters;
}

/** Limpia los filtros de búsqueda sin tocar el criterio escrito. */
export function clearSearchFilters() {
  for (const { id } of SEARCH_FILTERS) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  }
}

export function renderSearchResults(listEl, emptyEl, entities, renderItem) {
  listEl.innerHTML = '';
  if (!entities || entities.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  for (const e of entities) listEl.appendChild(renderItem(e));
}
