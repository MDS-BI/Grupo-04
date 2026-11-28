import {
  loadModuleConfig,
  normalizeConfig,
  setActiveConfig,
  getConfig,
  labelFor,
  isCrmProfile
} from './module-config.js';
import {
  loadEntities,
  addEntity,
  updateEntity,
  deleteEntity,
  validateEntity,
  searchEntities,
  loadDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  validateDocument,
  countDocumentsForEntity,
  loadTickets,
  addTicket,
  updateTicket,
  resolveTicket as resolveTicketStorage,
  assignTicket,
  changeTicketStatus,
  closeTicket,
  deleteTicket,
  registerSatisfaction,
  countTicketsForEntity,
  loadContacts,
  saveContacts,
  addContact,
  updateContact,
  deleteContact,
  countContactsForEntity,
  loadActivities,
  addActivity,
  updateActivity,
  deleteActivity,
  completeActivityById,
  countActivitiesForEntity,
  loadTrash,
  loadSnapshot,
  restoreFromTrash,
  purgeTrashEntry,
  recoverPendingOperation,
  isWriteBlocked,
  isCrmStorageKey,
  getStoredSchemaVersion,
  requestMigration,
  applyMigration,
  loadMigrationBackup,
  restoreMigrationBackup,
  SCHEMA_VERSION
} from './storage.js';
import {
  validateClient,
  validateOpportunity,
  validateTicket,
  validateContact,
  validateActivity,
  migrateLegacyContactName,
  searchClients,
  searchOpportunities,
  nextTicketStatuses
} from './crm-rules.js';
import { buildTimeline } from './crm-timeline.js';
import { clearEntityForm, startEntityEdit, collectEntityPayload, showEntityErrors } from './components/entity-form.js';
import { createEntityItem, renderClientTable } from './components/entity-list.js';
import {
  clearDocumentForm,
  startDocumentEdit,
  collectDocumentPayload,
  showDocumentErrors,
  setDocumentContactValue
} from './components/document-form.js';
import { createDocumentItem, folioLabel, renderOpportunityTable } from './components/document-list.js';
import { renderLogo, applyShellLabels, setActiveNav, toggleNavSection } from './components/shell.js';
import { renderDashboard } from './components/dashboard.js';
import { setupSearchBar, readSearchFilters, clearSearchFilters } from './components/search-bar.js';
import { renderSearchResults } from './components/search-results.js';
import { renderEntityDetail, renderOpportunityDetail } from './components/entity-detail.js';
import {
  openOverlay,
  closeOverlay,
  getTopOverlay,
  openLossReasonDialog,
  openContactReassignDialog,
  openConfirmDialog
} from './components/ui-overlay.js';
import { renderEmptyState } from './components/ui.js';
import { renderFilterChips, syncFilterChips } from './components/filter-chips.js';
import { openQuickCreateClient } from './components/quick-create-client.js';
import {
  prepareTicketForm,
  clearTicketForm,
  startTicketEdit,
  collectTicketPayload,
  showTicketErrors,
  populateTicketContacts,
  populateTicketDocuments,
  setTicketFormContacts,
  fillRequesterFromContact
} from './components/ticket-form.js';
import { renderTicketList, renderTicketInboxTable, ticketInboxColumns } from './components/ticket-list.js';
import { openTicketDetail } from './components/ticket-detail.js';
import {
  clearContactForm,
  startContactEdit,
  collectContactPayload,
  showContactErrors
} from './components/contact-form.js';
import {
  prepareActivityForm,
  populateActivityLinks,
  clearActivityForm,
  startActivityEdit,
  collectActivityPayload,
  showActivityErrors,
  syncDueDateRequirement
} from './components/activity-form.js';
import { renderActivityList } from './components/activity-list.js';
import { renderTrashList } from './components/trash-list.js';

function qs(id) {
  return document.getElementById(id);
}

// Ayudantes de género gramatical para etiquetas configurables en español.
// El género se deduce de la primera palabra (p. ej., "Pedido de Venta" → masculino)
// usando terminaciones femeninas comunes (-a, -dad, -ción, ...).
const palabraClave = (word) => String(word).trim().split(/\s+/)[0] || '';
const esFemenina = (word) => /(a|dad|tad|ción|sión|tud|umbre|ie)$/i.test(palabraClave(word));
const articulo = (word) => (esFemenina(word) ? 'la' : 'el');
const deArticulo = (word) => (esFemenina(word) ? 'de la' : 'del');
const demostrativo = (word) => (esFemenina(word) ? 'esta' : 'este');
const seleccionada = (word) => (esFemenina(word) ? 'seleccionada' : 'seleccionado');

/**
 * Construye "N etiqueta" respetando singular/plural del perfil. `kind` usa las
 * claves de `ModuleConfig`; los tickets no son una etiqueta configurable.
 */
const PLURAL_KIND = {
  entity: 'entities',
  document: 'documents',
  contact: 'contacts',
  activity: 'activities'
};

function countLabel(count, kind) {
  if (!count) return '';
  const label =
    kind === 'ticket'
      ? count === 1
        ? 'ticket'
        : 'tickets'
      : labelFor(count === 1 ? kind : PLURAL_KIND[kind]).toLowerCase();
  return `${count} ${label}`;
}

/** Une una lista en español con coma y "y" antes del último elemento. */
function joinWithY(parts) {
  const list = parts.filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
}

const VIEW_IDS = {
  dashboard: 'view-dashboard',
  entities: 'view-entities',
  documents: 'view-documents',
  tickets: 'view-tickets',
  search: 'view-search',
  activities: 'view-activities',
  trash: 'view-trash'
};

let wired = false;
let currentView = null;
let currentClientEntityId = null;
let dirty = false;
let staleStorage = false;
let integrityBlocked = false;
let openFormOverlay = null;
let filtersExpanded = false;
let clientSort = { key: 'name', direction: 'asc' };
let opportunitySort = { key: 'folio', direction: 'asc' };
let searchClientSort = { key: 'name', direction: 'asc' };
let searchOpportunitySort = { key: 'folio', direction: 'asc' };
let clientTimelineState = { filters: {} };
let opportunityTimelineState = { filters: {} };
let ticketInboxState = { status: '', priority: '', assignee: '', sort: 'priority-sla' };
let openTicketDetailId = null;

function nextSortState(state, key) {
  if (state.key === key) {
    return { key, direction: state.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
}

function focusSortHeader(container, key) {
  if (!container) return;
  const button = container.querySelector(`th button[data-sort="${key}"]`);
  if (button && typeof button.focus === 'function') button.focus();
}

function availableViews() {
  return ['dashboard', 'entities', 'documents', 'tickets', 'search', 'activities', 'trash'];
}

function fallbackView() {
  return 'dashboard';
}

function readViewFromHash() {
  const location = typeof window !== 'undefined' ? window.location : undefined;
  const raw = location && location.hash ? String(location.hash).replace(/^#\/?/, '') : '';
  return availableViews().includes(raw) ? raw : fallbackView();
}

function updateHash(name, replace) {
  if (typeof window === 'undefined' || !window.location) return;
  const target = `#${name}`;
  if (window.location.hash === target) return;
  try {
    const url = `${window.location.pathname}${window.location.search}${target}`;
    if (replace && window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', url);
    } else if (window.history && typeof window.history.pushState === 'function') {
      window.history.pushState(null, '', url);
    } else {
      window.location.hash = target;
    }
  } catch {
    // Un enlace directo no disponible no debe impedir la navegación interna.
  }
}

function scrollToTop() {
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // jsdom sin implementación de scroll.
    }
  }
}

function showStorageWarning(message) {
  const banner = qs('storage-warning');
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

function hideStorageWarning() {
  const banner = qs('storage-warning');
  if (!banner) return;
  banner.hidden = true;
  banner.textContent = '';
}

function reportDataError(error) {
  showStorageWarning(error && error.message ? error.message : 'No se pudo leer la información guardada.');
}

function showFormMessage(id, message, kind = 'success') {
  const el = qs(id);
  if (!el) return;
  el.textContent = message;
  el.className = `message${kind === 'error' ? ' message-error' : ' message-success'}`;
}

/**
 * Confirmación única de descarte. Usa el modal `confirm-discard` de
 * `ui-overlay`; nunca `window.confirm()`.
 */
function confirmDiscardChanges({ onDiscard, onKeepEditing } = {}) {
  if (getTopOverlay() && getTopOverlay().id === 'confirm-discard') return null;

  const content = document.createElement('div');
  content.className = 'overlay__confirm';

  const text = document.createElement('p');
  text.className = 'overlay__text';
  text.textContent = 'Tienes cambios sin guardar. Si descartas, se perderán.';
  content.appendChild(text);

  const actions = document.createElement('div');
  actions.className = 'overlay__actions';
  const keep = document.createElement('button');
  keep.type = 'button';
  keep.className = 'btn btn-secondary';
  keep.setAttribute('data-cancel-discard', '');
  keep.textContent = 'Seguir editando';
  const discard = document.createElement('button');
  discard.type = 'button';
  discard.className = 'btn btn-danger';
  discard.setAttribute('data-confirm-discard', '');
  discard.textContent = 'Descartar';
  actions.append(keep, discard);
  content.appendChild(actions);

  let settled = false;
  openOverlay({
    id: 'confirm-discard',
    variant: 'modal',
    title: 'Descartar cambios',
    content,
    returnFocus: document.activeElement,
    onClose: () => {
      if (settled) return;
      settled = true;
      if (typeof onKeepEditing === 'function') onKeepEditing();
    }
  });

  keep.addEventListener('click', () => {
    settled = true;
    closeOverlay('confirm-discard', { force: true });
    if (typeof onKeepEditing === 'function') onKeepEditing();
  });

  discard.addEventListener('click', () => {
    settled = true;
    closeOverlay('confirm-discard', { force: true });
    dirty = false;
    if (typeof onDiscard === 'function') onDiscard();
  });

  return { keep, discard };
}

function firstFormField(container) {
  if (!container) return null;
  return (
    [...container.querySelectorAll('input, select, textarea')].find(
      (element) => element.type !== 'hidden' && !element.disabled && !element.hidden && !element.closest('[hidden]')
    ) || null
  );
}

function focusFirstInvalid(container) {
  const scope = container || document;
  const invalid = scope.querySelector('[aria-invalid="true"]');
  if (invalid && typeof invalid.focus === 'function') {
    invalid.focus();
    return true;
  }
  return false;
}

const FORM_DRAWERS = {
  entities: { formId: 'entity-form', labelKey: 'entity' },
  documents: { formId: 'document-form', labelKey: 'document' },
  tickets: { formId: 'ticket-form', labelKey: null }
};

function drawerTitle(module, mode) {
  if (module === 'tickets') return mode === 'new' ? 'Nuevo ticket' : 'Editar ticket';
  const def = FORM_DRAWERS[module];
  const label = labelFor(def.labelKey);
  return mode === 'new'
    ? `${esFemenina(label) ? 'Nueva' : 'Nuevo'} ${label.toLowerCase()}`
    : `Editar ${label.toLowerCase()}`;
}

/**
 * Traslada el formulario existente al drawer, sin clonarlo ni recrearlo, y lo
 * devuelve a su contenedor original al cerrar. Las tarjetas de cliente y
 * oportunidad viajan completas; el formulario de ticket viaja solo porque
 * vive dentro de la ficha del cliente.
 */
function openFormDrawer(module, mode = 'new') {
  const def = FORM_DRAWERS[module];
  if (!def) return null;
  const form = qs(def.formId);
  if (!form) return null;
  const content = module === 'tickets' ? form : form.closest('.card');
  if (!content) return null;

  if (openFormOverlay && openFormOverlay.module === module) {
    const field = firstFormField(content);
    if (field) field.focus();
    return openFormOverlay.id;
  }
  if (openFormOverlay) closeFormDrawer({ force: true });

  if (mode === 'new') {
    if (module === 'entities') clearEntityForm();
    else if (module === 'documents') clearDocumentForm();
    else clearTicketForm();
  }
  dirty = false;

  const parent = content.parentNode;
  const next = content.nextSibling;
  const returnFocus = document.activeElement;
  const id = `${module}-drawer`;
  if (module === 'tickets') content.hidden = false;

  openOverlay({
    id,
    variant: 'drawer',
    title: drawerTitle(module, mode),
    content,
    returnFocus,
    isDirty: () => dirty,
    onClose: () => {
      if (next && next.parentNode === parent) parent.insertBefore(content, next);
      else parent.appendChild(content);
      if (module === 'tickets') content.hidden = true;
      dirty = false;
      openFormOverlay = null;
      setActiveNav({ view: currentView, mode: 'list' });
    }
  });

  openFormOverlay = { id, module, card: content, parent, next };
  setActiveNav({ view: currentView, mode: mode === 'new' ? 'new' : 'list' });

  const field = firstFormField(content);
  if (field) field.focus();
  return id;
}

function closeFormDrawer({ force = true } = {}) {
  if (!openFormOverlay) return;
  closeOverlay(openFormOverlay.id, { force });
}

/** Abre el drawer de alta sobre el módulo indicado (acciones del panel). */
function openNewDrawer(module) {
  if (!showModule(module, { newRecord: true })) return false;
  return Boolean(openFormDrawer(module, 'new'));
}

/** Cierra el drawer del módulo tras guardar, sin abrir la confirmación. */
function finishFormDrawer(module) {
  if (openFormOverlay && openFormOverlay.module === module) closeFormDrawer({ force: true });
  dirty = false;
}

/** Cancelar del formulario: confirma el descarte si hay cambios. */
function cancelFormEdition(module) {
  const def = FORM_DRAWERS[module];
  if (!def) return;
  const isOpen = openFormOverlay && openFormOverlay.module === module;
  if (!isOpen) {
    if (module === 'entities') clearEntityForm();
    else if (module === 'documents') clearDocumentForm();
    else clearTicketForm();
    hideStorageWarning();
    return;
  }
  if (!dirty) {
    closeFormDrawer({ force: true });
    if (module === 'entities') clearEntityForm();
    else if (module === 'documents') clearDocumentForm();
    else clearTicketForm();
    return;
  }
  confirmDiscardChanges({
    onDiscard: () => {
      closeFormDrawer({ force: true });
      if (module === 'entities') clearEntityForm();
      else if (module === 'documents') clearDocumentForm();
      else clearTicketForm();
    },
    onKeepEditing: () => {
      const field = firstFormField(openFormOverlay ? openFormOverlay.card : null);
      if (field) field.focus();
    }
  });
}

function showModule(name, opts = {}) {
  const views = availableViews();
  if (!views.includes(name)) name = fallbackView();

  if (currentView && name !== currentView && dirty && !opts.skipGuard) {
    confirmDiscardChanges({
      onDiscard: () => {
        closeFormDrawer({ force: true });
        dirty = false;
        showModule(name, { ...opts, skipGuard: true });
      },
      onKeepEditing: () => {
        updateHash(currentView, true);
        setActiveNav({ view: currentView, mode: openFormOverlay ? 'new' : 'list' });
      }
    });
    return false;
  }

  if (currentView && name !== currentView && openFormOverlay) closeFormDrawer({ force: true });

  currentView = name;
  Object.entries(VIEW_IDS).forEach(([view, id]) => {
    const section = qs(id);
    if (section) section.hidden = view !== name;
  });
  const navMode = openFormOverlay && openFormOverlay.module === name ? 'new' : 'list';
  setActiveNav({ view: name, mode: navMode });

  if (name === 'dashboard') renderDashboard({ onMove: moveOpportunity });
  if (name === 'entities') {
    populateEditEntitySelect();
    renderClientList();
    if (opts.newRecord) clearEntityForm();
    if (opts.focusForm) qs('name').focus();
  }
  if (name === 'documents') {
    populateDocumentEntitySelect();
    populateEditDocumentSelect();
    renderOpportunityPanel();
    if (opts.newRecord) clearDocumentForm();
    if (opts.focusForm) qs('document-entity').focus();
  }
  if (name === 'search') {
    refreshSearch();
    const searchInput = qs('global-search-input');
    if (searchInput && typeof searchInput.focus === 'function') searchInput.focus();
  }
  if (name === 'tickets') {
    renderTicketInbox();
  }
  if (name === 'activities') {
    renderActivityView(opts);
  }
  if (name === 'trash') {
    renderTrashView();
  }

  if (!opts.skipHistory) updateHash(name, opts.replaceHash);
  scrollToTop();
  return true;
}

function populateDocumentEntitySelect() {
  const select = qs('document-entity');
  if (!select) return;
  const prev = select.value;
  select.innerHTML = '';
  let entities = [];
  try {
    entities = loadEntities();
  } catch (error) {
    reportDataError(error);
  }
  entities.forEach((e) => {
    const opt = document.createElement('option');
    opt.value = e.entity_id;
    opt.textContent = `${e.name} — ${e.code}`;
    select.appendChild(opt);
  });
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
  populateDocumentContactSelect(select.value);
  const notice = qs('document-no-clients');
  if (notice) notice.hidden = !(isCrmProfile(getConfig()) && entities.length === 0);
}

/**
 * Rellena el selector de contacto de la oportunidad con los contactos del
 * cliente elegido. El contacto es opcional y debe pertenecer a ese cliente.
 */
function populateDocumentContactSelect(entityId, selectedId) {
  const select = qs('document-contact');
  if (!select) return;
  const previous = selectedId !== undefined ? selectedId : select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'Sin contacto';
  select.appendChild(none);
  let contacts = [];
  try {
    contacts = loadContacts().filter((contact) => contact.entity_id === entityId);
  } catch (error) {
    reportDataError(error);
  }
  contacts.forEach((contact) => {
    const option = document.createElement('option');
    option.value = contact.id;
    option.textContent = contact.role ? `${contact.name} — ${contact.role}` : contact.name;
    select.appendChild(option);
  });
  setDocumentContactValue(previous);
}

function populateEditEntitySelect() {
  const select = qs('edit-entity');
  if (!select) return;
  const prev = select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = `-- Selecciona ${articulo(labelFor('entity'))} ${labelFor('entity').toLowerCase()} --`;
  select.appendChild(none);
  try {
    loadEntities().forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} — ${e.code}`;
      select.appendChild(opt);
    });
  } catch (error) {
    reportDataError(error);
  }
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
}

function populateEditDocumentSelect() {
  const select = qs('edit-document');
  if (!select) return;
  const prev = select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = `-- Selecciona ${articulo(labelFor('document'))} ${labelFor('document').toLowerCase()} --`;
  select.appendChild(none);
  try {
    const entities = loadEntities();
    loadDocuments().forEach((d) => {
      const entity = entities.find((e) => e.entity_id === d.entity_id);
      const label = `${entity ? entity.name : 'Cliente desconocido'} · ${folioLabel(d)} · ${d.startDate} → ${d.endDate}`;
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = label;
      select.appendChild(opt);
    });
  } catch (error) {
    reportDataError(error);
  }
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
}

function populateTicketEntitySelect(selectedEntityId) {
  const select = qs('ticket-entity');
  if (!select) return;
  const prev = selectedEntityId || select.value;
  select.innerHTML = '';
  let entities = [];
  try {
    entities = loadEntities();
  } catch (error) {
    reportDataError(error);
  }
  entities.forEach((entity) => {
    const option = document.createElement('option');
    option.value = entity.entity_id;
    option.textContent = `${entity.name} — ${entity.code}`;
    select.appendChild(option);
  });
  if (prev && [...select.options].some((option) => option.value === prev)) select.value = prev;
}

function renderClientTickets(entityId) {
  const listEl = qs('ticket-list-items');
  const emptyEl = qs('ticket-list-empty');
  if (!listEl || !emptyEl) return;
  let tickets = [];
  try {
    tickets = loadTickets().filter((ticket) => ticket.entity_id === entityId);
  } catch (error) {
    reportDataError(error);
  }
  const rendered = renderTicketList(listEl, tickets);
  emptyEl.hidden = rendered;
}

// ---------------------------------------------------------------------------
// Bandeja global de tickets (US-25) y detalle operativo (US-28…US-32)
// ---------------------------------------------------------------------------

function populateTicketInboxFilters() {
  const select = qs('ticket-filter-assignee');
  if (!select) return;
  const options = (getConfig().catalogs && getConfig().catalogs.assignee) || [];
  const previous = select.value;
  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'Todos';
  select.appendChild(all);
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option;
    node.textContent = option;
    select.appendChild(node);
  }
  select.value = previous && [...select.options].some((option) => option.value === previous) ? previous : '';
}

function ticketInboxEmptyState(hasTickets) {
  if (!hasTickets) {
    return {
      reason: 'no-records',
      title: 'No hay tickets registrados',
      message: 'Registra el primer ticket para comenzar la bandeja de soporte.',
      ctaLabel: 'Nuevo ticket',
      ctaAction: () => openNewTicketDrawer(null),
      icon: 'inbox'
    };
  }
  return {
    reason: 'no-matches',
    title: 'No hay tickets que coincidan con los filtros',
    message: 'Ajusta los filtros o límpialos para ver todos los tickets.',
    ctaLabel: 'Limpiar filtros',
    ctaAction: () => clearTicketFilters(),
    icon: 'search'
  };
}

function announceTicketInbox(filtered, total) {
  const announcer = qs('ticket-filter-announcer');
  if (announcer) {
    announcer.textContent =
      filtered === total
        ? `Se muestran ${total} ${total === 1 ? 'ticket' : 'tickets'}.`
        : `Se muestran ${filtered} de ${total} tickets según los filtros.`;
  }
}

function renderTicketInbox({ announce = false } = {}) {
  const container = qs('tickets-table');
  if (!container) return;
  populateTicketInboxFilters();
  let tickets = [];
  let entities = [];
  let contacts = [];
  try {
    tickets = loadTickets();
    entities = loadEntities();
    contacts = loadContacts();
  } catch (error) {
    reportDataError(error);
  }
  const entitiesById = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const filtered = tickets.filter(
    (ticket) =>
      (!ticketInboxState.status || ticket.status === ticketInboxState.status) &&
      (!ticketInboxState.priority || ticket.priority === ticketInboxState.priority) &&
      (!ticketInboxState.assignee || ticket.assignee === ticketInboxState.assignee)
  );
  container.innerHTML = '';
  container.appendChild(
    renderTicketInboxTable({
      tickets: filtered,
      columns: ticketInboxColumns({ entitiesById, contactsById }),
      sortKey: ticketInboxState.sort,
      onSort: handleTicketInboxSort,
      emptyState: ticketInboxEmptyState(tickets.length > 0),
      ariaLabel: 'Bandeja de tickets'
    })
  );
  if (announce) announceTicketInbox(filtered.length, tickets.length);
}

function readTicketFiltersFromControls() {
  ticketInboxState.status = qs('ticket-filter-status') ? qs('ticket-filter-status').value : '';
  ticketInboxState.priority = qs('ticket-filter-priority') ? qs('ticket-filter-priority').value : '';
  ticketInboxState.assignee = qs('ticket-filter-assignee') ? qs('ticket-filter-assignee').value : '';
}

function handleTicketFilterChange() {
  readTicketFiltersFromControls();
  renderTicketInbox({ announce: true });
}

function clearTicketFilters() {
  ticketInboxState = { status: '', priority: '', assignee: '', sort: 'priority-sla' };
  for (const id of ['ticket-filter-status', 'ticket-filter-priority', 'ticket-filter-assignee']) {
    if (qs(id)) qs(id).value = '';
  }
  if (qs('ticket-sort')) qs('ticket-sort').value = 'priority-sla';
  renderTicketInbox({ announce: true });
  showFormMessage('ticket-inbox-message', 'Filtros limpiados. Se muestran todos los tickets.');
}

function handleTicketSortChange() {
  ticketInboxState.sort = qs('ticket-sort') ? qs('ticket-sort').value : 'priority-sla';
  renderTicketInbox({ announce: true });
}

function handleTicketInboxSort(columnKey) {
  const mapping = { priority: 'priority-sla', sla: 'sla', folio: 'recent' };
  ticketInboxState.sort = mapping[columnKey] || ticketInboxState.sort;
  if (qs('ticket-sort')) qs('ticket-sort').value = ticketInboxState.sort;
  renderTicketInbox({ announce: true });
}

function populateTicketFormLinks(entityId, contactId, documentId) {
  let contacts = [];
  let documents = [];
  try {
    contacts = loadContacts();
    documents = loadDocuments();
  } catch (error) {
    reportDataError(error);
  }
  setTicketFormContacts(contacts);
  populateTicketContacts(entityId, contactId);
  populateTicketDocuments(entityId, documents, documentId);
}

function ticketDialogWriteError() {
  if (integrityBlocked) return 'La información guardada no es válida. Corrige o migra los datos antes de guardar.';
  if (isWriteBlocked())
    return 'Las escrituras están bloqueadas hasta completar la recuperación. Recarga la aplicación.';
  if (staleStorage) return 'Los datos cambiaron en otra pestaña. Recarga la página antes de guardar.';
  return null;
}

function fieldWrap(labelText, control) {
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', control.id);
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}

function dialogSelect(id, options, selected, blankLabel) {
  const select = document.createElement('select');
  select.id = id;
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = blankLabel;
  select.appendChild(blank);
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option;
    node.textContent = option;
    select.appendChild(node);
  }
  select.value = selected || '';
  return select;
}

/** Diálogo modal con contenido propio, mensaje de error y confirmación. */
function openTicketDialog({ id, title, content, confirmLabel = 'Guardar', onConfirm }) {
  const error = document.createElement('div');
  error.className = 'error';
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div');
  actions.className = 'overlay__actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-secondary';
  cancel.setAttribute('data-dialog-cancel', '');
  cancel.textContent = 'Cancelar';
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'btn btn-primary';
  confirm.setAttribute('data-dialog-confirm', '');
  confirm.textContent = confirmLabel;
  actions.append(cancel, confirm);
  content.append(error, actions);

  openOverlay({ id, variant: 'modal', title, content, returnFocus: document.activeElement, isDirty: false });
  cancel.addEventListener('click', () => closeOverlay(id, { force: true, reason: 'cancel' }));
  confirm.addEventListener('click', () => {
    const outcome = onConfirm();
    if (outcome === true) {
      closeOverlay(id, { force: true, reason: 'confirm' });
      return;
    }
    if (outcome === 'redirect') return;
    if (typeof outcome === 'string') {
      error.textContent = outcome;
      confirm.focus();
    }
  });
  confirm.focus();
}

function openTicketDetailById(ticketId, returnFocus) {
  let ticket;
  let client = null;
  let contacts = [];
  let documents = [];
  try {
    const snapshot = { tickets: loadTickets(), entities: loadEntities() };
    ticket = snapshot.tickets.find((item) => item.id === ticketId);
    if (!ticket) return;
    client = snapshot.entities.find((entity) => entity.entity_id === ticket.entity_id) || null;
    contacts = loadContacts();
    documents = loadDocuments();
  } catch (error) {
    reportDataError(error);
    return;
  }
  openTicketDetailId = ticket.id;
  openTicketDetail({
    ticket,
    client,
    contacts,
    documents,
    returnFocus: returnFocus || document.activeElement,
    onEdit: (item) => editTicketById(item.id),
    onAssign: (item) => openAssignTicketDialog(item),
    onChangeStatus: (item) => openChangeStatusDialog(item),
    onResolve: (item) => openResolveTicketDialog(item),
    onCloseTicket: (item) => confirmCloseTicket(item),
    onDelete: (item) => confirmDeleteTicket(item),
    onSatisfaction: (item) => openSatisfactionDialog(item)
  });
}

function refreshTicketWorkspace(ticketId, message) {
  if (message) showFormMessage('ticket-inbox-message', message);
  refreshAll();
  if (ticketId) openTicketDetailById(ticketId);
}

function openAssignTicketDialog(ticket) {
  const catalogs = getConfig().catalogs || {};
  const content = document.createElement('div');
  content.className = 'overlay__form';
  content.appendChild(
    fieldWrap(
      'Técnico',
      dialogSelect('assign-ticket-assignee', catalogs.assignee || [], ticket.assignee, 'Sin asignar')
    )
  );
  content.appendChild(
    fieldWrap('Equipo', dialogSelect('assign-ticket-team', catalogs.team || [], ticket.team, 'Sin asignar'))
  );
  openTicketDialog({
    id: 'assign-ticket-dialog',
    title: `Asignar ticket ${ticket.folio || ''}`.trim(),
    content,
    confirmLabel: 'Asignar',
    onConfirm: () => {
      const blocked = ticketDialogWriteError();
      if (blocked) return blocked;
      try {
        assignTicket(ticket.id, {
          assignee: qs('assign-ticket-assignee').value || null,
          team: qs('assign-ticket-team').value || null
        });
        refreshTicketWorkspace(ticket.id, 'Ticket asignado correctamente.');
        return true;
      } catch (error) {
        return error.message;
      }
    }
  });
}

function openChangeStatusDialog(ticket) {
  const targets = nextTicketStatuses(ticket.status);
  if (targets.length === 0) return;
  const content = document.createElement('div');
  content.className = 'overlay__form';
  const select = dialogSelect('ticket-status-target', targets, '', '-- Selecciona --');
  content.appendChild(fieldWrap('Nuevo estado', select));
  const note = document.createElement('textarea');
  note.id = 'ticket-status-note';
  note.rows = 2;
  const noteWrap = fieldWrap('Nota (opcional, para En espera)', note);
  noteWrap.id = 'ticket-status-note-wrapper';
  noteWrap.hidden = true;
  content.appendChild(noteWrap);
  select.addEventListener('change', () => {
    noteWrap.hidden = select.value !== 'En espera';
    if (!noteWrap.hidden && typeof note.focus === 'function') note.focus();
  });

  openTicketDialog({
    id: 'ticket-status-dialog',
    title: 'Cambiar estado',
    content,
    confirmLabel: 'Cambiar estado',
    onConfirm: () => {
      const target = qs('ticket-status-target').value;
      if (!target) return 'Selecciona el nuevo estado del ticket';
      if (target === 'Resuelto') {
        closeOverlay('ticket-status-dialog', { force: true });
        openResolveTicketDialog(ticket);
        return 'redirect';
      }
      if (target === 'Cerrado') {
        closeOverlay('ticket-status-dialog', { force: true });
        confirmCloseTicket(ticket);
        return 'redirect';
      }
      const blocked = ticketDialogWriteError();
      if (blocked) return blocked;
      try {
        changeTicketStatus(ticket.id, target, { note: qs('ticket-status-note').value });
        refreshTicketWorkspace(
          ticket.id,
          target === 'Cerrado' ? 'Ticket cerrado correctamente.' : 'Estado del ticket actualizado.'
        );
        return true;
      } catch (error) {
        return error.message;
      }
    }
  });
}

function openResolveTicketDialog(ticket) {
  const content = document.createElement('div');
  content.className = 'overlay__form';
  const summary = document.createElement('textarea');
  summary.id = 'ticket-resolution-summary';
  summary.rows = 3;
  content.appendChild(fieldWrap('Resumen de la solución *', summary));
  const score = document.createElement('input');
  score.id = 'ticket-resolution-score';
  score.type = 'number';
  score.min = '1';
  score.max = '5';
  score.step = '1';
  content.appendChild(fieldWrap('Satisfacción 1–5 (opcional)', score));
  const comment = document.createElement('textarea');
  comment.id = 'ticket-resolution-comment';
  comment.rows = 2;
  comment.maxLength = 500;
  content.appendChild(fieldWrap('Comentario de satisfacción (opcional)', comment));

  openTicketDialog({
    id: 'ticket-resolve-dialog',
    title: 'Resolver ticket',
    content,
    confirmLabel: 'Resolver ticket',
    onConfirm: () => {
      const blocked = ticketDialogWriteError();
      if (blocked) return blocked;
      const text = summary.value.trim();
      if (!text) return 'El resumen de la solución es obligatorio';
      const options = {};
      const rawScore = String(score.value || '').trim();
      if (rawScore !== '') {
        const numeric = Number(rawScore);
        if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
          return 'La satisfacción debe registrarse como una nota entera de 1 a 5';
        }
        options.satisfactionScore = numeric;
        options.satisfactionComment = comment.value;
      }
      try {
        resolveTicketStorage(ticket.id, text, options);
        refreshTicketWorkspace(ticket.id, 'Ticket resuelto correctamente.');
        return true;
      } catch (error) {
        return error.message;
      }
    }
  });
}

function openSatisfactionDialog(ticket) {
  const content = document.createElement('div');
  content.className = 'overlay__form';
  const score = document.createElement('input');
  score.id = 'ticket-satisfaction-score';
  score.type = 'number';
  score.min = '1';
  score.max = '5';
  score.step = '1';
  content.appendChild(fieldWrap('Nota 1–5 *', score));
  const comment = document.createElement('textarea');
  comment.id = 'ticket-satisfaction-comment';
  comment.rows = 3;
  comment.maxLength = 500;
  content.appendChild(fieldWrap('Comentario (opcional, 500)', comment));

  openTicketDialog({
    id: 'ticket-satisfaction-dialog',
    title: 'Registrar satisfacción',
    content,
    confirmLabel: 'Guardar satisfacción',
    onConfirm: () => {
      const blocked = ticketDialogWriteError();
      if (blocked) return blocked;
      const rawScore = String(score.value || '').trim();
      const numeric = rawScore === '' ? NaN : Number(rawScore);
      try {
        registerSatisfaction(ticket.id, numeric, comment.value);
        refreshTicketWorkspace(ticket.id, 'Satisfacción registrada.');
        return true;
      } catch (error) {
        return error.message;
      }
    }
  });
}

function confirmCloseTicket(ticket) {
  openConfirmDialog({
    id: 'ticket-close-confirm',
    title: 'Cerrar ticket',
    message: [
      `¿Cerrar el ticket ${ticket.folio || ''} — ${ticket.subject || 'sin asunto'}?`,
      'El cierre es terminal: el ticket quedará de solo lectura.'
    ],
    confirmLabel: 'Cerrar ticket',
    returnFocus: document.activeElement,
    onConfirm: () => {
      const blocked = ticketDialogWriteError();
      if (blocked) return blocked;
      try {
        closeTicket(ticket.id);
        refreshTicketWorkspace(ticket.id, 'Ticket cerrado correctamente.');
        return true;
      } catch (error) {
        return error.message;
      }
    }
  });
}

function confirmDeleteTicket(ticket) {
  openConfirmDialog({
    id: 'ticket-delete-confirm',
    title: 'Eliminar ticket',
    message: [
      `¿Eliminar el ticket ${ticket.folio || ''} — ${ticket.subject || 'sin asunto'}?`,
      'El cliente, sus oportunidades, contactos y actividades permanecen. La eliminación es definitiva.'
    ],
    confirmLabel: 'Eliminar ticket',
    danger: true,
    returnFocus: document.activeElement,
    onConfirm: () => {
      const blocked = ticketDialogWriteError();
      if (blocked) return blocked;
      try {
        deleteTicket(ticket.id);
        closeOverlay('ticket-detail', { force: true });
        openTicketDetailId = null;
        showFormMessage('ticket-inbox-message', 'Ticket eliminado.');
        refreshAll();
        return true;
      } catch (error) {
        return error.message;
      }
    }
  });
}

function appendEntityItems(listEl, entities) {
  const ul = document.createElement('ul');
  ul.className = 'entity-list';
  entities.forEach((entity) => ul.appendChild(createEntityItem(entity)));
  listEl.appendChild(ul);
}

function emptyClientState() {
  const feminine = esFemenina(labelFor('entity'));
  const entityClass = feminine ? 'registradas' : 'registrados';
  return {
    reason: 'no-records',
    message: `No hay ${labelFor('entities').toLowerCase()} ${entityClass}`,
    ctaLabel: `${feminine ? 'Nueva' : 'Nuevo'} ${labelFor('entity')}`,
    textId: 'client-list-empty-text',
    ctaId: 'client-list-create',
    ctaAction: openCreateEntityDrawer,
    icon: 'users'
  };
}

function openCreateEntityDrawer() {
  if (!showModule('entities')) return;
  openFormDrawer('entities', 'new');
}

function renderClientList() {
  const listEl = qs('client-list-items');
  const emptyEl = qs('client-list-empty');
  if (!listEl || !emptyEl) return;
  listEl.innerHTML = '';
  let entities = [];
  try {
    entities = loadEntities();
  } catch (error) {
    reportDataError(error);
  }

  if (!isCrmProfile(getConfig())) {
    if (entities.length > 0) {
      emptyEl.hidden = true;
      emptyEl.innerHTML = '';
      appendEntityItems(listEl, entities);
    } else {
      emptyEl.innerHTML = '';
      emptyEl.appendChild(renderEmptyState(emptyClientState()));
      emptyEl.hidden = false;
    }
    return;
  }

  const output = renderClientTable({
    entities,
    sortKey: clientSort.key,
    sortDirection: clientSort.direction,
    onSort: handleClientSort,
    emptyState: emptyClientState(),
    caption: `${labelFor('entities')} registrados`,
    ariaLabel: `Tabla de ${labelFor('entities').toLowerCase()} registrados`
  });

  if (entities.length === 0) {
    emptyEl.innerHTML = '';
    emptyEl.appendChild(output);
    emptyEl.hidden = false;
  } else {
    emptyEl.innerHTML = '';
    emptyEl.hidden = true;
    listEl.appendChild(output);
  }
}

function handleClientSort(key) {
  clientSort = nextSortState(clientSort, key);
  renderClientList();
  focusSortHeader(qs('client-list-items'), key);
}

function openCreateDocumentDrawer() {
  if (!showModule('documents')) return;
  openFormDrawer('documents', 'new');
}

function emptyOpportunityState() {
  return {
    reason: 'no-records',
    message: `No se encontraron ${labelFor('documents').toLowerCase()}`,
    ctaLabel: `${esFemenina(labelFor('document')) ? 'Nueva' : 'Nuevo'} ${labelFor('document')}`,
    textId: 'opportunity-list-empty',
    ctaAction: openCreateDocumentDrawer,
    icon: 'target'
  };
}

function renderOpportunityPanel() {
  const listEl = qs('opportunity-list-items');
  const emptyEl = qs('opportunity-list-empty-state');
  if (!listEl || !emptyEl) return;
  listEl.innerHTML = '';
  let documents = [];
  let entities = [];
  try {
    documents = loadDocuments();
    entities = loadEntities();
  } catch (error) {
    reportDataError(error);
  }

  const crm = isCrmProfile(getConfig());
  if (!crm) {
    if (documents.length > 0) {
      emptyEl.hidden = true;
      emptyEl.innerHTML = '';
      const ul = document.createElement('ul');
      ul.className = 'document-list';
      documents.forEach((doc) => {
        const entity = entities.find((e) => e.entity_id === doc.entity_id);
        ul.appendChild(createDocumentItem(doc, entity ? entity.name : undefined));
      });
      listEl.appendChild(ul);
    } else {
      emptyEl.innerHTML = '';
      emptyEl.appendChild(renderEmptyState(emptyOpportunityState()));
      emptyEl.hidden = false;
    }
    return;
  }

  const output = renderOpportunityTable({
    items: documents,
    entityNameFor: (doc) => {
      const entity = entities.find((e) => e.entity_id === doc.entity_id);
      return entity ? `${entity.name} (${entity.code})` : undefined;
    },
    sortKey: opportunitySort.key,
    sortDirection: opportunitySort.direction,
    onSort: handleOpportunitySort,
    emptyState: emptyOpportunityState(),
    caption: labelFor('documents'),
    ariaLabel: `Tabla de ${labelFor('documents').toLowerCase()}`,
    openDetail: false
  });

  if (documents.length === 0) {
    emptyEl.innerHTML = '';
    emptyEl.appendChild(output);
    emptyEl.hidden = false;
  } else {
    emptyEl.innerHTML = '';
    emptyEl.hidden = true;
    listEl.appendChild(output);
  }
}

function handleOpportunitySort(key) {
  opportunitySort = nextSortState(opportunitySort, key);
  renderOpportunityPanel();
  focusSortHeader(qs('opportunity-list-items'), key);
}

function clearFiltersKeepingCriterion() {
  clearSearchFilters();
  syncFilterChips();
  refreshSearch();
}

function handleSearchClientSort(key) {
  searchClientSort = nextSortState(searchClientSort, key);
  refreshSearch();
  focusSortHeader(qs('search-results-list'), key);
}

function handleSearchOpportunitySort(key) {
  searchOpportunitySort = nextSortState(searchOpportunitySort, key);
  refreshSearch();
  focusSortHeader(qs('search-opportunities-list'), key);
}

function refreshSearch() {
  const listEl = qs('search-results-list');
  if (!listEl) return;
  const input = qs('global-search-input');
  const term = input ? input.value : '';
  const emptyEl = qs('search-empty');
  const hintEl = qs('search-hint');
  const clientsSection = qs('search-clients');
  const opportunitiesSection = qs('search-opportunities');
  const opportunitiesList = qs('search-opportunities-list');
  const hasCriterion = String(term || '').trim() !== '';

  if (!isCrmProfile(getConfig())) {
    listEl.innerHTML = '';
    if (opportunitiesSection) opportunitiesSection.hidden = true;
    if (opportunitiesList) opportunitiesList.innerHTML = '';
    if (emptyEl) {
      emptyEl.innerHTML = '';
      emptyEl.hidden = true;
      emptyEl.textContent = 'Sin coincidencias para tu búsqueda.';
    }
    if (!hasCriterion) {
      if (clientsSection) clientsSection.hidden = true;
      if (hintEl) hintEl.hidden = false;
      return;
    }
    if (clientsSection) clientsSection.hidden = false;
    let results = [];
    try {
      results = searchEntities(term);
    } catch (error) {
      reportDataError(error);
    }
    if (hintEl) hintEl.hidden = true;
    if (results.length > 0) appendEntityItems(listEl, results);
    if (emptyEl) {
      emptyEl.hidden = results.length > 0;
      if (results.length === 0) emptyEl.textContent = 'Sin coincidencias para tu búsqueda.';
    }
    return;
  }

  const filters = readSearchFilters();
  let clients = [];
  let opportunities = [];
  try {
    const entities = loadEntities();
    clients = searchClients(term, filters, entities, loadContacts());
    opportunities = searchOpportunities(term, filters, loadDocuments(), entities);
  } catch (error) {
    reportDataError(error);
  }

  renderSearchResults({
    clients,
    opportunities,
    listEl,
    emptyEl,
    hintEl,
    clientsSection,
    opportunitiesSection,
    opportunitiesList,
    hasCriterion,
    criterion: term,
    hasFilters: Object.keys(filters).length > 0,
    clientSort: searchClientSort,
    opportunitySort: searchOpportunitySort,
    onSortClients: handleSearchClientSort,
    onSortOpportunities: handleSearchOpportunitySort,
    onClearFilters: clearFiltersKeepingCriterion
  });
}

function showClientDetail(entityId, timelineFilters = clientTimelineState.filters) {
  let entity;
  let opportunities = [];
  let contacts = [];
  let activities = [];
  let tickets = [];
  let timelineEvents = [];
  try {
    entity = loadEntities().find((e) => e.entity_id === entityId);
    if (!entity) return;
    opportunities = loadDocuments().filter((d) => d.entity_id === entityId);
    contacts = loadContacts().filter((c) => c.entity_id === entityId);
    activities = loadActivities().filter((a) => a.entity_id === entityId);
    tickets = loadTickets().filter((t) => t.entity_id === entityId);
    const migration = migrateLegacyContactName(entity, contacts);
    if (migration.migrated) {
      saveContacts(migration.contacts);
      contacts = migration.contacts;
    }
    timelineEvents = buildTimeline({ activities, tickets, entityId }, timelineFilters);
  } catch (error) {
    reportDataError(error);
    return;
  }
  currentClientEntityId = entityId;
  clientTimelineState = { filters: timelineFilters };
  renderEntityDetail(qs('entity-detail-body'), entity, opportunities, undefined, {
    showTicketAction: isCrmProfile(getConfig()),
    showContactAction: isCrmProfile(getConfig()),
    showActivityAction: isCrmProfile(getConfig()),
    contacts,
    activities,
    tickets,
    timeline: {
      events: timelineEvents,
      filters: timelineFilters,
      onChange: (filters) => showClientDetail(entityId, filters),
      onSelect: (event, detail) => {
        if (detail && typeof detail.focus === 'function') detail.focus();
      }
    }
  });
  qs('entity-detail').hidden = false;
  qs('opportunity-detail').hidden = true;
  const ticketSection = qs('ticket-section');
  if (ticketSection) ticketSection.hidden = !isCrmProfile(getConfig());
  const contactSection = qs('contact-section');
  if (contactSection) contactSection.hidden = !isCrmProfile(getConfig());
  if (isCrmProfile(getConfig())) {
    clearTicketForm();
    populateTicketEntitySelect(entityId);
    populateTicketFormLinks(entityId);
    renderClientTickets(entityId);
    clearContactForm();
    const contactForm = qs('contact-form');
    if (contactForm) contactForm.hidden = true;
    if (qs('contact-entity-id')) qs('contact-entity-id').value = entityId;
  }
}

function showOpportunityDetail(documentId, timelineFilters = opportunityTimelineState.filters) {
  let document_;
  let client;
  let contacts = [];
  let activities = [];
  let timelineEvents = [];
  try {
    document_ = loadDocuments().find((d) => d.id === documentId);
    if (!document_) return;
    client = loadEntities().find((e) => e.entity_id === document_.entity_id);
    contacts = loadContacts().filter((contact) => contact.entity_id === document_.entity_id);
    activities = loadActivities().filter((a) => a.documentId === documentId);
    timelineEvents = buildTimeline({ activities, documentId }, timelineFilters);
  } catch (error) {
    reportDataError(error);
    return;
  }
  opportunityTimelineState = { filters: timelineFilters };
  renderOpportunityDetail(qs('opportunity-detail-body'), document_, client, {
    contacts,
    timeline: {
      events: timelineEvents,
      filters: timelineFilters,
      onChange: (filters) => showOpportunityDetail(documentId, filters),
      onSelect: (event, detail) => {
        if (detail && typeof detail.focus === 'function') detail.focus();
      }
    }
  });
  qs('opportunity-detail').hidden = false;
  qs('entity-detail').hidden = true;
}

function writesAllowed(messageId) {
  if (integrityBlocked) {
    showFormMessage(
      messageId,
      'La información guardada no es válida. Corrige o migra los datos antes de guardar.',
      'error'
    );
    return false;
  }
  if (isWriteBlocked()) {
    showFormMessage(
      messageId,
      'Las escrituras están bloqueadas hasta completar la recuperación de la operación interrumpida. Recarga la aplicación.',
      'error'
    );
    return false;
  }
  if (staleStorage) {
    showFormMessage(messageId, 'Los datos cambiaron en otra pestaña. Recarga la página antes de guardar.', 'error');
    return false;
  }
  return true;
}

function populateActivityEntitySelect(selected) {
  const select = qs('activity-entity');
  if (!select) return;
  const previous = selected || select.value;
  select.innerHTML = '';
  let entities = [];
  try {
    entities = loadEntities();
  } catch (error) {
    reportDataError(error);
  }
  entities.forEach((entity) => {
    const option = document.createElement('option');
    option.value = entity.entity_id;
    option.textContent = `${entity.name} — ${entity.code}`;
    select.appendChild(option);
  });
  if (previous && [...select.options].some((option) => option.value === previous)) select.value = previous;
}

function populateActivityLinkOptions(entityId) {
  try {
    const contacts = loadContacts().filter((contact) => contact.entity_id === entityId);
    const documents = loadDocuments().filter((document) => document.entity_id === entityId);
    populateActivityLinks(contacts, documents);
  } catch (error) {
    reportDataError(error);
  }
}

function renderActivityView(opts = {}) {
  prepareActivityForm();
  populateActivityEntitySelect(opts.entityId);
  const entityId = qs('activity-entity') ? qs('activity-entity').value : '';
  if (qs('activity-entity-id')) qs('activity-entity-id').value = entityId;
  populateActivityLinkOptions(entityId);
  clearActivityForm();
  let activities = [];
  let entities = [];
  try {
    activities = loadActivities();
    entities = loadEntities();
  } catch (error) {
    reportDataError(error);
  }
  const nameFor = (activity) => {
    const entity = entities.find((item) => item.entity_id === activity.entity_id);
    return entity ? entity.name : 'Cliente no disponible';
  };
  const listEl = qs('activity-list-items');
  const emptyEl = qs('activity-list-empty');
  const rendered = renderActivityList(listEl, activities, undefined, nameFor);
  if (emptyEl) emptyEl.hidden = rendered;
  if (opts.editActivity) {
    startActivityEdit(opts.editActivity);
    populateActivityLinkOptions(opts.editActivity.entity_id);
    qs('activity-contact').value = opts.editActivity.contactId || '';
    qs('activity-document').value = opts.editActivity.documentId || '';
  }
  if (!opts.editActivity && opts.documentId && qs('activity-document')) {
    qs('activity-document').value = opts.documentId;
  }
  if (opts.focusForm && qs('activity-subject')) qs('activity-subject').focus();
}

/** Abre el formulario de actividades desde un estado vacío del timeline. */
function openActivityFromEmptyState(button) {
  const entityId = button.dataset.entityId;
  const documentId = button.dataset.documentId;
  if (!showModule('activities', { entityId })) return;
  renderActivityView({ entityId, documentId, focusForm: true });
}

function renderTrashView() {
  let entries = [];
  try {
    entries = loadTrash();
  } catch (error) {
    reportDataError(error);
  }
  const listEl = qs('trash-list-items');
  const emptyEl = qs('trash-empty');
  const rendered = renderTrashList(listEl, entries, {
    onRestore: (entry) => {
      if (
        !confirm(
          `¿Restaurar el cliente ${entry.entity && entry.entity.name ? entry.entity.name : ''} con todas sus relaciones?`
        )
      )
        return;
      if (!writesAllowed('trash-message')) return;
      try {
        restoreFromTrash(entry.id);
        showFormMessage('trash-message', 'Cliente restaurado correctamente.');
        refreshAll();
        renderTrashView();
      } catch (error) {
        showFormMessage('trash-message', error.message, 'error');
      }
    },
    onPurge: (entry) => {
      if (!confirm('¿Purgar definitivamente este elemento? Esta acción no se puede deshacer.')) return;
      if (!writesAllowed('trash-message')) return;
      try {
        purgeTrashEntry(entry.id);
        showFormMessage('trash-message', 'Elemento purgado definitivamente.');
        renderTrashView();
      } catch (error) {
        showFormMessage('trash-message', error.message, 'error');
      }
    }
  });
  if (emptyEl) emptyEl.hidden = rendered;
}

function openContactForm(entityId) {
  const form = qs('contact-form');
  if (!form) return;
  qs('contact-entity-id').value = entityId || currentClientEntityId || '';
  form.hidden = false;
  if (qs('contact-name')) qs('contact-name').focus();
}

function handleContactSubmit(event) {
  event.preventDefault();
  if (!writesAllowed('contact-message')) return;
  const messageId = 'contact-message';
  const id = qs('contact-id').value;
  const payload = collectContactPayload();
  let entities = [];
  try {
    entities = loadEntities();
  } catch (error) {
    showFormMessage(messageId, error.message, 'error');
    return;
  }
  const errors = validateContact(payload, { entities }).errors;
  showContactErrors(errors);
  if (Object.keys(errors).length > 0) {
    showFormMessage(messageId, `${Object.values(errors)[0]} Revisa los campos marcados.`, 'error');
    focusFirstInvalid(qs('contact-form'));
    return;
  }
  try {
    if (id) updateContact(id, payload);
    else addContact(payload);
    showFormMessage(messageId, id ? 'Contacto actualizado correctamente.' : 'Contacto agregado correctamente.');
    clearContactForm();
    if (currentClientEntityId) showClientDetail(currentClientEntityId);
    refreshAll();
  } catch (error) {
    showFormMessage(messageId, error.message, 'error');
  }
}

function editContactById(contactId) {
  let contact;
  try {
    contact = loadContacts().find((item) => item.id === contactId);
  } catch (error) {
    showFormMessage('contact-message', error.message, 'error');
    return;
  }
  if (!contact) return;
  startContactEdit(contact);
  openContactForm(contact.entity_id);
}

function deleteContactById(contactId) {
  let contact;
  let alternatives = [];
  let related = 0;
  try {
    contact = loadContacts().find((item) => item.id === contactId);
    if (!contact) return;
    alternatives = loadContacts().filter((item) => item.entity_id === contact.entity_id && item.id !== contact.id);
    const relatedActivities = loadActivities().filter((activity) => activity.contactId === contact.id).length;
    const relatedDocuments = loadDocuments().filter((document) => document.contactId === contact.id).length;
    related = relatedActivities + relatedDocuments;
  } catch (error) {
    showFormMessage('contact-message', error.message, 'error');
    return;
  }

  const remove = (reassignTo = null) => {
    if (!writesAllowed('contact-message')) return;
    try {
      deleteContact(contact.id, { reassignTo });
      showFormMessage('contact-message', 'Contacto eliminado correctamente.');
      if (currentClientEntityId) showClientDetail(currentClientEntityId);
      refreshAll();
    } catch (error) {
      showFormMessage('contact-message', error.message, 'error');
    }
  };

  if (related > 0) {
    if (alternatives.length === 0) {
      showFormMessage(
        'contact-message',
        'Agrega otro contacto del mismo cliente antes de eliminar este: sus registros vinculados necesitan un destino.',
        'error'
      );
      return;
    }
    openContactReassignDialog({
      contacts: alternatives,
      contactName: contact.name,
      count: related,
      returnFocus: document.activeElement,
      onConfirm: (targetId) => {
        if (integrityBlocked || isWriteBlocked() || staleStorage) {
          return 'No se puede guardar ahora. Recarga la aplicación e inténtalo de nuevo.';
        }
        remove(targetId);
        return true;
      }
    });
    return;
  }

  if (!confirm(`¿Eliminar el contacto ${contact.name}?`)) return;
  remove();
}

function handleActivitySubmit(event) {
  event.preventDefault();
  if (!writesAllowed('activity-message')) return;
  const id = qs('activity-id').value;
  const payload = collectActivityPayload();
  let entities = [];
  let contacts = [];
  let documents = [];
  try {
    entities = loadEntities();
    contacts = loadContacts();
    documents = loadDocuments();
  } catch (error) {
    showFormMessage('activity-message', error.message, 'error');
    return;
  }
  const errors = validateActivity(payload, { entities, contacts, documents, mode: id ? 'update' : 'create' }).errors;
  showActivityErrors(errors);
  if (Object.keys(errors).length > 0) {
    showFormMessage('activity-message', `${Object.values(errors)[0]} Revisa los campos marcados.`, 'error');
    focusFirstInvalid(qs('activity-form'));
    return;
  }
  try {
    if (id) updateActivity(id, payload);
    else addActivity(payload);
    showFormMessage(
      'activity-message',
      id ? 'Actividad actualizada correctamente.' : 'Actividad registrada correctamente.'
    );
    renderActivityView();
    refreshAll();
  } catch (error) {
    showFormMessage('activity-message', error.message, 'error');
  }
}

function editActivityById(activityId) {
  let activity;
  try {
    activity = loadActivities().find((item) => item.id === activityId);
  } catch (error) {
    showFormMessage('activity-message', error.message, 'error');
    return;
  }
  if (!activity) return;
  if (!showModule('activities')) return;
  renderActivityView({ editActivity: activity, entityId: activity.entity_id });
}

function completeActivityFromList(activityId) {
  if (!writesAllowed('activity-message')) return;
  try {
    completeActivityById(activityId);
    showFormMessage('activity-message', 'Actividad marcada como completada.');
    renderActivityView();
    refreshAll();
  } catch (error) {
    showFormMessage('activity-message', error.message, 'error');
  }
}

function deleteActivityById(activityId) {
  if (!confirm('¿Eliminar esta actividad?')) return;
  if (!writesAllowed('activity-message')) return;
  try {
    deleteActivity(activityId);
    showFormMessage('activity-message', 'Actividad eliminada correctamente.');
    renderActivityView();
    refreshAll();
  } catch (error) {
    showFormMessage('activity-message', error.message, 'error');
  }
}

function applyOpportunityMove(id, to, lossReason) {
  try {
    updateDocument(id, lossReason ? { status: to, lossReason } : { status: to });
    const announcement = document.getElementById('board-announcement');
    if (announcement) announcement.textContent = `Oportunidad movida a ${to}.`;
    showFormMessage('opportunity-message', `Oportunidad movida a ${to}.`);
  } catch (error) {
    showFormMessage('opportunity-message', error.message, 'error');
  }
  renderDashboard({ onMove: moveOpportunity });
  if (currentView === 'documents') renderOpportunityPanel();
  if (currentView === 'search') refreshSearch();
}

/** Mueve una oportunidad desde el Kanban validando la transición. */
function moveOpportunity(id, to) {
  if (!writesAllowed('opportunity-message')) {
    renderDashboard({ onMove: moveOpportunity });
    return;
  }
  if (to === 'Perdida') {
    openLossReasonDialog({
      returnFocus: document.querySelector(`.commercial-card[data-opportunity-id="${id}"]`),
      onConfirm: (reason) => {
        if (isWriteBlocked()) return 'Las escrituras están bloqueadas; recarga la aplicación.';
        applyOpportunityMove(id, to, reason);
        return true;
      }
    });
    return;
  }
  applyOpportunityMove(id, to);
}

/** Diálogo de resolución de ticket con resumen obligatorio y CSAT opcional. */
function resolveTicketById(ticketId) {
  if (!ticketId) return;
  let ticket = null;
  try {
    ticket = loadTickets().find((item) => item.id === ticketId) || null;
  } catch (error) {
    showFormMessage('ticket-message', error.message, 'error');
    return;
  }
  if (!ticket) return;
  if (!writesAllowed('ticket-message')) return;
  openResolveTicketDialog(ticket);
}

function addMigrationRestoreButton(banner) {
  let backup = null;
  try {
    backup = loadMigrationBackup();
  } catch (error) {
    showStorageWarning(error.message);
    return;
  }
  if (!backup) return;
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-secondary';
  restore.textContent = 'Restaurar respaldo v3';
  restore.addEventListener('click', () => {
    openConfirmDialog({
      id: 'migration-restore-confirm',
      title: 'Restaurar respaldo de migración',
      message: ['Se restaurarán las colecciones guardadas antes de la última migración.', 'El respaldo se conserva.'],
      confirmLabel: 'Restaurar respaldo',
      danger: true,
      returnFocus: restore,
      onConfirm: () => {
        try {
          const result = restoreMigrationBackup();
          banner.hidden = true;
          showStorageWarning(`Respaldo restaurado en v${result.schemaVersion}. Recarga la aplicación para continuar.`);
          return true;
        } catch (error) {
          return error.message;
        }
      }
    });
  });
  banner.append(' ', restore);
}

function offerMigrationIfNeeded() {
  let stored;
  try {
    stored = getStoredSchemaVersion();
  } catch (error) {
    showStorageWarning(error.message);
    return;
  }
  if (stored >= SCHEMA_VERSION) return;
  const plan = requestMigration(stored, SCHEMA_VERSION);
  const banner = qs('migration-banner');
  if (!banner) return;
  banner.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = `Los datos guardados usan el formato v${stored}. ${plan.steps.join(' ')} `;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'btn btn-secondary';
  action.textContent = 'Revisar y migrar';
  action.addEventListener('click', () => {
    const current = requestMigration(stored, SCHEMA_VERSION);
    openConfirmDialog({
      id: 'migration-confirm',
      title: 'Migrar datos al esquema 4',
      message: ['Se creará un respaldo recuperable y luego se aplicará la migración.', ...current.steps],
      confirmLabel: 'Migrar ahora',
      returnFocus: action,
      onConfirm: () => {
        const blocked = ticketDialogWriteError();
        if (blocked) return blocked;
        try {
          applyMigration();
          banner.innerHTML = '';
          const done = document.createElement('span');
          done.textContent = 'Migración aplicada al esquema 4. ';
          banner.appendChild(done);
          addMigrationRestoreButton(banner);
          banner.hidden = false;
          showStorageWarning('Migración aplicada. La bandeja y el panel ya usan el esquema 4.');
          refreshAll();
          return true;
        } catch (error) {
          return error.message;
        }
      }
    });
  });
  banner.append(text, action);
  addMigrationRestoreButton(banner);
  banner.hidden = false;
}

function editEntityById(entityId) {
  if (!entityId) return;
  const entity = loadEntities().find((e) => e.entity_id === entityId || e.id === entityId);
  if (!entity) return;
  const select = qs('edit-entity');
  if (select) select.value = entity.id;
  startEntityEdit(entity);
  openFormDrawer('entities', 'edit');
}

function editOpportunityById(documentId) {
  if (!documentId) return;
  const document_ = loadDocuments().find((d) => d.id === documentId);
  if (!document_) return;
  const select = qs('edit-document');
  if (select) select.value = documentId;
  startDocumentEdit(document_);
  populateDocumentContactSelect(document_.entity_id, document_.contactId);
  openFormDrawer('documents', 'edit');
  if (qs('folio')) qs('folio').focus();
}

function openClientFromList(entityId) {
  const entity = loadEntities().find((e) => e.entity_id === entityId);
  if (!entity) return;
  showModule('search');
  const searchInput = qs('global-search-input');
  if (searchInput) searchInput.value = entity.code || entity.name || '';
  refreshSearch();
  showClientDetail(entityId);
  qs('entity-detail').scrollIntoView?.({ block: 'start' });
}

function applyTheme(config) {
  document.documentElement.style.setProperty('--accent', config.theme.accentColor);
}

function showConfigErrors(errors, conflicts) {
  const banner = qs('config-errors');
  if (!banner) return;
  const parts = [...(errors || [])];
  if (conflicts && conflicts.length > 0) {
    parts.push(
      ...conflicts.map((key) => `Se conservó el valor guardado de "${key}" porque la configuración lo redefine.`)
    );
  }
  if (parts.length > 0) {
    banner.textContent = `Problema de configuración del módulo: ${parts.join(' ')}`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
    banner.textContent = '';
  }
}

function ensureCategoryControl() {
  const holder = qs('category-control');
  if (!holder) return;
  const options = (getConfig().catalogs && getConfig().catalogs.category) || [];
  holder.innerHTML = '';
  let control;
  if (options.length > 0) {
    control = document.createElement('select');
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '--';
    control.appendChild(blank);
    options.forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      control.appendChild(opt);
    });
  } else {
    control = document.createElement('input');
    control.type = 'text';
  }
  control.id = 'category';
  control.name = 'category';
  control.setAttribute('aria-describedby', 'error-category');
  holder.appendChild(control);
}

function applyFiltersVisibility() {
  const container = qs('search-filters');
  const toggle = qs('toggle-filters');
  const available = Boolean(container && container.dataset.available === 'true');
  const expanded = available && filtersExpanded;
  if (toggle) {
    toggle.hidden = !available;
    toggle.setAttribute('aria-expanded', String(expanded));
  }
  if (container) container.hidden = !expanded;
}

function handleFiltersChanged() {
  syncFilterChips();
  refreshSearch();
}

function ensureSearchFilters() {
  const catalogs = getConfig().catalogs || {};
  const definitions = [
    ['search-filter-category', catalogs.category],
    ['search-filter-owner', catalogs.accountOwner],
    ['search-filter-source', catalogs.acquisitionSource]
  ];
  let any = false;
  definitions.forEach(([id, options]) => {
    const select = qs(id);
    if (!select) return;
    select.innerHTML = '';
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'Todos';
    select.appendChild(all);
    if (Array.isArray(options) && options.length > 0) {
      any = true;
      options.forEach((value) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        select.appendChild(opt);
      });
    }
  });
  const container = qs('search-filters');
  if (container) {
    container.dataset.available = any && isCrmProfile(getConfig()) ? 'true' : 'false';
  }
  applyFiltersVisibility();
}

function applyProfileVisibility() {
  const crm = isCrmProfile(getConfig());
  const entityBase = qs('entity-base-commercial');
  if (entityBase) entityBase.hidden = crm;
  const documentBase = qs('document-base-commercial');
  if (documentBase) documentBase.hidden = crm;
  const seriesField = qs('series-field');
  if (seriesField) seriesField.hidden = crm;
  const fixed = qs('document-fixed');
  if (fixed) {
    fixed.hidden = !crm;
    fixed.textContent = crm ? 'Serie OPP · Moneda CLP · Etapa inicial Nueva' : '';
  }
  const documentContact = qs('document-contact-field');
  if (documentContact) documentContact.hidden = !crm;
}

function applyLabels(config) {
  const entity = config.labels.entity;
  const entities = config.labels.entities;
  const document_ = config.labels.document;
  const documents = config.labels.documents;
  const femEntity = esFemenina(entity);
  const femDocument = esFemenina(document_);
  const entityClass = femEntity ? 'registradas' : 'registrados';
  const crm = isCrmProfile(config);

  document.title = config.moduleName;
  qs('brand-name').textContent = config.moduleName;
  applyShellLabels();

  qs('dashboard-heading').textContent = config.moduleName;
  qs('dashboard-subtitle').textContent =
    `Gestiona tus ${entities.toLowerCase()} y ${documents.toLowerCase()} en un solo lugar.`;
  qs('action-new-entity-title').textContent = `${femEntity ? 'Nueva' : 'Nuevo'} ${entity}`;
  qs('action-new-entity-sub').textContent = `Crear un registro de ${entity.toLowerCase()}`;
  qs('action-new-document-title').textContent = `${femDocument ? 'Nueva' : 'Nuevo'} ${document_}`;
  qs('action-new-document-sub').textContent = `Registrar un registro de ${document_.toLowerCase()}`;
  qs('action-open-entities-title').textContent = crm ? `Gestionar ${entities}` : entities;
  qs('action-open-entities-sub').textContent = `Abrir la gestión de ${entities.toLowerCase()}`;
  qs('action-find-title').textContent = crm ? 'Buscar' : 'Buscar registros';
  qs('action-find-sub').textContent = `Buscar ${entities.toLowerCase()}`;
  const emptyCta = qs('dashboard-empty-cta');
  if (emptyCta) emptyCta.textContent = `Registra tu primer ${entity.toLowerCase()}`;
  const emptyHint = qs('dashboard-empty-hint');
  if (emptyHint) {
    emptyHint.textContent = `Aún no hay datos en el panel. Comienza registrando ${articulo(entity)} ${entity.toLowerCase()} y luego crea su primera ${document_.toLowerCase()}.`;
  }

  qs('entities-view-heading').textContent = entities;
  qs('entity-form-heading').textContent = `Agregar / Editar ${entity}`;
  qs('edit-entity-heading').textContent = `Editar o eliminar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs('delete-entity').textContent = `Eliminar ${articulo(entity)} ${entity.toLowerCase()} ${seleccionada(entity)}`;
  qs('client-list-heading').textContent = `${entities} ${entityClass}`;
  const clientEmptyText = qs('client-list-empty-text');
  if (clientEmptyText) clientEmptyText.textContent = `No hay ${entities.toLowerCase()} ${entityClass}`;
  const clientCreate = qs('client-list-create');
  if (clientCreate) clientCreate.textContent = `${femEntity ? 'Nueva' : 'Nuevo'} ${entity}`;

  qs('documents-view-heading').textContent = documents;
  qs('document-form-heading').textContent = `Agregar / Editar ${document_}`;
  qs('edit-document-heading').textContent = `Editar o eliminar ${articulo(document_)} ${document_.toLowerCase()}`;
  qs('delete-document').textContent =
    `Eliminar ${articulo(document_)} ${document_.toLowerCase()} ${seleccionada(document_)}`;
  qs('document-entity-label').textContent = `${entity} *`;
  const opportunityEmpty = qs('opportunity-list-empty');
  if (opportunityEmpty) opportunityEmpty.textContent = `No se encontraron ${documents.toLowerCase()}`;
  qs('document-no-clients-text').textContent = `Primero debes registrar ${articulo(entity)} ${entity.toLowerCase()}.`;
  qs('document-no-clients-action').textContent = 'Crear cliente ahora';

  qs('search-view-heading').textContent = `Buscar ${entities}`;
  qs('search-heading').textContent = `Buscar ${articulo(entity)} ${entity.toLowerCase()}`;
  const searchClientsHeading = qs('search-clients-heading');
  if (searchClientsHeading) searchClientsHeading.textContent = entities;
  const searchInput = qs('global-search-input');
  if (searchInput) {
    searchInput.placeholder = `Buscar ${entities.toLowerCase()} y ${documents.toLowerCase()}...`;
    searchInput.setAttribute('aria-label', `Buscar ${entities.toLowerCase()} y ${documents.toLowerCase()}`);
  }
  const primaryAction = qs('topbar-primary-action');
  if (primaryAction) primaryAction.textContent = `${femEntity ? 'Nueva' : 'Nuevo'} ${entity}`;
  qs('search-hint').textContent = 'Escribe para buscar';
  qs('search-empty').textContent = 'Sin coincidencias para tu búsqueda.';
  qs('search-opportunities-heading').textContent = documents;
  qs('entity-detail-heading').textContent = `Ficha ${deArticulo(entity)} ${entity.toLowerCase()}`;
  qs('opportunity-detail-heading').textContent = `Detalle ${deArticulo(document_)} ${document_.toLowerCase()}`;

  const activitiesHeading = qs('activities-view-heading');
  if (activitiesHeading) activitiesHeading.textContent = config.labels.activities || 'Actividades';
  const activityFormHeading = qs('activity-form-heading');
  if (activityFormHeading)
    activityFormHeading.textContent = `Registrar / Editar ${(config.labels.activity || 'actividad').toLowerCase()}`;
  const activityListHeading = qs('activity-list-heading');
  if (activityListHeading) activityListHeading.textContent = `${config.labels.activities || 'Actividades'} registradas`;
  const trashHeading = qs('trash-view-heading');
  if (trashHeading) trashHeading.textContent = config.labels.trash || 'Papelera';
  const contactHeading = qs('contact-heading');
  if (contactHeading) contactHeading.textContent = config.labels.contacts || 'Contactos';
  const activityLabel = qs('activity-form-heading');
  if (activityLabel)
    activityLabel.textContent = `Registrar / Editar ${(config.labels.activity || 'actividad').toLowerCase()}`;
}

function onEditEntityChange() {
  const id = qs('edit-entity').value;
  if (!id) {
    clearEntityForm();
    return;
  }
  const entity = loadEntities().find((e) => e.id === id);
  if (entity) startEntityEdit(entity);
}

function handleDeleteSelectedEntity() {
  const id = qs('edit-entity').value;
  if (!id) {
    qs('error-edit-entity').textContent =
      `Selecciona ${articulo(labelFor('entity'))} ${labelFor('entity').toLowerCase()} para eliminar.`;
    return;
  }
  let entity;
  let related = 0;
  let relatedTickets = 0;
  let relatedContacts = 0;
  let relatedActivities = 0;
  try {
    entity = loadEntities().find((e) => e.id === id);
    related = entity ? countDocumentsForEntity(entity.entity_id) : 0;
    relatedTickets = entity ? countTicketsForEntity(entity.entity_id) : 0;
    relatedContacts = entity ? countContactsForEntity(entity.entity_id) : 0;
    relatedActivities = entity ? countActivitiesForEntity(entity.entity_id) : 0;
  } catch (error) {
    showFormMessage('entity-message', error.message, 'error');
    return;
  }
  const relatedParts = [
    countLabel(related, 'document'),
    countLabel(relatedTickets, 'ticket'),
    countLabel(relatedContacts, 'contact'),
    countLabel(relatedActivities, 'activity')
  ].filter(Boolean);
  const contents =
    relatedParts.length > 0
      ? ` Se moverá a la Papelera junto con ${joinWithY(relatedParts)}.`
      : ' Se moverá a la Papelera.';
  if (
    !confirm(
      `¿Eliminar ${demostrativo(labelFor('entity'))} ${labelFor('entity').toLowerCase()}?${contents} Podrás restaurarlo desde la Papelera; la eliminación definitiva exige una segunda confirmación.`
    )
  )
    return;
  if (staleStorage) {
    qs('error-edit-entity').textContent = 'Los datos cambiaron en otra pestaña. Recarga la página antes de eliminar.';
    return;
  }
  try {
    deleteEntity(id);
    dirty = false;
    qs('error-edit-entity').textContent = '';
    clearEntityForm();
    showFormMessage(
      'entity-message',
      `${labelFor('entity')} eliminado correctamente. Puedes restaurarlo desde la Papelera.`
    );
    const viewTrash = qs('view-trash-action');
    if (viewTrash) viewTrash.hidden = false;
  } catch (error) {
    showFormMessage('entity-message', error.message, 'error');
  }
  refreshAll();
}

function onEditDocumentChange() {
  const id = qs('edit-document').value;
  if (!id) {
    clearDocumentForm();
    return;
  }
  const doc = loadDocuments().find((d) => d.id === id);
  if (doc) {
    startDocumentEdit(doc);
    populateDocumentContactSelect(doc.entity_id, doc.contactId);
  }
}

function handleDeleteSelectedDocument() {
  const id = qs('edit-document').value;
  if (!id) {
    qs('error-edit-document').textContent =
      `Selecciona ${articulo(labelFor('document'))} ${labelFor('document').toLowerCase()} para eliminar.`;
    return;
  }
  if (
    !confirm(
      `¿Eliminar ${demostrativo(labelFor('document'))} ${labelFor('document').toLowerCase()}? El ${labelFor('entity').toLowerCase()} asociado no se eliminará.`
    )
  )
    return;
  if (staleStorage) {
    qs('error-edit-document').textContent = 'Los datos cambiaron en otra pestaña. Recarga la página antes de eliminar.';
    return;
  }
  try {
    deleteDocument(id);
    dirty = false;
    qs('error-edit-document').textContent = '';
    clearDocumentForm();
    showFormMessage('opportunity-message', `${labelFor('document')} eliminada correctamente.`);
  } catch (error) {
    showFormMessage('opportunity-message', error.message, 'error');
  }
  refreshAll();
}

function refreshAll() {
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
  populateTicketEntitySelect();
  renderClientList();
  renderOpportunityPanel();
  if (currentClientEntityId) renderClientTickets(currentClientEntityId);
  if (currentView === 'dashboard') renderDashboard({ onMove: moveOpportunity });
  if (currentView === 'tickets') renderTicketInbox();
  if (currentView === 'search') refreshSearch();
  if (currentView === 'activities') {
    const entitySelect = qs('activity-entity');
    populateActivityEntitySelect(entitySelect ? entitySelect.value : undefined);
    const entityId = qs('activity-entity') ? qs('activity-entity').value : '';
    try {
      const activities = loadActivities();
      const entities = loadEntities();
      const listEl = qs('activity-list-items');
      const emptyEl = qs('activity-list-empty');
      const rendered = renderActivityList(listEl, activities, undefined, (activity) => {
        const entity = entities.find((item) => item.entity_id === activity.entity_id);
        return entity ? entity.name : 'Cliente no disponible';
      });
      if (emptyEl) emptyEl.hidden = rendered;
    } catch (error) {
      reportDataError(error);
    }
    populateActivityLinkOptions(entityId);
  }
  if (currentView === 'trash') renderTrashView();
}

function handleEntitySubmit(ev) {
  ev.preventDefault();
  if (!writesAllowed('entity-message')) return;
  const id = qs('entity-id').value;
  const payload = collectEntityPayload();
  const errors = { ...validateEntity(payload).errors };
  if (isCrmProfile(getConfig())) {
    let entities = [];
    try {
      entities = loadEntities();
    } catch (error) {
      showFormMessage('entity-message', error.message, 'error');
      return;
    }
    Object.assign(errors, validateClient(payload, { entities, currentId: id || null }).errors);
  }
  showEntityErrors(errors);
  if (Object.keys(errors).length > 0) {
    showFormMessage(
      'entity-message',
      `${Object.values(errors)[0]} Revisa los campos marcados antes de guardar.`,
      'error'
    );
    focusFirstInvalid(qs('entity-form'));
    return;
  }
  try {
    if (id) updateEntity(id, payload);
    else addEntity(payload);
    dirty = false;
    clearEntityForm();
    finishFormDrawer('entities');
    showFormMessage('entity-message', `${labelFor('entity')} guardado correctamente.`);
  } catch (error) {
    showFormMessage('entity-message', error.message, 'error');
  }
  refreshAll();
}

function handleDocumentSubmit(ev) {
  ev.preventDefault();
  if (!writesAllowed('opportunity-message')) return;
  const id = qs('document-id').value;
  const payload = collectDocumentPayload();
  let existing;
  let entities = [];
  let documents = [];
  let contacts = [];
  try {
    existing = id ? loadDocuments().find((d) => d.id === id) : undefined;
    entities = loadEntities();
    documents = loadDocuments();
    contacts = loadContacts();
  } catch (error) {
    showFormMessage('opportunity-message', error.message, 'error');
    return;
  }
  const errors = { ...validateDocument(payload, existing ? existing.status : undefined).errors };
  if (isCrmProfile(getConfig())) {
    Object.assign(
      errors,
      validateOpportunity(
        {
          ...payload,
          entityId: payload.entityId,
          series: 'OPP',
          currency: 'CLP',
          status: id ? payload.status : 'Nueva'
        },
        {
          entities,
          documents,
          contacts,
          currentId: id || null,
          mode: id ? 'update' : 'create'
        }
      ).errors
    );
  }
  showDocumentErrors(errors);
  if (Object.keys(errors).length > 0) {
    showFormMessage(
      'opportunity-message',
      `${Object.values(errors)[0]} Revisa los campos marcados antes de guardar.`,
      'error'
    );
    focusFirstInvalid(qs('document-form'));
    return;
  }
  try {
    if (id) updateDocument(id, payload);
    else addDocument(payload);
    dirty = false;
    clearDocumentForm();
    finishFormDrawer('documents');
    const feminine = esFemenina(labelFor('document'));
    const verb = id ? (feminine ? 'actualizada' : 'actualizado') : feminine ? 'registrada' : 'registrado';
    showFormMessage('opportunity-message', `${labelFor('document')} ${verb} correctamente.`);
  } catch (error) {
    showFormMessage('opportunity-message', error.message, 'error');
  }
  refreshAll();
}

function handleTicketSubmit(ev) {
  ev.preventDefault();
  if (!writesAllowed('ticket-message')) return;
  if (!isCrmProfile(getConfig())) return;
  const id = qs('ticket-id').value;
  const payload = collectTicketPayload();
  let entities = [];
  let existingTicket = null;
  try {
    entities = loadEntities();
    if (id) existingTicket = loadTickets().find((ticket) => ticket.id === id) || null;
  } catch (error) {
    showFormMessage('ticket-message', error.message, 'error');
    return;
  }
  const errors = validateTicket(
    {
      ...(existingTicket || {}),
      ...payload,
      entityId: payload.entityId,
      status: id ? existingTicket.status : 'Nuevo'
    },
    {
      entities,
      contacts: loadContacts(),
      documents: loadDocuments(),
      mode: id ? 'update' : 'create'
    }
  ).errors;
  showTicketErrors(errors);
  if (Object.keys(errors).length > 0) {
    showFormMessage(
      'ticket-message',
      `${Object.values(errors)[0]} Revisa los campos marcados antes de guardar.`,
      'error'
    );
    focusFirstInvalid(qs('ticket-form'));
    return;
  }
  try {
    const saved = id ? updateTicket(id, payload) : addTicket(payload);
    currentClientEntityId = saved.entity_id || currentClientEntityId;
    clearTicketForm();
    finishFormDrawer('tickets');
    populateTicketEntitySelect(currentClientEntityId);
    renderClientTickets(currentClientEntityId);
    const message = id ? 'Ticket actualizado correctamente.' : 'Ticket registrado correctamente.';
    showFormMessage('ticket-message', message);
    showFormMessage('ticket-inbox-message', message);
    renderTicketInbox();
    if (currentView === 'dashboard') renderDashboard({ onMove: moveOpportunity });
  } catch (error) {
    showFormMessage('ticket-message', error.message, 'error');
  }
}

function openNewTicketDrawer(entityId) {
  if (!isCrmProfile(getConfig())) return;
  currentClientEntityId = entityId || currentClientEntityId;
  const opened = openFormDrawer('tickets', 'new');
  if (!opened) return;
  populateTicketEntitySelect(currentClientEntityId);
  const select = qs('ticket-entity');
  if (select && currentClientEntityId) select.value = currentClientEntityId;
  populateTicketFormLinks(select ? select.value : currentClientEntityId);
  if (qs('ticket-subject')) qs('ticket-subject').focus();
}

function editTicketById(ticketId) {
  let ticket;
  try {
    ticket = loadTickets().find((t) => t.id === ticketId);
  } catch (error) {
    showFormMessage('ticket-message', error.message, 'error');
    return;
  }
  if (!ticket) return;
  currentClientEntityId = ticket.entity_id;
  populateTicketEntitySelect(ticket.entity_id);
  populateTicketFormLinks(ticket.entity_id, ticket.contactId, ticket.documentId);
  startTicketEdit(ticket);
  openFormDrawer('tickets', 'edit');
  if (qs('ticket-subject')) qs('ticket-subject').focus();
}

function onStorageChange(event) {
  const key = event && event.key;
  // Solo las claves del CRM (o el borrado total) invalidan los formularios.
  if (!isCrmStorageKey(key)) return;
  staleStorage = true;
  if (openTicketDetailId) {
    closeOverlay('ticket-detail', { force: true });
    openTicketDetailId = null;
  }
  showStorageWarning('Los datos cambiaron en otra pestaña. Recarga la página antes de seguir editando.');
}

function onLocationChange() {
  const view = readViewFromHash();
  if (view === currentView) return;
  if (dirty) {
    confirmDiscardChanges({
      onDiscard: () => {
        closeFormDrawer({ force: true });
        dirty = false;
        showModule(view, { skipHistory: true, skipGuard: true });
      },
      onKeepEditing: () => updateHash(currentView, true)
    });
    return;
  }
  showModule(view, { skipHistory: true });
}

function wireEvents() {
  if (wired) return;
  wired = true;
  document.querySelectorAll('.nav-module').forEach((btn) => {
    btn.addEventListener('click', () => showModule(btn.dataset.module));
  });
  document.querySelectorAll('.nav-section').forEach((btn) => {
    btn.addEventListener('click', () => toggleNavSection(btn.dataset.module));
  });
  document.querySelectorAll('.nav-subitem').forEach((btn) => {
    btn.addEventListener('click', () => {
      const module = btn.dataset.module;
      if (!showModule(module)) return;
      if (btn.dataset.mode === 'new') openFormDrawer(module, 'new');
    });
  });
  qs('topbar-primary-action').addEventListener('click', () => {
    if (!showModule('entities')) return;
    openFormDrawer('entities', 'new');
  });
  qs('commercial-columns').addEventListener('click', (event) => {
    const card = event.target.closest('button[data-opportunity-id]');
    if (card && showModule('documents')) editOpportunityById(card.dataset.opportunityId);
  });
  qs('action-new-entity').addEventListener('click', () => openNewDrawer('entities'));
  qs('action-new-document').addEventListener('click', () => openNewDrawer('documents'));
  const dashboardEmptyCta = qs('dashboard-empty-cta');
  if (dashboardEmptyCta) dashboardEmptyCta.addEventListener('click', () => openNewDrawer('entities'));
  qs('action-open-entities').addEventListener('click', () => showModule('entities'));
  qs('action-find').addEventListener('click', () => showModule('search'));
  qs('entity-form').addEventListener('submit', handleEntitySubmit);
  qs('cancel-edit').addEventListener('click', () => cancelFormEdition('entities'));
  qs('document-form').addEventListener('submit', handleDocumentSubmit);
  qs('document-cancel-edit').addEventListener('click', () => cancelFormEdition('documents'));
  qs('ticket-form').addEventListener('submit', handleTicketSubmit);
  qs('ticket-cancel-edit').addEventListener('click', () => cancelFormEdition('tickets'));
  qs('ticket-list-items').addEventListener('click', (event) => {
    const open = event.target.closest ? event.target.closest('[data-open-ticket]') : null;
    if (open) {
      openTicketDetailById(open.dataset.openTicket, open);
      return;
    }
    const resolve = event.target.closest ? event.target.closest('[data-resolve-ticket]') : null;
    if (resolve) {
      resolveTicketById(resolve.dataset.resolveTicket);
      return;
    }
    const edit = event.target.closest ? event.target.closest('[data-edit-ticket]') : null;
    if (edit) editTicketById(edit.dataset.editTicket);
  });
  if (qs('new-ticket-inbox')) {
    qs('new-ticket-inbox').addEventListener('click', () => openNewTicketDrawer(null));
  }
  for (const id of ['ticket-filter-status', 'ticket-filter-priority', 'ticket-filter-assignee']) {
    if (qs(id)) qs(id).addEventListener('change', handleTicketFilterChange);
  }
  if (qs('ticket-sort')) qs('ticket-sort').addEventListener('change', handleTicketSortChange);
  if (qs('ticket-clear-filters')) qs('ticket-clear-filters').addEventListener('click', clearTicketFilters);
  if (qs('tickets-table')) {
    qs('tickets-table').addEventListener('click', (event) => {
      const row = event.target.closest ? event.target.closest('tr[data-ticket-id]') : null;
      if (row) openTicketDetailById(row.dataset.ticketId, row);
    });
    qs('tickets-table').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      const row = event.target.closest ? event.target.closest('tr[data-ticket-id]') : null;
      if (!row) return;
      event.preventDefault();
      openTicketDetailById(row.dataset.ticketId, row);
    });
  }
  qs('contact-form').addEventListener('submit', handleContactSubmit);
  qs('contact-cancel').addEventListener('click', () => {
    clearContactForm();
    qs('contact-form').hidden = true;
  });
  qs('activity-form').addEventListener('submit', handleActivitySubmit);
  qs('activity-cancel').addEventListener('click', () => renderActivityView());
  qs('activity-type').addEventListener('change', syncDueDateRequirement);
  qs('activity-entity').addEventListener('change', () => {
    const entityId = qs('activity-entity').value;
    if (qs('activity-entity-id')) qs('activity-entity-id').value = entityId;
    populateActivityLinkOptions(entityId);
  });
  qs('activity-list-items').addEventListener('click', (event) => {
    const complete = event.target.closest ? event.target.closest('[data-complete-activity]') : null;
    if (complete) {
      completeActivityFromList(complete.dataset.completeActivity);
      return;
    }
    const edit = event.target.closest ? event.target.closest('[data-edit-activity]') : null;
    if (edit) {
      editActivityById(edit.dataset.editActivity);
      return;
    }
    const remove = event.target.closest ? event.target.closest('[data-delete-activity]') : null;
    if (remove) deleteActivityById(remove.dataset.deleteActivity);
  });
  qs('document-no-clients-action').addEventListener('click', () => {
    openQuickCreateClient({
      returnFocus: qs('document-entity') || document.activeElement,
      isBlocked: () => staleStorage || integrityBlocked || isWriteBlocked(),
      onCreated: (created) => {
        populateDocumentEntitySelect();
        const select = qs('document-entity');
        if (select && created) select.value = created.entity_id;
        if (created) populateDocumentContactSelect(created.entity_id);
        if (select) select.focus();
        showFormMessage(
          'opportunity-message',
          'Cliente creado y seleccionado. Cancelar la oportunidad no elimina al cliente.'
        );
      }
    });
  });
  qs('clear-filters').addEventListener('click', clearFiltersKeepingCriterion);
  qs('toggle-filters').addEventListener('click', () => {
    filtersExpanded = !filtersExpanded;
    applyFiltersVisibility();
  });
  qs('search-results-list').addEventListener('click', (event) => {
    const edit = event.target.closest ? event.target.closest('[data-action="edit"]') : null;
    if (edit) {
      editEntityById(edit.dataset.editEntity);
      return;
    }
    const button = event.target.closest ? event.target.closest('[data-open-entity]') : null;
    if (button) showClientDetail(button.dataset.openEntity);
  });
  qs('search-opportunities-list').addEventListener('click', (event) => {
    const edit = event.target.closest ? event.target.closest('[data-action="edit"]') : null;
    if (edit) {
      editOpportunityById(edit.dataset.editDocument);
      return;
    }
    const button = event.target.closest ? event.target.closest('[data-open-document]') : null;
    if (button) showOpportunityDetail(button.dataset.openDocument);
  });
  qs('client-list-items').addEventListener('click', (event) => {
    const edit = event.target.closest ? event.target.closest('[data-action="edit"]') : null;
    if (edit) {
      editEntityById(edit.dataset.editEntity);
      return;
    }
    const button = event.target.closest ? event.target.closest('[data-open-entity]') : null;
    if (button) openClientFromList(button.dataset.openEntity);
  });
  qs('opportunity-list-items').addEventListener('click', (event) => {
    const edit = event.target.closest ? event.target.closest('[data-action="edit"]') : null;
    if (edit) {
      editOpportunityById(edit.dataset.editDocument);
      return;
    }
    const open = event.target.closest ? event.target.closest('[data-open-document]') : null;
    if (open) {
      if (!showModule('search')) return;
      showOpportunityDetail(open.dataset.openDocument);
    }
  });
  qs('entity-detail-body').addEventListener('click', (event) => {
    const ticket = event.target.closest ? event.target.closest('[data-new-ticket]') : null;
    if (ticket) {
      openNewTicketDrawer(ticket.dataset.newTicket);
      return;
    }
    const newContact = event.target.closest ? event.target.closest('[data-new-contact]') : null;
    if (newContact) {
      clearContactForm();
      openContactForm(newContact.dataset.newContact);
      return;
    }
    const emptyContact = event.target.closest ? event.target.closest('[data-empty-cta="new-contact"]') : null;
    if (emptyContact) {
      clearContactForm();
      openContactForm(emptyContact.dataset.entityId);
      return;
    }
    const editContact = event.target.closest ? event.target.closest('[data-edit-contact]') : null;
    if (editContact) {
      editContactById(editContact.dataset.editContact);
      return;
    }
    const deleteContactButton = event.target.closest ? event.target.closest('[data-delete-contact]') : null;
    if (deleteContactButton) {
      deleteContactById(deleteContactButton.dataset.deleteContact);
      return;
    }
    const newActivity = event.target.closest ? event.target.closest('[data-new-activity]') : null;
    if (newActivity) {
      if (showModule('activities', { entityId: newActivity.dataset.newActivity })) {
        renderActivityView({
          entityId: newActivity.dataset.newActivity,
          documentId: newActivity.dataset.documentId,
          focusForm: true
        });
      }
      return;
    }
    const emptyActivity = event.target.closest ? event.target.closest('[data-empty-cta="new-activity"]') : null;
    if (emptyActivity) {
      openActivityFromEmptyState(emptyActivity);
      return;
    }
    const create = event.target.closest ? event.target.closest('[data-new-opportunity]') : null;
    if (!create) return;
    showModule('documents', { newRecord: true });
    const select = qs('document-entity');
    if (select) select.value = create.dataset.newOpportunity;
    populateDocumentContactSelect(create.dataset.newOpportunity);
    if (qs('cf-opportunityTitle')) qs('cf-opportunityTitle').focus();
  });
  const opportunityDetailBody = qs('opportunity-detail-body');
  if (opportunityDetailBody) {
    opportunityDetailBody.addEventListener('click', (event) => {
      const emptyActivity = event.target.closest ? event.target.closest('[data-empty-cta="new-activity"]') : null;
      if (emptyActivity) openActivityFromEmptyState(emptyActivity);
    });
  }
  ['entity-form', 'document-form', 'ticket-form'].forEach((id) => {
    qs(id).addEventListener('input', () => {
      dirty = true;
    });
    qs(id).addEventListener('change', () => {
      dirty = true;
    });
  });
  setupSearchBar(qs('global-search-input'), () => {
    if (!showModule('search', { skipHistory: false })) return;
    refreshSearch();
  });
  ['search-filter-category', 'search-filter-owner', 'search-filter-source'].forEach((id) => {
    if (qs(id)) qs(id).addEventListener('change', handleFiltersChanged);
  });
  qs('edit-entity').addEventListener('change', onEditEntityChange);
  qs('edit-document').addEventListener('change', onEditDocumentChange);
  qs('document-entity').addEventListener('change', () => {
    populateDocumentContactSelect(qs('document-entity').value);
  });
  if (qs('ticket-entity')) {
    qs('ticket-entity').addEventListener('change', () => {
      populateTicketFormLinks(qs('ticket-entity').value);
      for (const id of ['ticket-requester-name', 'ticket-requester-email', 'ticket-requester-phone']) {
        if (qs(id)) qs(id).value = '';
      }
    });
  }
  if (qs('ticket-contact')) {
    qs('ticket-contact').addEventListener('change', () => {
      const contactId = qs('ticket-contact').value;
      if (!contactId) return;
      let contact = null;
      try {
        contact = loadContacts().find((item) => item.id === contactId) || null;
      } catch (error) {
        reportDataError(error);
      }
      if (contact) fillRequesterFromContact(contact);
    });
  }
  qs('delete-entity').addEventListener('click', handleDeleteSelectedEntity);
  qs('view-trash-action').addEventListener('click', () => showModule('trash'));
  qs('delete-document').addEventListener('click', handleDeleteSelectedDocument);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
  }
}

export function initApp(resolved) {
  const recovery = recoverPendingOperation();
  showConfigErrors(resolved.errors, resolved.conflicts);
  setActiveConfig(resolved.config);
  applyTheme(resolved.config);
  document.body.classList.toggle('crm', isCrmProfile(resolved.config));
  renderLogo(qs('logo-mark'));
  applyLabels(resolved.config);
  ensureCategoryControl();
  ensureSearchFilters();
  renderFilterChips(qs('search-filter-chips'), { onChange: handleFiltersChanged });
  applyProfileVisibility();
  wireEvents();
  prepareTicketForm();
  populateTicketInboxFilters();
  prepareActivityForm();
  clearEntityForm();
  clearDocumentForm();
  clearTicketForm();
  clearContactForm();
  clearActivityForm();
  try {
    loadSnapshotForIntegrity();
  } catch (error) {
    integrityBlocked = true;
    showStorageWarning(`${error.message} Las escrituras están bloqueadas hasta corregir o migrar los datos.`);
  }
  if (recovery.error) {
    integrityBlocked = true;
    showStorageWarning(recovery.error);
  } else if (recovery.recovered) {
    showStorageWarning('Se recuperó la última versión íntegra tras una operación interrumpida.');
  }
  const initial = readViewFromHash();
  currentView = null;
  showModule(initial, { skipGuard: true, replaceHash: true });
  refreshAll();
  offerMigrationIfNeeded();
}

function loadSnapshotForIntegrity() {
  // Valida la instantánea completa (estructura, unicidad y referencias).
  loadSnapshot();
}

export async function boot(overrideConfig) {
  const resolved = overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}
