// Indicadores descriptivos del panel CRM. Funciones puras: no leen localStorage
// ni el DOM y no persisten totales derivados.
import { compareCalendarDates, isValidCalendarDate, todayLocal } from './crm-rules.js';

export const OPEN_STATUSES = Object.freeze(['Nueva', 'Contactada', 'Propuesta', 'Negociación']);

function isOpen(document) {
  return Boolean(document) && OPEN_STATUSES.includes(document.status);
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
