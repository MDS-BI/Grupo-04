import { renderClientTable } from './entity-list.js';
import { renderOpportunityTable } from './document-list.js';
import { renderEmptyState } from './ui.js';

function captionFor(kind, criterion, hasFilters) {
  const suffix = criterion ? ` para «${criterion}»` : '';
  const filters = hasFilters ? ' con filtros activos' : '';
  return `${kind}${suffix}${filters}`;
}

/**
 * Renderiza las dos secciones de tabla de la búsqueda (clientes y
 * oportunidades). No escribe en localStorage: buscar y consultar son
 * operaciones de lectura.
 */
export function renderSearchResults({
  clients = [],
  opportunities = [],
  listEl,
  emptyEl,
  hintEl,
  clientsSection,
  opportunitiesSection,
  opportunitiesList,
  hasCriterion,
  criterion = '',
  hasFilters = false,
  clientSort = { key: 'name', direction: 'asc' },
  opportunitySort = { key: 'folio', direction: 'asc' },
  onSortClients = null,
  onSortOpportunities = null,
  onClearFilters = null
}) {
  listEl.innerHTML = '';
  opportunitiesList.innerHTML = '';
  if (emptyEl) {
    emptyEl.innerHTML = '';
    emptyEl.hidden = true;
  }

  if (!hasCriterion) {
    if (hintEl) hintEl.hidden = false;
    if (emptyEl) emptyEl.textContent = 'Sin coincidencias para tu búsqueda.';
    if (clientsSection) clientsSection.hidden = true;
    if (opportunitiesSection) opportunitiesSection.hidden = true;
    return { clients: 0, opportunities: 0 };
  }

  if (hintEl) hintEl.hidden = true;
  if (clientsSection) clientsSection.hidden = false;

  const total = clients.length + opportunities.length;
  if (total === 0) {
    if (opportunitiesSection) opportunitiesSection.hidden = true;
    if (emptyEl) {
      emptyEl.appendChild(
        renderEmptyState({
          reason: 'no-matches',
          message: 'Sin coincidencias para tu búsqueda.',
          ctaLabel: 'Limpiar filtros',
          ctaAction: onClearFilters,
          icon: 'search'
        })
      );
      emptyEl.hidden = false;
    }
    return { clients: 0, opportunities: 0 };
  }

  if (clients.length > 0) {
    listEl.appendChild(
      renderClientTable({
        entities: clients,
        sortKey: clientSort.key,
        sortDirection: clientSort.direction,
        onSort: onSortClients,
        caption: captionFor('Clientes encontrados', criterion, hasFilters),
        ariaLabel: 'Resultados de clientes'
      })
    );
  } else {
    listEl.appendChild(
      renderEmptyState({
        reason: 'no-matches',
        message: 'Sin clientes que coincidan con la búsqueda.',
        ctaLabel: 'Limpiar filtros',
        ctaAction: onClearFilters,
        icon: 'search'
      })
    );
  }

  if (opportunities.length > 0) {
    if (opportunitiesSection) opportunitiesSection.hidden = false;
    opportunitiesList.appendChild(
      renderOpportunityTable({
        items: opportunities,
        sortKey: opportunitySort.key,
        sortDirection: opportunitySort.direction,
        onSort: onSortOpportunities,
        caption: captionFor('Oportunidades encontradas', criterion, hasFilters),
        ariaLabel: 'Resultados de oportunidades',
        rowClassName: 'opportunity-result'
      })
    );
  } else if (opportunitiesSection) {
    opportunitiesSection.hidden = true;
  }

  return { clients: clients.length, opportunities: opportunities.length };
}
