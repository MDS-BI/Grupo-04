import { renderCommercialBoard } from './commercial-board.js';
import { getConfig, isCrmProfile } from '../module-config.js';
import { loadEntities, loadDocuments } from '../storage.js';
import {
  countClients,
  countOpenOpportunities,
  sumOpenAmount,
  overdueFollowUps,
  todayContacts,
  closeRate,
  formatCloseRate
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
export function renderDashboard() {
  const config = getConfig();
  const labels = config.labels;
  const crm = isCrmProfile(config);

  let entities = [];
  let documents = [];
  try {
    entities = loadEntities();
    documents = loadDocuments();
  } catch (error) {
    reportReadError(error);
  }

  renderCommercialBoard(entities, documents);

  const baseGrid = document.getElementById('base-stat-grid');
  if (baseGrid) baseGrid.hidden = crm;
  const crmGrid = document.getElementById('crm-stat-grid');
  if (crmGrid) crmGrid.hidden = !crm;

  setText('stat-entities', entities.length);
  setText('stat-documents', documents.length);
  setText('stat-entities-label', labels.entities);
  setText('stat-documents-label', labels.documents);

  const hint = document.getElementById('dashboard-empty-hint');
  if (!crm) {
    if (hint) hint.hidden = true;
    return;
  }

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

  setText('stat-clients-label', `${labels.entities} registrados`);
  setText('stat-open-opportunities-label', `${labels.documents} abiertas`);
  setText('stat-open-amount-label', 'Monto abierto (CLP)');
  setText('stat-overdue-followups-label', 'Seguimientos vencidos');
  setText('stat-today-contacts-label', 'Contactos para hoy');
  setText('stat-close-rate-label', 'Tasa de cierre');

  if (hint) hint.hidden = !(entities.length === 0 && documents.length === 0);
}
