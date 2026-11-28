import { getConfig, isCrmProfile } from '../module-config.js';
import { stageDistribution } from '../crm-metrics.js';
import { nextStatuses } from '../crm-rules.js';

const money = (value) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

let renderedSection;
let renderedKey;

/**
 * Embudo comercial. Si recibe `onMove(id, status)` las tarjetas se pueden
 * arrastrar y se ofrece un menú "Mover a…" operable con teclado. La validación
 * de la transición vive en `app.js`/`crm-rules.js`.
 */
export function renderCommercialBoard(clients, opportunities, options = {}) {
  const section = document.getElementById('commercial-board');
  if (!section) return;
  const config = getConfig();
  const statuses = (config.statusLifecycle && config.statusLifecycle.statuses) || [];
  const buckets = stageDistribution(opportunities, statuses);
  const editable = typeof options.onMove === 'function';
  section.hidden = !isCrmProfile(config) || buckets.every((bucket) => bucket.count === 0);
  const key = JSON.stringify([section.hidden, config.statusLifecycle, clients, opportunities, editable]);
  if (renderedSection === section && renderedKey === key) return;
  renderedSection = section;
  renderedKey = key;
  const board = document.getElementById('commercial-columns');
  board.replaceChildren();
  if (section.hidden) return;

  for (const bucket of buckets) {
    const rows = opportunities.filter((item) => item.status === bucket.status);
    const column = element('section', '', 'commercial-column');
    column.dataset.status = bucket.status;
    column.setAttribute('aria-label', `${bucket.status}: ${bucket.count} oportunidades`);
    column.append(element('h3', `${bucket.status} · ${bucket.count}`));
    column.append(element('p', money(bucket.amount), 'muted'));

    if (editable) {
      column.addEventListener('dragover', (event) => {
        event.preventDefault();
        column.classList.add('is-drop-target');
      });
      column.addEventListener('dragleave', () => column.classList.remove('is-drop-target'));
      column.addEventListener('drop', (event) => {
        event.preventDefault();
        column.classList.remove('is-drop-target');
        const id = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        if (id) options.onMove(id, bucket.status);
      });
    }

    for (const item of rows) {
      const targeting = editable ? nextStatuses(item.status) : [];
      const wrapper = element('div', '', 'commercial-card-wrapper');
      const card = element(editable ? 'div' : 'button', '', 'commercial-card');
      if (editable) {
        card.draggable = true;
        card.dataset.opportunityId = item.id;
        card.addEventListener('dragstart', (event) => {
          if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', item.id);
            event.dataTransfer.effectAllowed = 'move';
          }
        });
        card.addEventListener('click', (event) => {
          if (event.target.closest('button, select, label')) return;
          const openButton = card.querySelector('button[data-opportunity-id]');
          if (openButton) openButton.click();
        });
      } else {
        card.type = 'button';
        card.dataset.opportunityId = item.id;
      }
      const open = element('button', '', 'commercial-card__open');
      open.type = 'button';
      open.dataset.opportunityId = item.id;
      open.append(element('strong', item.opportunityTitle || `Oportunidad ${item.folio}`));
      open.append(
        element('span', clients.find((client) => client.entity_id === item.entity_id)?.name || 'Cliente no disponible')
      );
      open.append(element('b', money(item.totalAmount || 0)));
      open.append(element('small', `Cierre: ${item.endDate} · ${item.opportunityOwner || 'Sin responsable'}`));
      card.append(open);

      if (editable && targeting.length > 0) {
        const moveLabel = element('label', 'Mover a…', 'sr-only');
        const moveId = `move-${item.id || Math.random().toString(36).slice(2)}`;
        moveLabel.setAttribute('for', moveId);
        const select = document.createElement('select');
        select.id = moveId;
        select.className = 'board-move';
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = 'Mover a…';
        select.appendChild(blank);
        for (const status of targeting) {
          const option = document.createElement('option');
          option.value = status;
          option.textContent = status;
          select.appendChild(option);
        }
        select.dataset.moveOpportunity = item.id || '';
        select.addEventListener('change', () => {
          if (!select.value) return;
          options.onMove(item.id, select.value);
          select.value = '';
        });
        card.append(moveLabel, select);
      }

      wrapper.append(card);
      column.append(wrapper);
    }
    if (!rows.length) column.append(element('p', 'Sin oportunidades', 'muted'));
    board.append(column);
  }
}
