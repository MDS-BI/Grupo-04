import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;
let storage;

function qs(id) {
  return document.getElementById(id);
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function value(id, next) {
  const element = qs(id);
  element.value = next;
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function quickCreate() {
  return qs('quick-create-client');
}

function drawer() {
  return document.querySelector('#overlay-root [role="dialog"][data-variant="drawer"]');
}

function fillOpportunity(overrides = {}) {
  value('cf-opportunityTitle', overrides.title ?? 'Adquisición de compresor industrial');
  value('folio', overrides.folio ?? '3001');
  value('startDate', overrides.startDate ?? '2026-11-02');
  value('endDate', overrides.endDate ?? '2026-11-30');
  value('totalAmount', overrides.amount ?? '8500000');
  value('cf-opportunityOwner', overrides.owner ?? 'Ejecutivo A');
}

function fillQuickClient(overrides = {}) {
  value('qc-name', overrides.name ?? 'Empresa Demo 1');
  value('qc-code', overrides.code ?? 'CLI-DEMO-003');
  value('qc-category', overrides.category ?? 'Prospecto');
  value('qc-account-owner', overrides.owner ?? 'Ejecutivo A');
  value('qc-acquisition-source', overrides.source ?? 'Referido');
}

async function startDom() {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
  storage = await import('../../src/storage.js');
}

function openEmptyOpportunityDrawer() {
  qs('nav-documents-new').click();
  expect(drawer()).not.toBeNull();
  expect(qs('document-no-clients').hidden).toBe(false);
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US-UX-02 — alta de cliente al vuelo desde la oportunidad', () => {
  it('crea el cliente, actualiza y selecciona el selector y conserva el formulario de oportunidad', () => {
    openEmptyOpportunityDrawer();
    const action = qs('document-no-clients-action');
    expect(action.textContent).toMatch(/crear cliente ahora/i);

    fillOpportunity();
    action.click();

    const modal = quickCreate();
    expect(modal).not.toBeNull();
    expect(modal.dataset.variant).toBe('modal');
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(qs('qc-name'));
    expect(document.querySelectorAll('#overlay-root [role="dialog"]').length).toBe(2);

    fillQuickClient();
    submitForm('quick-create-form');

    expect(quickCreate()).toBeNull();
    expect(storage.loadEntities().length).toBe(1);
    const created = storage.loadEntities()[0];
    expect(created.name).toBe('Empresa Demo 1');
    expect(created.code).toBe('CLI-DEMO-003');
    expect(created.category).toBe('Prospecto');
    expect(created.accountOwner).toBe('Ejecutivo A');
    expect(created.acquisitionSource).toBe('Referido');

    expect(qs('document-entity').value).toBe(created.entity_id);
    expect(qs('document-no-clients').hidden).toBe(true);
    expect(qs('cf-opportunityTitle').value).toBe('Adquisición de compresor industrial');
    expect(qs('folio').value).toBe('3001');
    expect(qs('startDate').value).toBe('2026-11-02');
    expect(qs('endDate').value).toBe('2026-11-30');
    expect(qs('totalAmount').value).toBe('8500000');
    expect(qs('cf-opportunityOwner').value).toBe('Ejecutivo A');
    expect(drawer()).not.toBeNull();

    submitForm('document-form');

    expect(storage.loadDocuments().length).toBe(1);
    expect(storage.loadDocuments()[0].entity_id).toBe(created.entity_id);
    expect(qs('opportunity-list-items').textContent).toContain('OPP-3001');
  });

  it('cancela el alta al vuelo sin crear registros ni alterar el formulario de oportunidad', () => {
    openEmptyOpportunityDrawer();
    fillOpportunity();
    qs('document-no-clients-action').click();

    value('qc-name', 'Borrador descartado');
    qs('quick-create-client').querySelector('[data-quick-create-cancel]').click();

    // Con cambios reales se solicita confirmación antes de descartar.
    expect(qs('confirm-discard')).not.toBeNull();
    qs('confirm-discard').querySelector('[data-confirm-discard]').click();

    expect(quickCreate()).toBeNull();
    expect(storage.loadEntities().length).toBe(0);
    expect(qs('document-entity').options.length).toBe(0);
    expect(qs('cf-opportunityTitle').value).toBe('Adquisición de compresor industrial');
    expect(qs('folio').value).toBe('3001');
    expect(qs('totalAmount').value).toBe('8500000');
    expect(drawer()).not.toBeNull();
  });

  it('rechaza datos inválidos sin crear el cliente y enfoca el primer campo con error', () => {
    openEmptyOpportunityDrawer();
    fillOpportunity();
    qs('document-no-clients-action').click();

    submitForm('quick-create-form');

    expect(quickCreate()).not.toBeNull();
    expect(storage.loadEntities().length).toBe(0);
    expect(qs('error-qc-name').textContent).toContain('obligatorio');
    expect(qs('error-qc-code').textContent).toContain('obligatorio');
    expect(qs('qc-name').getAttribute('aria-invalid')).toBe('true');
    expect(qs('qc-name').getAttribute('aria-describedby')).toContain('error-qc-name');
    expect(document.activeElement).toBe(qs('qc-name'));
    expect(qs('folio').value).toBe('3001');
    expect(drawer()).not.toBeNull();
  });

  it('cierra sin confirmación cuando no hay cambios y conserva la oportunidad al descartar', () => {
    openEmptyOpportunityDrawer();
    fillOpportunity();
    qs('document-no-clients-action').click();
    qs('quick-create-client').querySelector('[data-quick-create-cancel]').click();
    expect(qs('confirm-discard')).toBeNull();
    expect(quickCreate()).toBeNull();
    expect(drawer()).not.toBeNull();
    expect(qs('cf-opportunityTitle').value).toBe('Adquisición de compresor industrial');

    qs('document-no-clients-action').click();
    value('qc-name', 'Borrador');
    qs('quick-create-client').querySelector('[data-quick-create-cancel]').click();
    qs('confirm-discard').querySelector('[data-confirm-discard]').click();
    expect(quickCreate()).toBeNull();
    expect(drawer()).not.toBeNull();
    expect(qs('folio').value).toBe('3001');
    expect(storage.loadEntities().length).toBe(0);
  });

  it('ignora cambios de claves ajenas al CRM y bloquea el guardado ante cambios relevantes', () => {
    openEmptyOpportunityDrawer();
    fillOpportunity();
    qs('document-no-clients-action').click();
    fillQuickClient();

    const foreign = new dom.window.Event('storage');
    Object.defineProperty(foreign, 'key', { value: 'otro_modulo:preferencias' });
    window.dispatchEvent(foreign);

    submitForm('quick-create-form');
    expect(storage.loadEntities().length).toBe(1);
    expect(quickCreate()).toBeNull();

    qs('document-no-clients-action').click();
    fillQuickClient({ name: 'Empresa Bloqueada', code: 'CLI-DEMO-099' });
    const relevant = new dom.window.Event('storage');
    Object.defineProperty(relevant, 'key', { value: 'erp_base_module:entities' });
    window.dispatchEvent(relevant);

    submitForm('quick-create-form');
    expect(quickCreate()).not.toBeNull();
    expect(storage.loadEntities().length).toBe(1);
    expect(qs('quick-create-message').textContent).toMatch(/otra pestaña|bloqueada/i);
    expect(qs('qc-name').value).toBe('Empresa Bloqueada');
  });
});
