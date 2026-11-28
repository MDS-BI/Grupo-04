// Indicadores descriptivos del panel CRM. Funciones puras: no leen localStorage
// ni el DOM y no persisten totales derivados.
import { compareCalendarDates, isValidCalendarDate, todayLocal, computeSlaDueAt, getSlaStatus } from './crm-rules.js';

export const OPEN_STATUSES = Object.freeze(['Nueva', 'Contactada', 'Propuesta', 'Negociación']);
export const TICKET_OPEN_STATUSES = Object.freeze(['Nuevo', 'En proceso', 'En espera']);
export const TICKET_PRIORITY_ORDER = Object.freeze(['Alta', 'Media', 'Baja']);

function isOpen(document) {
  return Boolean(document) && OPEN_STATUSES.includes(document.status);
}

function asTickets(tickets) {
  return Array.isArray(tickets) ? tickets.filter(Boolean) : [];
}

function isOpenTicket(ticket) {
  return TICKET_OPEN_STATUSES.includes(String(ticket && ticket.status));
}

function isResolvedTicket(ticket) {
  return Boolean(ticket) && (ticket.status === 'Resuelto' || ticket.status === 'Cerrado');
}

/** Clientes registrados: todos, incluidos prospectos e inactivos. */
export function countClients(entities = []) {
  return Array.isArray(entities) ? entities.length : 0;
}

/** Oportunidades abiertas: Nueva, Contactada, Propuesta o Negociación. */
export function countOpenOpportunities(documents = []) {
  if (!Array.isArray(documents)) return 0;
  return documents.filter(isOpen).length;
}

/** Monto abierto: suma de totalAmount de oportunidades abiertas, sin ponderar. */
export function sumOpenAmount(documents = []) {
  if (!Array.isArray(documents)) return 0;
  return documents.filter(isOpen).reduce((total, document) => {
    const amount = Number(document.totalAmount);
    return Number.isFinite(amount) && amount >= 0 ? total + amount : total;
  }, 0);
}

function activeClients(entities) {
  return entities.filter((entity) => entity && entity.category !== 'Inactivo');
}

function uniqueByEntity(clients) {
  const seen = new Set();
  const unique = [];
  for (const client of clients) {
    const key = client.entity_id || client.id || client.code;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(client);
  }
  return unique;
}

function clientsWithValidTargetDate(entities) {
  return uniqueByEntity(activeClients(entities)).filter(
    (entity) => entity.targetDate && isValidCalendarDate(String(entity.targetDate))
  );
}

/** Seguimientos vencidos: clientes activos con targetDate anterior a hoy local. */
export function overdueFollowUps(entities = [], today = todayLocal()) {
  if (!Array.isArray(entities)) return 0;
  return clientsWithValidTargetDate(entities).filter(
    (entity) => compareCalendarDates(String(entity.targetDate), today) < 0
  ).length;
}

/** Contactos para hoy: clientes activos con targetDate igual a hoy local. */
export function todayContacts(entities = [], today = todayLocal()) {
  if (!Array.isArray(entities)) return 0;
  return clientsWithValidTargetDate(entities).filter(
    (entity) => compareCalendarDates(String(entity.targetDate), today) === 0
  ).length;
}

/**
 * Tasa de cierre: Ganadas / (Ganadas + Perdidas) × 100.
 * Devuelve null ("Sin datos") cuando el denominador es cero.
 */
export function closeRate(documents = []) {
  if (!Array.isArray(documents)) return null;
  const won = documents.filter((document) => document && document.status === 'Ganada').length;
  const lost = documents.filter((document) => document && document.status === 'Perdida').length;
  const closed = won + lost;
  if (closed === 0) return null;
  return Math.round((won / closed) * 100);
}

/** Presentación de la tasa de cierre en el panel. */
export function formatCloseRate(rate) {
  return rate === null || rate === undefined ? 'Sin datos' : `${rate}%`;
}

/** Actividades para hoy: pendientes con vencimiento igual al día local. */
export function activitiesToday(activities = [], today = todayLocal()) {
  if (!Array.isArray(activities)) return 0;
  return activities.filter(
    (activity) => activity && activity.status !== 'completada' && activity.dueDate && String(activity.dueDate) === today
  ).length;
}

/** Actividades vencidas: pendientes con vencimiento anterior al día local. */
export function overdueActivities(activities = [], today = todayLocal()) {
  if (!Array.isArray(activities)) return 0;
  return activities.filter((activity) => {
    if (!activity || activity.status === 'completada') return false;
    const dueDate = String(activity.dueDate ?? '');
    if (!isValidCalendarDate(dueDate)) return false;
    return compareCalendarDates(dueDate, today) < 0;
  }).length;
}

/**
 * Distribución de oportunidades por estado del ciclo de vida.
 *
 * Devuelve un `StageBucket` por estado, en el orden recibido e incluyendo los
 * estados en cero. No depende de `ModuleConfig`, no persiste nada y no calcula
 * tasas de conversión: es una vista descriptiva para la banda de distribución
 * y el tablero, que comparten esta única llamada.
 */
export function stageDistribution(documents = [], statuses = []) {
  if (!Array.isArray(statuses) || statuses.length === 0) return [];
  const buckets = statuses.map((status) => ({ status, count: 0, amount: 0 }));
  const byStatus = new Map(buckets.map((bucket) => [bucket.status, bucket]));
  if (!Array.isArray(documents)) return buckets;

  for (const document of documents) {
    if (!document) continue;
    const bucket = byStatus.get(document.status);
    if (!bucket) continue;
    bucket.count += 1;
    const amount = Number(document.totalAmount);
    if (Number.isFinite(amount) && amount >= 0) bucket.amount += amount;
  }
  return buckets;
}

/** Tickets abiertos: Nuevo, En proceso o En espera. */
export function countOpenTickets(tickets = []) {
  return asTickets(tickets).filter(isOpenTicket).length;
}

/** Tickets abiertos con el SLA vencido en el instante indicado. */
export function countOverdueTickets(tickets = [], now = new Date()) {
  return asTickets(tickets).filter((ticket) => isOpenTicket(ticket) && getSlaStatus(ticket, now) === 'Vencido').length;
}

/** Distribución de tickets abiertos por prioridad, incluidos los ceros. */
export function ticketPriorityDistribution(tickets = []) {
  const open = asTickets(tickets).filter(isOpenTicket);
  return TICKET_PRIORITY_ORDER.map((priority) => ({
    priority,
    count: open.filter((ticket) => ticket.priority === priority).length
  }));
}

/** Tiempo medio de resolución en horas sobre fechas válidas, una decimal. */
export function averageResolutionHours(tickets = []) {
  const values = [];
  for (const ticket of asTickets(tickets)) {
    if (!isResolvedTicket(ticket)) continue;
    const start = Date.parse(String(ticket.createdAt ?? ''));
    const end = Date.parse(String(ticket.resolvedAt ?? ''));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    values.push((end - start) / (60 * 60 * 1000));
  }
  if (values.length === 0) return null;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

/** Cumplimiento de SLA: resueltos dentro del objetivo / con SLA calculable × 100. */
export function slaCompliance(tickets = []) {
  let total = 0;
  let met = 0;
  for (const ticket of asTickets(tickets)) {
    if (!isResolvedTicket(ticket)) continue;
    const due = computeSlaDueAt(ticket.createdAt, ticket.priority);
    const resolved = Date.parse(String(ticket.resolvedAt ?? ''));
    if (!due || !Number.isFinite(resolved)) continue;
    total += 1;
    if (resolved <= Date.parse(due)) met += 1;
  }
  if (total === 0) return null;
  return Math.round((met / total) * 1000) / 10;
}

/** Promedio de satisfacciones válidas (enteros 1–5), una decimal. */
export function averageSatisfaction(tickets = []) {
  const values = asTickets(tickets)
    .map((ticket) => ticket.satisfactionScore)
    .filter((score) => Number.isInteger(score) && score >= 1 && score <= 5);
  if (values.length === 0) return null;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

/** Formato de una cifra decimal compartido por panel y ficha del cliente. */
export function formatOneDecimal(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Sin datos';
  return Number(value).toFixed(1);
}
