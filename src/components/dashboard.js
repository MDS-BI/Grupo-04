import { renderCommercialBoard } from './commercial-board.js';
import { getConfig, isCrmProfile } from '../module-config.js';
import { loadEntities, loadDocuments, loadActivities } from '../storage.js';
import {
  countClients,
  countOpenOpportunities,
  sumOpenAmount,
  overdueFollowUps,
  todayContacts,
  closeRate,
  formatCloseRate,
  activitiesToday,
  overdueActivities
} from '../crm-metrics.js';

export function recordCounts() {
  return {
    entities: loadEntities().length,
    documents: loadDocuments().length
  };
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function reportReadError(error) {
  const banner = document.getElementById('storage-warning');
  if (!banner) return;
  banner.textContent = error && error.message ? error.message : 'No se pudo leer la información guardada.';
  banner.hidden = false;
}

/**
 * Recalcula el panel en cada render a partir de los registros actuales.
 * No lee ni guarda totales derivados en localStorage.
 */
export function renderDashboard(options = {}) {
  const config = getConfig();
  const labels = config.labels;
  const crm = isCrmProfile(config);

  let entities = [];
  let documents = [];
  let activities = [];
  try {
    entities = loadEntities();
    documents = loadDocuments();
    activities = loadActivities();
  } catch (error) {
    reportReadError(error);
  }

  const isEmpty = entities.length === 0 && documents.length === 0;

  renderCommercialBoard(entities, documents, { onMove: options.onMove });

  const baseGrid = document.getElementById('base-stat-grid');
  if (baseGrid) baseGrid.hidden = crm;
  const crmGrid = document.getElementById('crm-stat-grid');
  if (crmGrid) crmGrid.hidden = !crm || isEmpty;
  const distribution = document.getElementById('stage-distribution');
  if (distribution) distribution.hidden = !crm || isEmpty;
  const emptyState = document.getElementById('dashboard-empty-state');
  if (emptyState) emptyState.hidden = !crm || !isEmpty;
  const hint = document.getElementById('dashboard-empty-hint');
  if (hint) hint.hidden = !crm || !isEmpty;
  const activityCard = document.getElementById('stat-activities-card');
  if (activityCard) activityCard.hidden = !crm;
  const activityOverdueCard = document.getElementById('stat-activities-overdue-card');
  if (activityOverdueCard) activityOverdueCard.hidden = !crm;

  setText('stat-entities', entities.length);
  setText('stat-documents', documents.length);
  setText('stat-entities-label', labels.entities);
  setText('stat-documents-label', labels.documents);

  if (!crm) return;

  const clients = countClients(entities);
  const openCount = countOpenOpportunities(documents);
  const openAmount = sumOpenAmount(documents);
  const overdue = overdueFollowUps(entities);
  const today = todayContacts(entities);
  const rate = closeRate(documents);

  setText('stat-clients', clients);
  setText('stat-open-opportunities', openCount);
  setText('stat-open-amount', openAmount);
  setText('stat-overdue-followups', overdue);
  setText('stat-today-contacts', today);
  setText('stat-close-rate', formatCloseRate(rate));
  setText('stat-activities-today', activitiesToday(activities));
  setText('stat-activities-overdue', overdueActivities(activities));

  setText('stat-clients-label', `${labels.entities} registrados`);
  setText('stat-open-opportunities-label', `${labels.documents} abiertas`);
  setText('stat-open-amount-label', 'Monto abierto (CLP)');
  setText('stat-overdue-followups-label', 'Seguimientos vencidos');
  setText('stat-today-contacts-label', 'Contactos para hoy');
  setText('stat-close-rate-label', 'Tasa de cierre');
  setText('stat-activities-label', 'Actividades para hoy');
  setText('stat-activities-overdue-label', 'Actividades vencidas');
}
