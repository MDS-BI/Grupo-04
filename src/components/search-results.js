import { createClientSummary } from './entity-list.js';

/**
 * Resultados de oportunidades en la búsqueda: asunto, folio, etapa,
 * monto y cliente vinculado. Se muestran en una sección propia para no
 * mezclarlos sin etiqueta con los resultados de clientes.
 */
export function createOpportunityResult({ document: opportunity, client }) {
  const li = document.createElement('li');
  li.className = 'opportunity-result';

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const title = document.createElement('strong');
  title.textContent = opportunity.opportunityTitle || 'Sin asunto';
  headline.appendChild(title);
  const badge = document.createElement('span');
  badge.className = 'status-badge';
  badge.textContent = opportunity.status || 'Sin etapa';
  headline.appendChild(badge);
  li.appendChild(headline);

  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  const folio = `${opportunity.series ? `${opportunity.series}-` : ''}${opportunity.folio}`;
  const amount =
    opportunity.totalAmount === undefined || opportunity.totalAmount === null
      ? 'sin monto'
      : `${opportunity.totalAmount} ${opportunity.currency || ''}`.trim();
  meta.textContent = [
    `Folio: ${folio}`,
    `Monto: ${amount}`,
    `Responsable: ${opportunity.opportunityOwner || 'sin información'}`,
    `Cliente: ${client ? `${client.name} (${client.code})` : 'sin información'}`
  ].join(' · ');
  li.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'link-button';
  open.dataset.openDocument = opportunity.id || '';
  open.textContent = 'Ver detalle';
  actions.appendChild(open);
  li.appendChild(actions);

  return li;
}

/**
 * Renderiza los resultados de clientes y la sección de oportunidades.
 * No escribe en localStorage: buscar y consultar son operaciones de lectura.
 */
export function renderSearchResults({
  clients = [],
  opportunities = [],
  listEl,
  emptyEl,
  hintEl,
  opportunitiesSection,
  opportunitiesList,
  hasCriterion
}) {
  listEl.innerHTML = '';
  opportunitiesList.innerHTML = '';

  if (!hasCriterion) {
    if (hintEl) hintEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (opportunitiesSection) opportunitiesSection.hidden = true;
    return { clients: 0, opportunities: 0 };
  }

  if (hintEl) hintEl.hidden = true;
  for (const client of clients) listEl.appendChild(createClientSummary(client));
  for (const opportunity of opportunities) {
    opportunitiesList.appendChild(createOpportunityResult(opportunity));
  }
  if (opportunitiesSection) opportunitiesSection.hidden = opportunities.length === 0;
  if (emptyEl) emptyEl.hidden = clients.length + opportunities.length > 0;

  return { clients: clients.length, opportunities: opportunities.length };
}
