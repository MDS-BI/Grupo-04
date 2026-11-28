import { countTrashRecords } from '../crm-trash.js';

/**
 * Vista de papelera local (US-16): tipo, fecha de eliminación, cantidad de
 * registros asociados y acciones restaurar/purgar. No escribe por sí misma.
 */

function localDateTime(iso) {
  if (!iso) return 'sin fecha';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return parsed.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function renderTrashList(listEl, entries = [], { onRestore = null, onPurge = null } = {}) {
  if (!listEl) return false;
  listEl.innerHTML = '';
  if (!entries || entries.length === 0) return false;

  for (const entry of entries) {
    const li = document.createElement('li');
    li.className = 'trash-item';
    li.dataset.trashId = entry.id || '';

    const headline = document.createElement('div');
    headline.className = 'client-summary-headline';
    const title = document.createElement('strong');
    title.textContent = entry.entity ? entry.entity.name || entry.entity.code || 'Cliente' : 'Cliente eliminado';
    headline.appendChild(title);
    const count = document.createElement('span');
    count.className = 'status-badge';
    count.textContent = `${countTrashRecords(entry)} registros`;
    headline.appendChild(count);
    li.appendChild(headline);

    const meta = document.createElement('div');
    meta.className = 'client-summary-meta';
    meta.textContent = [
      `Código: ${(entry.entity && entry.entity.code) || 'sin información'}`,
      `Eliminado: ${localDateTime(entry.deletedAt)}`,
      `${(entry.documents || []).length} oportunidades`,
      `${(entry.tickets || []).length} tickets`,
      `${(entry.contacts || []).length} contactos`,
      `${(entry.activities || []).length} actividades`
    ].join(' · ');
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'inline-actions';
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'link-button';
    restore.dataset.restoreTrash = entry.id || '';
    restore.textContent = 'Restaurar';
    const purge = document.createElement('button');
    purge.type = 'button';
    purge.className = 'link-button';
    purge.dataset.purgeTrash = entry.id || '';
    purge.textContent = 'Purgar definitivamente';
    actions.append(restore, purge);
    li.appendChild(actions);

    if (typeof onRestore === 'function') {
      restore.addEventListener('click', () => onRestore(entry));
    }
    if (typeof onPurge === 'function') {
      purge.addEventListener('click', () => onPurge(entry));
    }
    listEl.appendChild(li);
  }
  return true;
}
