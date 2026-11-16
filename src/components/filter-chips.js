import { SEARCH_FILTERS, readSearchFilters } from './search-bar.js';

const FILTER_LABELS = {
  category: 'Tipo',
  accountOwner: 'Responsable',
  acquisitionSource: 'Origen'
};

function selectFor(filterKey) {
  const definition = SEARCH_FILTERS.find((entry) => entry.key === filterKey);
  return definition ? document.getElementById(definition.id) : null;
}

/**
 * Genera los chips a partir de los catálogos ya montados en los `<select>`.
 * La fuente de verdad es el selector: el chip solo lo refleja y escribe en él.
 */
export function renderFilterChips(container, { onChange } = {}) {
  if (!container) return;
  container.innerHTML = '';

  SEARCH_FILTERS.forEach(({ key, id }) => {
    const select = document.getElementById(id);
    if (!select) return;
    [...select.options].forEach((option) => {
      if (!option.value) return;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.filter = key;
      chip.dataset.value = option.value;
      chip.setAttribute('aria-pressed', 'false');
      chip.setAttribute('aria-label', `${FILTER_LABELS[key] || key}: ${option.textContent}`);
      chip.textContent = option.textContent;

      chip.addEventListener('click', () => {
        const pressed = chip.getAttribute('aria-pressed') === 'true';
        if (pressed) {
          if (select.value === option.value) select.value = '';
        } else {
          select.value = option.value;
        }
        syncFilterChips();
        if (typeof onChange === 'function') onChange();
      });

      container.appendChild(chip);
    });
  });

  syncFilterChips();
}

/** Refleja en los chips el valor actual de cada selector y actualiza el contador. */
export function syncFilterChips() {
  document.querySelectorAll('#search-filter-chips .chip[data-filter]').forEach((chip) => {
    const select = selectFor(chip.dataset.filter);
    const pressed = Boolean(select && select.value && select.value === chip.dataset.value);
    chip.setAttribute('aria-pressed', String(pressed));
  });
  updateActiveFilterCount();
}

/** Contador 0–3 anunciado con `aria-live` por el contenedor del contrato. */
export function updateActiveFilterCount() {
  const counter = document.getElementById('active-filter-count');
  if (!counter) return;
  const count = Object.keys(readSearchFilters()).length;
  counter.textContent = String(count);
  counter.dataset.count = String(count);
  counter.setAttribute('aria-label', `${count} ${count === 1 ? 'filtro activo' : 'filtros activos'}`);
}
