import { getConfig, isCrmProfile } from '../module-config.js';
import { stageDistribution } from '../crm-metrics.js';

const money = (value) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

let renderedSection;
let renderedKey;

// Deriva el tablero de los mismos registros del panel, sin una segunda persistencia.
// Los conteos y montos vienen de `stageDistribution()`: misma fuente que la banda.
export function renderCommercialBoard(clients, opportunities) {
  const section = document.getElementById('commercial-board');
  if (!section) return;
  const config = getConfig();
  const statuses = (config.statusLifecycle && config.statusLifecycle.statuses) || [];
  const buckets = stageDistribution(opportunities, statuses);
  section.hidden = !isCrmProfile(config) || buckets.every((bucket) => bucket.count === 0);
  const key = JSON.stringify([section.hidden, config.statusLifecycle, clients, opportunities]);
  if (renderedSection === section && renderedKey === key) return;
  renderedSection = section;
  renderedKey = key;
  const board = document.getElementById('commercial-columns');
  board.replaceChildren();
  if (section.hidden) return;
  for (const bucket of buckets) {
    const rows = opportunities.filter((item) => item.status === bucket.status);
    const column = element('section', '', 'commercial-column');
    column.append(element('h3', `${bucket.status} · ${bucket.count}`));
    column.append(element('p', money(bucket.amount), 'muted'));
    for (const item of rows) {
      const card = element('button', '', 'commercial-card');
      card.type = 'button';
      card.dataset.opportunityId = item.id;
      card.append(element('strong', item.opportunityTitle || `Oportunidad ${item.folio}`));
      card.append(
        element('span', clients.find((client) => client.entity_id === item.entity_id)?.name || 'Cliente no disponible')
      );
      card.append(element('b', money(item.totalAmount || 0)));
      card.append(element('small', `Cierre: ${item.endDate} · ${item.opportunityOwner || 'Sin responsable'}`));
      column.append(card);
    }
    if (!rows.length) column.append(element('p', 'Sin oportunidades', 'muted'));
    board.append(column);
  }
}
