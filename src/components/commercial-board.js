import { getConfig, isCrmProfile } from '../module-config.js';

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
export function renderCommercialBoard(clients, opportunities) {
  const section = document.getElementById('commercial-board');
  if (!section) return;
  section.hidden = !isCrmProfile(getConfig());
  const key = JSON.stringify([section.hidden, getConfig().statusLifecycle, clients, opportunities]);
  if (renderedSection === section && renderedKey === key) return;
  renderedSection = section;
  renderedKey = key;
  const board = document.getElementById('commercial-columns');
  board.replaceChildren();
  if (section.hidden) return;
  for (const status of getConfig().statusLifecycle.statuses) {
    const rows = opportunities.filter((item) => item.status === status);
    const column = element('section', '', 'commercial-column');
    column.append(element('h3', `${status} · ${rows.length}`));
    column.append(element('p', money(rows.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)), 'muted'));
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
