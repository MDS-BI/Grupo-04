/**
 * Timeline por cliente y oportunidad (US-14). Función pura: no lee
 * `localStorage` ni el DOM, no mezcla eventos de sistema ni cambios de etapa.
 */

import { isValidCalendarDate } from './crm-rules.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function calendarDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const candidate = text.length > 10 ? text.slice(0, 10) : text;
  return isValidCalendarDate(candidate) ? candidate : null;
}

function timestampOf(date) {
  const parsed = Date.parse(`${date}T00:00:00`);
  return Number.isNaN(parsed) ? null : parsed;
}

function activityEvent(activity) {
  const date = calendarDate(activity.dueDate) || calendarDate(activity.createdAt) || null;
  if (!date) return null;
  return {
    id: `activity:${activity.id}`,
    recordId: activity.id,
    kind: 'activity',
    type: activity.type || 'nota',
    date,
    timestamp: timestampOf(date),
    title: activity.subject || 'Actividad sin asunto',
    summary: activity.notes || '',
    owner: activity.owner || '',
    status: activity.status || 'pendiente'
  };
}

function ticketEvent(ticket) {
  const createdAt = calendarDate(ticket.createdAt);
  const resolvedAt = calendarDate(ticket.resolvedAt);
  const date = resolvedAt || createdAt;
  if (!date) return null;
  const title = ticket.subject
    ? `Ticket ${ticket.folio ? `${ticket.folio} · ` : ''}${ticket.subject}`
    : ticket.reason
      ? `Ticket: ${ticket.reason}`
      : 'Ticket de soporte';
  return {
    id: `ticket:${ticket.id}`,
    recordId: ticket.id,
    kind: 'ticket',
    type: 'ticket',
    date,
    timestamp: timestampOf(date),
    title,
    summary: [ticket.description, ticket.resolutionSummary].filter(Boolean).join(' · '),
    owner: ticket.assignee || '',
    status: ticket.status || 'Nuevo'
  };
}

/**
 * Construye los eventos ordenados del más reciente al más antiguo.
 *
 * @param {{activities?: Array, tickets?: Array, entityId?: string, documentId?: string}} source
 * @param {{type?: string, kind?: string, from?: string, to?: string}} filters
 */
export function buildTimeline({ activities, tickets, entityId, documentId } = {}, filters = {}) {
  const events = [];
  for (const activity of asArray(activities)) {
    if (!activity) continue;
    if (documentId) {
      if (activity.documentId !== documentId) continue;
    } else if (entityId && activity.entity_id !== entityId) {
      continue;
    }
    const event = activityEvent(activity);
    if (event) events.push(event);
  }
  if (!documentId) {
    for (const ticket of asArray(tickets)) {
      if (!ticket) continue;
      if (entityId && ticket.entity_id !== entityId) continue;
      const event = ticketEvent(ticket);
      if (event) events.push(event);
    }
  }

  const type = filters.type ? String(filters.type).trim() : '';
  const kind = filters.kind ? String(filters.kind).trim() : '';
  const from = calendarDate(filters.from);
  const to = calendarDate(filters.to);

  return events
    .filter((event) => (type ? event.type === type : true))
    .filter((event) => (kind ? event.kind === kind : true))
    .filter((event) => (from ? event.date >= from : true))
    .filter((event) => (to ? event.date <= to : true))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0) || b.date.localeCompare(a.date));
}
