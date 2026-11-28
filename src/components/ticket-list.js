function localDate(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fila de ticket: motivo, prioridad, estado, fecha, equipo y solución. */
export function createTicketItem(ticket) {
  const li = document.createElement('li');
  li.className = 'ticket-item';
  li.dataset.ticketId = ticket.id || '';

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const title = document.createElement('strong');
  title.textContent = ticket.reason || 'Sin motivo';
  headline.appendChild(title);
  const badge = document.createElement('span');
  badge.className = `status-badge${ticket.status === 'Resuelto' ? ' status-resolved' : ''}`;
  badge.textContent = ticket.status || 'Sin estado';
  headline.appendChild(badge);
  li.appendChild(headline);

  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  meta.textContent = [
    `Prioridad: ${ticket.priority || 'sin información'}`,
    `Fecha: ${localDate(ticket.createdAt) || 'sin información'}`,
    `Producto: ${ticket.productName || ticket.productId || 'sin información'}`,
    `Equipo: ${ticket.equipmentReference || 'Equipo no individualizado'}`
  ].join(' · ');
  li.appendChild(meta);

  if (ticket.description) {
    const description = document.createElement('p');
    description.className = 'ticket-description';
    description.textContent = ticket.description;
    li.appendChild(description);
  }

  if (ticket.status === 'Resuelto') {
    const resolution = document.createElement('p');
    resolution.className = 'ticket-resolution';
    resolution.dataset.ticketResolution = ticket.id || '';
    const summary = ticket.resolutionSummary || 'Resumen de solución no registrado';
    const when = ticket.resolvedAt ? ` · Resuelto: ${localDate(ticket.resolvedAt)}` : '';
    const legacy = ticket.legacyResolutionIncomplete ? ' · Ticket histórico sin datos verificables' : '';
    resolution.textContent = `Solución: ${summary}${when}${legacy}`;
    li.appendChild(resolution);
  }

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  if (ticket.status !== 'Resuelto') {
    const resolve = document.createElement('button');
    resolve.type = 'button';
    resolve.className = 'link-button';
    resolve.dataset.resolveTicket = ticket.id || '';
    resolve.textContent = 'Marcar como resuelto';
    actions.appendChild(resolve);
  }
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'link-button';
  edit.dataset.editTicket = ticket.id || '';
  edit.textContent = 'Editar';
  actions.appendChild(edit);
  li.appendChild(actions);

  return li;
}

export function renderTicketList(listEl, tickets = []) {
  if (!listEl) return false;
  listEl.innerHTML = '';
  if (!tickets || tickets.length === 0) return false;
  for (const ticket of tickets) listEl.appendChild(createTicketItem(ticket));
  return true;
}
