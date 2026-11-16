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
  countTicketsForEntity
} from './storage.js';
import {
  validateClient,
  validateOpportunity,
  validateTicket,
  searchClients,
  searchOpportunities
} from './crm-rules.js';
import { clearEntityForm, startEntityEdit, collectEntityPayload, showEntityErrors } from './components/entity-form.js';
import { createEntityItem, createClientSummary } from './components/entity-list.js';
import {
  clearDocumentForm,
  startDocumentEdit,
  collectDocumentPayload,
  showDocumentErrors
} from './components/document-form.js';
import { createDocumentItem, folioLabel, renderOpportunityList } from './components/document-list.js';
import { renderLogo, applyShellLabels, setActiveNav, toggleNavSection } from './components/shell.js';
import { renderDashboard } from './components/dashboard.js';
import { setupSearchBar, readSearchFilters, clearSearchFilters } from './components/search-bar.js';
import { renderSearchResults } from './components/search-results.js';
import { renderEntityDetail, renderOpportunityDetail } from './components/entity-detail.js';
import { openOverlay, closeOverlay, getTopOverlay } from './components/ui-overlay.js';
import { openQuickCreateClient } from './components/quick-create-client.js';
import {
  prepareTicketForm,
  clearTicketForm,
  startTicketEdit,
  collectTicketPayload,
  showTicketErrors
} from './components/ticket-form.js';
import { renderTicketList } from './components/ticket-list.js';

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

const VIEW_IDS = {
  dashboard: 'view-dashboard',
  entities: 'view-entities',
  documents: 'view-documents',
  search: 'view-search'
};

let wired = false;
let currentView = null;
let currentClientEntityId = null;
let dirty = false;
let staleStorage = false;
let openFormOverlay = null;

function availableViews() {
  return ['dashboard', 'entities', 'documents', 'search'];
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

  if (name === 'dashboard') renderDashboard();
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
  const notice = qs('document-no-clients');
  if (notice) notice.hidden = !(isCrmProfile(getConfig()) && entities.length === 0);
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
  emptyEl.hidden = entities.length > 0;
  const crm = isCrmProfile(getConfig());
  entities.forEach((entity) => listEl.appendChild(crm ? createClientSummary(entity) : createEntityItem(entity)));
}

function renderOpportunityPanel() {
  const listEl = qs('opportunity-list-items');
  const emptyEl = qs('opportunity-list-empty');
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
  emptyEl.hidden = documents.length > 0;
  const crm = isCrmProfile(getConfig());
  if (crm) {
    renderOpportunityList(listEl, documents, (doc) => {
      const entity = entities.find((e) => e.entity_id === doc.entity_id);
      return entity ? `${entity.name} (${entity.code})` : undefined;
    });
    return;
  }
  documents.forEach((doc) => {
    const entity = entities.find((e) => e.entity_id === doc.entity_id);
    listEl.appendChild(createDocumentItem(doc, entity ? entity.name : undefined));
  });
}

function refreshSearch() {
  const listEl = qs('search-results-list');
  if (!listEl) return;
  const input = qs('global-search-input');
  const term = input ? input.value : '';
  const emptyEl = qs('search-empty');
  const hintEl = qs('search-hint');
  const opportunitiesSection = qs('search-opportunities');
  const opportunitiesList = qs('search-opportunities-list');
  const hasCriterion = String(term || '').trim() !== '';

  if (!isCrmProfile(getConfig())) {
    listEl.innerHTML = '';
    if (opportunitiesSection) opportunitiesSection.hidden = true;
    if (opportunitiesList) opportunitiesList.innerHTML = '';
    if (!hasCriterion) {
      if (hintEl) hintEl.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      return;
    }
    let results = [];
    try {
      results = searchEntities(term);
    } catch (error) {
      reportDataError(error);
    }
    if (hintEl) hintEl.hidden = true;
    if (emptyEl) emptyEl.hidden = results.length > 0;
    results.forEach((entity) => listEl.appendChild(createEntityItem(entity)));
    return;
  }

  const filters = readSearchFilters();
  let clients = [];
  let opportunities = [];
  try {
    const entities = loadEntities();
    clients = searchClients(term, filters, entities);
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
    opportunitiesSection,
    opportunitiesList,
    hasCriterion
  });
}

function showClientDetail(entityId) {
  let entity;
  let opportunities = [];
  try {
    entity = loadEntities().find((e) => e.entity_id === entityId);
    if (entity) opportunities = loadDocuments().filter((d) => d.entity_id === entityId);
  } catch (error) {
    reportDataError(error);
    return;
  }
  if (!entity) return;
  currentClientEntityId = entityId;
  renderEntityDetail(qs('entity-detail-body'), entity, opportunities, undefined, {
    showTicketAction: isCrmProfile(getConfig())
  });
  qs('entity-detail').hidden = false;
  qs('opportunity-detail').hidden = true;
  const ticketSection = qs('ticket-section');
  if (ticketSection) ticketSection.hidden = !isCrmProfile(getConfig());
  if (isCrmProfile(getConfig())) {
    clearTicketForm();
    populateTicketEntitySelect(entityId);
    renderClientTickets(entityId);
  }
}

function showOpportunityDetail(documentId) {
  let document_;
  let client;
  try {
    document_ = loadDocuments().find((d) => d.id === documentId);
    if (document_) client = loadEntities().find((e) => e.entity_id === document_.entity_id);
  } catch (error) {
    reportDataError(error);
    return;
  }
  if (!document_) return;
  renderOpportunityDetail(qs('opportunity-detail-body'), document_, client);
  qs('opportunity-detail').hidden = false;
  qs('entity-detail').hidden = true;
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
  openFormDrawer('documents', 'edit');
  if (qs('folio')) qs('folio').focus();
}

function deleteOpportunityById(documentId) {
  if (!documentId) return;
  const feminine = esFemenina(labelFor('document'));
  const noun = labelFor('document').toLowerCase();
  if (
    !confirm(
      `¿Eliminar ${demostrativo(labelFor('document'))} ${noun}? El ${labelFor('entity').toLowerCase()} asociado no se eliminará.`
    )
  )
    return;
  if (staleStorage) {
    showFormMessage(
      'opportunity-message',
      'Los datos cambiaron en otra pestaña. Recarga la página antes de eliminar.',
      'error'
    );
    return;
  }
  try {
    deleteDocument(documentId);
    dirty = false;
    if (qs('document-id').value === documentId) clearDocumentForm();
    showFormMessage(
      'opportunity-message',
      `${labelFor('document')} ${feminine ? 'eliminada' : 'eliminado'} correctamente.`
    );
  } catch (error) {
    showFormMessage('opportunity-message', error.message, 'error');
  }
  refreshAll();
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
  if (container) container.hidden = !(any && isCrmProfile(getConfig()));
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
  const emptyHint = qs('dashboard-empty-hint');
  if (emptyHint) {
    emptyHint.textContent = `Aún no hay datos en el panel. Comienza registrando ${articulo(entity)} ${entity.toLowerCase()} y luego crea su primera ${document_.toLowerCase()}.`;
  }

  qs('entities-view-heading').textContent = entities;
  qs('entity-form-heading').textContent = `Agregar / Editar ${entity}`;
  qs('edit-entity-heading').textContent = `Editar o eliminar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs('delete-entity').textContent = `Eliminar ${articulo(entity)} ${entity.toLowerCase()} ${seleccionada(entity)}`;
  qs('client-list-heading').textContent = `${entities} ${entityClass}`;
  qs('client-list-empty-text').textContent = `No hay ${entities.toLowerCase()} ${entityClass}`;
  qs('client-list-create').textContent = `${femEntity ? 'Nueva' : 'Nuevo'} ${entity}`;

  qs('documents-view-heading').textContent = documents;
  qs('document-form-heading').textContent = `Agregar / Editar ${document_}`;
  qs('edit-document-heading').textContent = `Editar o eliminar ${articulo(document_)} ${document_.toLowerCase()}`;
  qs('delete-document').textContent =
    `Eliminar ${articulo(document_)} ${document_.toLowerCase()} ${seleccionada(document_)}`;
  qs('document-entity-label').textContent = `${entity} *`;
  qs('opportunity-list-empty').textContent = `No se encontraron ${documents.toLowerCase()}`;
  qs('document-no-clients-text').textContent = `Primero debes registrar ${articulo(entity)} ${entity.toLowerCase()}.`;
  qs('document-no-clients-action').textContent = 'Crear cliente ahora';

  qs('search-view-heading').textContent = `Buscar ${entities}`;
  qs('search-heading').textContent = `Buscar ${articulo(entity)} ${entity.toLowerCase()}`;
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
  try {
    entity = loadEntities().find((e) => e.id === id);
    related = entity ? countDocumentsForEntity(entity.entity_id) : 0;
    relatedTickets = entity ? countTicketsForEntity(entity.entity_id) : 0;
  } catch (error) {
    showFormMessage('entity-message', error.message, 'error');
    return;
  }
  const noun = labelFor('documents').toLowerCase();
  const feminineDocuments = esFemenina(labelFor('documents'));
  const documentsExtra =
    related > 0 ? ` Se eliminarán ${related} ${noun} ${feminineDocuments ? 'asociadas' : 'asociados'}.` : '';
  const ticketsExtra =
    relatedTickets > 0
      ? ` Se eliminarán ${relatedTickets} ${relatedTickets === 1 ? 'ticket asociado' : 'tickets asociados'}.`
      : '';
  const extra = `${documentsExtra}${ticketsExtra}`;
  if (
    !confirm(
      `¿Eliminar ${demostrativo(labelFor('entity'))} ${labelFor('entity').toLowerCase()}?${extra} Esta acción no se puede deshacer.`
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
    showFormMessage('entity-message', `${labelFor('entity')} eliminado correctamente.`);
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
  if (doc) startDocumentEdit(doc);
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
  if (currentView === 'dashboard') renderDashboard();
  if (currentView === 'search') refreshSearch();
}

function handleEntitySubmit(ev) {
  ev.preventDefault();
  if (staleStorage) {
    showFormMessage(
      'entity-message',
      'Los datos cambiaron en otra pestaña. Recarga la página antes de guardar.',
      'error'
    );
    return;
  }
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
  if (staleStorage) {
    showFormMessage(
      'opportunity-message',
      'Los datos cambiaron en otra pestaña. Recarga la página antes de guardar.',
      'error'
    );
    return;
  }
  const id = qs('document-id').value;
  const payload = collectDocumentPayload();
  let existing;
  let entities = [];
  let documents = [];
  try {
    existing = id ? loadDocuments().find((d) => d.id === id) : undefined;
    entities = loadEntities();
    documents = loadDocuments();
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
  if (staleStorage) {
    showFormMessage(
      'ticket-message',
      'Los datos cambiaron en otra pestaña. Recarga la página antes de guardar.',
      'error'
    );
    return;
  }
  if (!isCrmProfile(getConfig())) return;
  const id = qs('ticket-id').value;
  const payload = collectTicketPayload();
  let entities = [];
  try {
    entities = loadEntities();
  } catch (error) {
    showFormMessage('ticket-message', error.message, 'error');
    return;
  }
  const errors = validateTicket(
    { ...payload, status: id ? payload.status : 'En proceso' },
    { entities, mode: id ? 'update' : 'create' }
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
    showFormMessage('ticket-message', id ? 'Ticket actualizado correctamente.' : 'Ticket registrado correctamente.');
  } catch (error) {
    showFormMessage('ticket-message', error.message, 'error');
  }
}

function resolveTicketById(ticketId) {
  if (!ticketId) return;
  if (staleStorage) {
    showFormMessage(
      'ticket-message',
      'Los datos cambiaron en otra pestaña. Recarga la página antes de actualizar.',
      'error'
    );
    return;
  }
  try {
    const updated = updateTicket(ticketId, { status: 'Resuelto' });
    currentClientEntityId = updated.entity_id || currentClientEntityId;
    renderClientTickets(currentClientEntityId);
    showFormMessage('ticket-message', 'Ticket marcado como resuelto.');
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
  if (qs('ticket-product-name')) qs('ticket-product-name').focus();
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
  startTicketEdit(ticket);
  openFormDrawer('tickets', 'edit');
  if (qs('ticket-description')) qs('ticket-description').focus();
}

function onStorageChange(event) {
  const key = event && event.key;
  staleStorage = true;
  showStorageWarning(
    key
      ? 'Los datos cambiaron en otra pestaña. Recarga la página antes de seguir editando.'
      : 'Los datos cambiaron en otra pestaña. Recarga la página antes de seguir editando.'
  );
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
  qs('action-new-entity').addEventListener('click', () => showModule('entities', { newRecord: true, focusForm: true }));
  qs('action-new-document').addEventListener('click', () =>
    showModule('documents', { newRecord: true, focusForm: true })
  );
  qs('action-open-entities').addEventListener('click', () => showModule('entities'));
  qs('action-find').addEventListener('click', () => showModule('search'));
  qs('entity-form').addEventListener('submit', handleEntitySubmit);
  qs('cancel-edit').addEventListener('click', () => cancelFormEdition('entities'));
  qs('document-form').addEventListener('submit', handleDocumentSubmit);
  qs('document-cancel-edit').addEventListener('click', () => cancelFormEdition('documents'));
  qs('ticket-form').addEventListener('submit', handleTicketSubmit);
  qs('ticket-cancel-edit').addEventListener('click', () => cancelFormEdition('tickets'));
  qs('ticket-list-items').addEventListener('click', (event) => {
    const resolve = event.target.closest ? event.target.closest('[data-resolve-ticket]') : null;
    if (resolve) {
      resolveTicketById(resolve.dataset.resolveTicket);
      return;
    }
    const edit = event.target.closest ? event.target.closest('[data-edit-ticket]') : null;
    if (edit) editTicketById(edit.dataset.editTicket);
  });
  qs('client-list-create').addEventListener('click', () =>
    showModule('entities', { newRecord: true, focusForm: true })
  );
  qs('document-no-clients-action').addEventListener('click', () => {
    openQuickCreateClient({
      returnFocus: qs('document-entity') || document.activeElement,
      onCreated: (created) => {
        populateDocumentEntitySelect();
        const select = qs('document-entity');
        if (select && created) select.value = created.entity_id;
        if (select) select.focus();
      }
    });
  });
  qs('clear-filters').addEventListener('click', () => {
    clearSearchFilters();
    refreshSearch();
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
    const edit = event.target.closest ? event.target.closest('[data-edit-document]') : null;
    if (edit) {
      editOpportunityById(edit.dataset.editDocument);
      return;
    }
    const remove = event.target.closest ? event.target.closest('[data-delete-document]') : null;
    if (remove) deleteOpportunityById(remove.dataset.deleteDocument);
  });
  qs('entity-detail-body').addEventListener('click', (event) => {
    const ticket = event.target.closest ? event.target.closest('[data-new-ticket]') : null;
    if (ticket) {
      openNewTicketDrawer(ticket.dataset.newTicket);
      return;
    }
    const create = event.target.closest ? event.target.closest('[data-new-opportunity]') : null;
    if (!create) return;
    showModule('documents', { newRecord: true });
    const select = qs('document-entity');
    if (select) select.value = create.dataset.newOpportunity;
    if (qs('cf-opportunityTitle')) qs('cf-opportunityTitle').focus();
  });
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
    if (qs(id)) qs(id).addEventListener('change', () => refreshSearch());
  });
  qs('edit-entity').addEventListener('change', onEditEntityChange);
  qs('edit-document').addEventListener('change', onEditDocumentChange);
  qs('delete-entity').addEventListener('click', handleDeleteSelectedEntity);
  qs('delete-document').addEventListener('click', handleDeleteSelectedDocument);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
  }
}

export function initApp(resolved) {
  showConfigErrors(resolved.errors, resolved.conflicts);
  setActiveConfig(resolved.config);
  applyTheme(resolved.config);
  document.body.classList.toggle('crm', isCrmProfile(resolved.config));
  renderLogo(qs('logo-mark'));
  applyLabels(resolved.config);
  ensureCategoryControl();
  ensureSearchFilters();
  applyProfileVisibility();
  wireEvents();
  prepareTicketForm();
  clearEntityForm();
  clearDocumentForm();
  clearTicketForm();
  const initial = readViewFromHash();
  currentView = null;
  showModule(initial, { skipGuard: true, replaceHash: true });
  refreshAll();
}

export async function boot(overrideConfig) {
  const resolved = overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}
