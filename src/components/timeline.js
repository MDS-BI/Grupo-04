/**
 * Timeline accesible por cliente u oportunidad (US-14). Recibe eventos ya
 * ordenados y normalizados por `crm-timeline.js`; es de solo lectura.
 */

export function renderTimeline(container, { events = [], filters = {}, onChange = null, onSelect = null } = {}) {
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

    if (typeof onSelect === 'function') {
      button.addEventListener('click', () => onSelect(event));
    }
    list.appendChild(item);
  }
  container.appendChild(list);
}
