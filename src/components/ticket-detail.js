import { getSlaStatus } from '../crm-rules.js';
import { openOverlay } from './ui-overlay.js';
import { renderSlaIndicator } from './ui.js';
import { warrantyLabel, localDate } from './ticket-list.js';

const HISTORY_LABELS = {
  creacion: 'Creación',
  estado: 'Cambio de estado',
  prioridad: 'Cambio de prioridad',
  asignacion: 'Asignación de técnico',
  equipo: 'Cambio de equipo',
  resolucion: 'Resolución',
  cierre: 'Cierre',
  satisfaccion: 'Satisfacción',
  migracion: 'Migración'
};

function detailRow(list, label, value, id) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  if (id) dd.id = id;
  dd.textContent = value === undefined || value === null || String(value).trim() === '' ? 'Sin datos' : String(value);
  list.append(dt, dd);
}

function actionButton(id, label, className, onClick, dataset = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = className;
  button.textContent = label;
  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });
  button.addEventListener('click', onClick);
  return button;
}

function historyEvents(ticket) {
  const events = Array.isArray(ticket.history) ? ticket.history : [];
  return events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const difference = Date.parse(String(right.event.at)) - Date.parse(String(left.event.at));
      return Number.isFinite(difference) && difference !== 0 ? difference : right.index - left.index;
    })
    .map((item) => item.event);
}

function latestSatisfactionDate(ticket) {
  const events = (Array.isArray(ticket.history) ? ticket.history : []).filter((event) => event.type === 'satisfaccion');
  return events.length > 0 ? events[events.length - 1].at : null;
}

/**
 * Drawer de solo lectura con las acciones por estado, la satisfacción y el
 * historial. No crea una ruta de detalle ni un formulario paralelo: “Editar”
 * delega en el formulario existente.
 */
export function openTicketDetail({
  ticket,
  client = null,
  contacts = [],
  documents = [],
  returnFocus = null,
  now = new Date(),
  onEdit = null,
  onAssign = null,
  onChangeStatus = null,
  onResolve = null,
  onCloseTicket = null,
  onDelete = null,
  onSatisfaction = null
} = {}) {
  if (!ticket) return null;

  const content = document.createElement('div');
  content.className = 'ticket-detail';

  const identification = document.createElement('dl');
  identification.className = 'detail-grid';
  detailRow(identification, 'Folio', ticket.folio, 'ticket-detail-folio');
  detailRow(identification, 'Asunto', ticket.subject, 'ticket-detail-subject');
  detailRow(identification, 'Estado', ticket.status, 'ticket-detail-status');
  detailRow(identification, 'Prioridad', ticket.priority, 'ticket-detail-priority');
  const slaRow = document.createElement('dd');
  slaRow.id = 'ticket-detail-sla';
  slaRow.appendChild(renderSlaIndicator(getSlaStatus(ticket, now)));
  const slaLabel = document.createElement('dt');
  slaLabel.textContent = 'SLA';
  identification.append(slaLabel, slaRow);
  detailRow(
    identification,
    'Cliente',
    client ? `${client.name} (${client.code})` : 'Cliente no disponible',
    'ticket-detail-client'
  );
  const contact = ticket.contactId ? contacts.find((item) => item && item.id === ticket.contactId) : null;
  detailRow(
    identification,
    'Solicitante',
    ticket.requesterName || (contact ? contact.name : 'Solicitante no registrado'),
    'ticket-detail-requester'
  );
  detailRow(identification, 'Canal', ticket.channel || 'Canal no registrado', 'ticket-detail-channel');
  detailRow(identification, 'Técnico', ticket.assignee || 'Sin asignar', 'ticket-detail-assignee');
  detailRow(identification, 'Equipo', ticket.team || 'Sin asignar', 'ticket-detail-team');
  detailRow(identification, 'Producto', ticket.productName || ticket.productId || 'Sin datos', 'ticket-detail-product');
  detailRow(identification, 'Equipo físico', ticket.equipmentReference || 'Sin datos', 'ticket-detail-equipment');
  detailRow(identification, 'Garantía', warrantyLabel(ticket), 'ticket-detail-warranty');
  const linkedDocument = ticket.documentId ? documents.find((item) => item && item.id === ticket.documentId) : null;
  detailRow(
    identification,
    'Venta de origen',
    ticket.documentId
      ? linkedDocument
        ? `${linkedDocument.series || 'OPP'}-${linkedDocument.folio} · ${linkedDocument.opportunityTitle || 'Sin asunto'}`
        : 'Venta de origen no disponible'
      : 'Sin vínculo',
    'ticket-detail-document'
  );
  detailRow(identification, 'Descripción', ticket.description, 'ticket-detail-description');
  detailRow(
    identification,
    'Primera respuesta',
    ticket.firstResponseAt ? localDate(ticket.firstResponseAt) : 'Sin datos',
    'ticket-detail-first-response'
  );
  detailRow(identification, 'Resolución', ticket.resolutionSummary || 'Sin datos', 'ticket-detail-resolution');
  detailRow(
    identification,
    'Resuelto el',
    ticket.resolvedAt ? localDate(ticket.resolvedAt) : 'Sin datos',
    'ticket-detail-resolved-at'
  );
  detailRow(
    identification,
    'Cerrado el',
    ticket.closedAt ? localDate(ticket.closedAt) : 'Sin datos',
    'ticket-detail-closed-at'
  );
  content.appendChild(identification);

  const satisfaction = document.createElement('section');
  satisfaction.className = 'ticket-detail__section';
  const satisfactionTitle = document.createElement('h3');
  satisfactionTitle.textContent = 'Satisfacción';
  const satisfactionBody = document.createElement('div');
  satisfactionBody.id = 'ticket-detail-satisfaction';
  if (Number.isInteger(ticket.satisfactionScore)) {
    const score = document.createElement('p');
    score.textContent = `Nota: ${ticket.satisfactionScore} / 5`;
    satisfactionBody.appendChild(score);
    if (ticket.satisfactionComment) {
      const comment = document.createElement('p');
      comment.textContent = ticket.satisfactionComment;
      satisfactionBody.appendChild(comment);
    }
    const at = latestSatisfactionDate(ticket);
    if (at) {
      const date = document.createElement('p');
      date.className = 'muted';
      date.textContent = `Registrada: ${localDate(at)}`;
      satisfactionBody.appendChild(date);
    }
  } else {
    satisfactionBody.textContent = 'Sin satisfacción registrada';
  }
  satisfaction.append(satisfactionTitle, satisfactionBody);
  content.appendChild(satisfaction);

  const historySection = document.createElement('section');
  historySection.className = 'ticket-detail__section';
  const historyTitle = document.createElement('h3');
  historyTitle.textContent = 'Historial';
  const history = document.createElement('ol');
  history.id = 'ticket-detail-history';
  history.setAttribute('role', 'list');
  history.className = 'ticket-history';
  const events = historyEvents(ticket);
  if (events.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Sin cambios registrados';
    history.appendChild(empty);
  } else {
    for (const event of events) {
      const item = document.createElement('li');
      item.className = 'ticket-history__event';
      const header = document.createElement('strong');
      header.textContent = HISTORY_LABELS[event.type] || event.type;
      item.appendChild(header);
      const meta = document.createElement('span');
      meta.className = 'muted';
      meta.textContent = [localDate(event.at), event.actor || 'Sistema'].filter(Boolean).join(' · ');
      item.appendChild(meta);
      if (event.from !== undefined || event.to !== undefined) {
        const change = document.createElement('p');
        change.textContent = `${event.from ?? '—'} → ${event.to ?? '—'}`;
        item.appendChild(change);
      }
      if (event.note) {
        const note = document.createElement('p');
        note.textContent = event.note;
        item.appendChild(note);
      }
      history.appendChild(item);
    }
  }
  historySection.append(historyTitle, history);
  content.appendChild(historySection);

  const actions = document.createElement('div');
  actions.className = 'inline-actions ticket-detail__actions';
  const status = ticket.status;
  if (status !== 'Cerrado') {
    actions.appendChild(actionButton('ticket-detail-edit', 'Editar', 'secondary', () => onEdit && onEdit(ticket)));
  }
  if (['Nuevo', 'En proceso', 'En espera'].includes(status)) {
    actions.appendChild(
      actionButton('ticket-detail-assign', 'Asignar', 'secondary', () => onAssign && onAssign(ticket))
    );
  }
  if (status !== 'Cerrado') {
    actions.appendChild(
      actionButton(
        'ticket-detail-change-status',
        'Cambiar estado',
        'secondary',
        () => onChangeStatus && onChangeStatus(ticket)
      )
    );
  }
  if (status === 'En proceso' || status === 'En espera') {
    actions.appendChild(
      actionButton('ticket-detail-resolve', 'Resolver', 'primary', () => onResolve && onResolve(ticket))
    );
  }
  if (status === 'Resuelto') {
    actions.appendChild(
      actionButton('ticket-detail-close', 'Cerrar', 'secondary', () => onCloseTicket && onCloseTicket(ticket))
    );
  }
  if (status === 'Resuelto' && !Number.isInteger(ticket.satisfactionScore)) {
    actions.appendChild(
      actionButton(
        'ticket-detail-satisfaction-action',
        'Registrar satisfacción',
        'secondary',
        () => onSatisfaction && onSatisfaction(ticket)
      )
    );
  }
  actions.appendChild(actionButton('ticket-detail-delete', 'Eliminar', 'danger', () => onDelete && onDelete(ticket)));
  content.appendChild(actions);

  return openOverlay({
    id: 'ticket-detail',
    variant: 'drawer',
    title: `Ticket ${ticket.folio || ''}`.trim(),
    content,
    returnFocus: returnFocus || document.activeElement,
    isDirty: false
  });
}
