import { computeSlaDueAt, getSlaStatus, isValidCalendarDate, todayLocal } from '../crm-rules.js';
import { renderDataTable } from './data-table.js';
import { renderSlaIndicator, renderTicketStatus } from './ui.js';

const PRIORITY_RANK = { Alta: 0, Media: 1, Baja: 2 };

function localDate(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeOf(iso) {
  const parsed = Date.parse(String(iso ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dueTime(ticket) {
  const due = computeSlaDueAt(ticket && ticket.createdAt, ticket && ticket.priority);
  const parsed = due ? Date.parse(due) : NaN;
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function folioOf(ticket) {
  return String((ticket && ticket.folio) || '');
}

/**
 * Orden estable de la bandeja. `priority-sla` ordena Alta → Media → Baja y,
 * dentro de cada prioridad, el vencimiento más próximo; los empates se
 * resuelven por `createdAt` y `folio`.
 */
export function sortTickets(tickets = [], sortKey = 'priority-sla') {
  const list = [...(Array.isArray(tickets) ? tickets : [])];
  if (sortKey === 'recent') {
    return list.sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt) || folioOf(a).localeCompare(folioOf(b)));
  }
  if (sortKey === 'sla') {
    return list.sort(
      (a, b) =>
        dueTime(a) - dueTime(b) || timeOf(a.createdAt) - timeOf(b.createdAt) || folioOf(a).localeCompare(folioOf(b))
    );
  }
  return list.sort((a, b) => {
    const rankA = PRIORITY_RANK[a && a.priority] ?? 3;
    const rankB = PRIORITY_RANK[b && b.priority] ?? 3;
    return (
      rankA - rankB ||
      dueTime(a) - dueTime(b) ||
      timeOf(a.createdAt) - timeOf(b.createdAt) ||
      folioOf(a).localeCompare(folioOf(b))
    );
  });
}

/** Etiqueta de garantía calculada con el día local del dispositivo. */
export function warrantyLabel(ticket, today = todayLocal()) {
  const value = String((ticket && ticket.warrantyEndsAt) || '');
  if (!isValidCalendarDate(value)) return 'Garantía no registrada';
  return value >= today ? 'En garantía' : 'Fuera de garantía';
}

function requesterNameFor(ticket, contactsById) {
  if (ticket.requesterName) return ticket.requesterName;
  const contact = ticket.contactId ? contactsById.get(ticket.contactId) : null;
  return contact ? contact.name : 'Solicitante no registrado';
}

/** Fila embebida de la ficha del cliente (modo histórico del módulo). */
export function createTicketItem(ticket, options = {}) {
  const li = document.createElement('li');
  li.className = 'ticket-item';
  li.dataset.ticketId = ticket.id || '';

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const title = document.createElement('strong');
  title.textContent = ticket.subject || ticket.reason || 'Sin motivo';
  headline.appendChild(title);
  headline.appendChild(renderTicketStatus(ticket.status));
  li.appendChild(headline);

  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  meta.textContent = [
    `Folio: ${ticket.folio || 'sin folio'}`,
    `Motivo: ${ticket.reason || 'sin información'}`,
    `Prioridad: ${ticket.priority || 'sin información'}`,
    `Fecha: ${localDate(ticket.createdAt) || 'sin información'}`,
    `Producto: ${ticket.productName || ticket.productId || 'sin información'}`,
    `Equipo: ${ticket.equipmentReference || 'Equipo no individualizado'}`,
    `Técnico: ${ticket.assignee || 'Sin asignar'}`
  ].join(' · ');
  li.appendChild(meta);

  if (ticket.description) {
    const description = document.createElement('p');
    description.className = 'ticket-description';
    description.textContent = ticket.description;
    li.appendChild(description);
  }

  if (ticket.status === 'Resuelto' || ticket.status === 'Cerrado') {
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
  const detail = document.createElement('button');
  detail.type = 'button';
  detail.className = 'link-button';
  detail.dataset.openTicket = ticket.id || '';
  detail.textContent = 'Ver detalle';
  actions.appendChild(detail);
  if (ticket.status === 'En proceso' || ticket.status === 'En espera') {
    const resolve = document.createElement('button');
    resolve.type = 'button';
    resolve.className = 'link-button';
    resolve.dataset.resolveTicket = ticket.id || '';
    resolve.textContent = 'Resolver';
    actions.appendChild(resolve);
  }
  if (ticket.status !== 'Cerrado') {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'link-button';
    edit.dataset.editTicket = ticket.id || '';
    edit.textContent = 'Editar';
    actions.appendChild(edit);
  }
  li.appendChild(actions);

  if (options.onOpen) {
    detail.addEventListener('click', () => options.onOpen(ticket));
  }
  return li;
}

export function renderTicketList(listEl, tickets = [], options = {}) {
  if (!listEl) return false;
  listEl.innerHTML = '';
  if (!tickets || tickets.length === 0) return false;
  for (const ticket of tickets) listEl.appendChild(createTicketItem(ticket, options));
  return true;
}

/**
 * Columnas de la bandeja global. Reciben el ticket y resuelven cliente,
 * solicitante y SLA sin leer el almacenamiento.
 */
export function ticketInboxColumns({ entitiesById = new Map(), contactsById = new Map(), now = new Date() } = {}) {
  return [
    {
      key: 'folio',
      label: 'Folio',
      className: 'col-folio',
      render: (ticket) => {
        const code = document.createElement('code');
        code.textContent = ticket.folio || 'Sin folio';
        return code;
      }
    },
    {
      key: 'subject',
      label: 'Asunto',
      className: 'col-subject',
      render: (ticket) => ticket.subject || 'Sin asunto'
    },
    {
      key: 'client',
      label: 'Cliente',
      sortable: false,
      className: 'col-client',
      render: (ticket) => {
        const entity = entitiesById.get(ticket.entity_id);
        return entity ? entity.name : 'Cliente no disponible';
      }
    },
    {
      key: 'requester',
      label: 'Solicitante',
      sortable: false,
      className: 'col-requester',
      render: (ticket) => requesterNameFor(ticket, contactsById)
    },
    {
      key: 'channel',
      label: 'Canal',
      sortable: false,
      className: 'col-channel',
      render: (ticket) => ticket.channel || 'Canal no registrado'
    },
    {
      key: 'assignee',
      label: 'Técnico',
      sortable: false,
      className: 'col-assignee',
      render: (ticket) => ticket.assignee || 'Sin asignar'
    },
    {
      key: 'priority',
      label: 'Prioridad',
      render: (ticket) => ticket.priority || 'Sin prioridad'
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: false,
      render: (ticket) => renderTicketStatus(ticket.status)
    },
    {
      key: 'sla',
      label: 'SLA',
      render: (ticket) => renderSlaIndicator(getSlaStatus(ticket, now))
    }
  ];
}

/**
 * Tabla de la bandeja global: filas enfocables, etiqueta accesible y sin
 * acciones destructivas. El orden se calcula aquí y la tabla conserva el
 * `aria-sort` de la columna activa.
 */
export function renderTicketInboxTable({
  tickets = [],
  columns,
  sortKey = 'priority-sla',
  onSort = null,
  emptyState = null,
  ariaLabel = 'Bandeja de tickets'
} = {}) {
  const sorted = sortTickets(tickets, sortKey);
  const headerKey = sortKey === 'recent' ? 'folio' : sortKey === 'sla' ? 'sla' : 'priority';
  const direction = sortKey === 'recent' ? 'desc' : 'asc';
  return renderDataTable({
    caption: 'Tickets',
    columns,
    rows: sorted,
    sortKey: headerKey,
    sortDirection: direction,
    onSort,
    emptyState,
    ariaLabel,
    rowsAreSorted: true,
    rowAttributes: (ticket) => ({
      'data-ticket-id': ticket.id,
      tabindex: '0',
      'aria-label': `Abrir ticket ${ticket.folio || ''} ${ticket.subject || ''}`.trim(),
      className: 'ticket-row'
    })
  });
}

export { localDate };
