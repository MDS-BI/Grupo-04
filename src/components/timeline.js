/**
 * Timeline accesible por cliente u oportunidad (US-14). Recibe eventos ya
 * ordenados y normalizados por `crm-timeline.js`; es de solo lectura.
 */

function detailRow(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = String(value ?? '').trim() || 'sin información';
  dl.append(dt, dd);
}

/**
 * Detalle de solo lectura de un evento del timeline: tipo, fecha, responsable y
 * resumen. No incluye controles de edición.
 */
export function renderTimelineEventDetail(container, event) {
  const detail = document.createElement('div');
  detail.className = 'timeline-detail';
  detail.setAttribute('role', 'region');
  detail.setAttribute('aria-label', `Detalle del evento: ${event.title}`);
  detail.setAttribute('aria-live', 'polite');
  detail.tabIndex = -1;
  detail.dataset.timelineDetail = event.id;
  const dl = document.createElement('dl');
  detailRow(dl, 'Tipo', event.type);
  detailRow(dl, 'Fecha', event.date);
  detailRow(dl, 'Responsable', event.owner || 'sin responsable');
  detailRow(dl, 'Resumen', event.summary || 'sin detalle');
  detail.appendChild(dl);
  container.appendChild(detail);
  return detail;
}

export function renderTimeline(
  container,
  { events = [], filters = {}, onChange = null, onSelect = null, emptyCta = null } = {}
) {
  if (!container) return;
  container.innerHTML = '';

  const form = document.createElement('div');
  form.className = 'timeline-filters';
  form.setAttribute('role', 'group');
  form.setAttribute('aria-label', 'Filtros del timeline');

  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Tipo';
  typeLabel.setAttribute('for', 'timeline-filter-type');
  const type = document.createElement('select');
  type.id = 'timeline-filter-type';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'Todos';
  type.appendChild(all);
  for (const [value, label] of [
    ['llamada', 'Llamada'],
    ['correo', 'Correo'],
    ['reunion', 'Reunión'],
    ['nota', 'Nota'],
    ['tarea', 'Tarea'],
    ['ticket', 'Ticket']
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (filters.type === value) option.selected = true;
    type.appendChild(option);
  }

  const fromLabel = document.createElement('label');
  fromLabel.textContent = 'Desde';
  fromLabel.setAttribute('for', 'timeline-filter-from');
  const from = document.createElement('input');
  from.type = 'date';
  from.id = 'timeline-filter-from';
  from.value = filters.from || '';

  const toLabel = document.createElement('label');
  toLabel.textContent = 'Hasta';
  toLabel.setAttribute('for', 'timeline-filter-to');
  const to = document.createElement('input');
  to.type = 'date';
  to.id = 'timeline-filter-to';
  to.value = filters.to || '';

  form.append(typeLabel, type, fromLabel, from, toLabel, to);
  if (typeof onChange === 'function') {
    const emit = () => onChange({ type: type.value, from: from.value, to: to.value });
    type.addEventListener('change', emit);
    from.addEventListener('change', emit);
    to.addEventListener('change', emit);
  }
  container.appendChild(form);

  if (events.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.id = 'timeline-empty';
    empty.textContent = 'Aún no hay actividad en el timeline.';
    if (emptyCta) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'link-button';
      action.dataset.emptyCta = emptyCta.action;
      if (emptyCta.entityId) action.dataset.entityId = emptyCta.entityId;
      if (emptyCta.documentId) action.dataset.documentId = emptyCta.documentId;
      action.textContent = emptyCta.label || 'Registrar la primera actividad';
      empty.append(' ', action);
    }
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ol');
  list.className = 'timeline-list';
  for (const event of events) {
    const item = document.createElement('li');
    item.className = 'timeline-item';
    item.dataset.kind = event.kind;
    item.dataset.type = event.type;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timeline-entry';
    button.dataset.timelineEvent = event.id;
    button.setAttribute('aria-expanded', 'false');

    const date = document.createElement('time');
    date.dateTime = event.date;
    date.textContent = event.date;
    const title = document.createElement('strong');
    title.textContent = event.title;
    const meta = document.createElement('span');
    meta.className = 'muted';
    meta.textContent = [event.type, event.owner || 'sin responsable', event.status].filter(Boolean).join(' · ');
    button.append(date, title, meta);
    item.appendChild(button);

    button.addEventListener('click', () => {
      const wasExpanded = button.getAttribute('aria-expanded') === 'true';
      for (const previous of container.querySelectorAll('.timeline-item')) {
        const entry = previous.querySelector('.timeline-entry');
        if (entry) entry.setAttribute('aria-expanded', 'false');
        const open = previous.querySelector('.timeline-detail');
        if (open) open.remove();
      }
      if (wasExpanded) return;
      button.setAttribute('aria-expanded', 'true');
      const detail = renderTimelineEventDetail(item, event);
      if (typeof onSelect === 'function') onSelect(event, detail);
    });
    list.appendChild(item);
  }
  container.appendChild(list);
}
