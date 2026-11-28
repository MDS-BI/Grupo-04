import { isActivityOverdue, todayLocal } from '../crm-rules.js';

/**
 * Lista de actividades (US-13): pendientes, para hoy, vencidas y completadas.
 * Orden cronológico ascendente por vencimiento.
 */

function localDate(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function activityBucket(activity, today = todayLocal()) {
  if (!activity) return 'pendiente';
  if (activity.status === 'completada') return 'completada';
  if (activity.dueDate === today) return 'para-hoy';
  if (isActivityOverdue(activity, today)) return 'vencida';
  return 'pendiente';
}

function sortKey(activity) {
  return activity.dueDate || localDate(activity.createdAt) || '';
}

export function createActivityItem(activity, today = todayLocal(), entityName = '') {
  const li = document.createElement('li');
  li.className = 'activity-item';
  li.dataset.activityId = activity.id || '';
  const bucket = activityBucket(activity, today);
  li.dataset.bucket = bucket;

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const title = document.createElement('strong');
  title.textContent = activity.subject || 'Actividad sin asunto';
  headline.appendChild(title);
  const badge = document.createElement('span');
  badge.className = `status-badge${bucket === 'vencida' ? ' status-overdue' : ''}`;
  badge.textContent =
    bucket === 'completada'
      ? 'Completada'
      : bucket === 'vencida'
        ? 'Vencida'
        : bucket === 'para-hoy'
          ? 'Para hoy'
          : 'Pendiente';
  headline.appendChild(badge);
  li.appendChild(headline);

  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  meta.textContent = [
    entityName,
    activity.type || 'sin tipo',
    activity.dueDate ? `Vence: ${activity.dueDate}` : 'Sin vencimiento',
    activity.owner || 'sin responsable'
  ]
    .filter(Boolean)
    .join(' · ');
  li.appendChild(meta);

  if (activity.notes) {
    const notes = document.createElement('p');
    notes.className = 'muted';
    notes.textContent = activity.notes;
    li.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  if (activity.status !== 'completada') {
    const complete = document.createElement('button');
    complete.type = 'button';
    complete.className = 'link-button';
    complete.dataset.completeActivity = activity.id || '';
    complete.textContent = 'Marcar como completada';
    actions.appendChild(complete);
  }
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'link-button';
  edit.dataset.editActivity = activity.id || '';
  edit.textContent = 'Editar';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'link-button';
  remove.dataset.deleteActivity = activity.id || '';
  remove.textContent = 'Eliminar';
  actions.append(edit, remove);
  li.appendChild(actions);

  return li;
}

export function renderActivityList(listEl, activities = [], today = todayLocal(), nameFor = null) {
  if (!listEl) return false;
  listEl.innerHTML = '';
  if (!activities || activities.length === 0) return false;
  const ordered = activities.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  for (const activity of ordered) {
    const name = typeof nameFor === 'function' ? nameFor(activity) : '';
    listEl.appendChild(createActivityItem(activity, today, name));
  }
  return true;
}
