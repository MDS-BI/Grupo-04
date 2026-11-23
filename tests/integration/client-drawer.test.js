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

function pressEscape() {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

function pressTab(shiftKey = false) {
  document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
  );
}

function drawer() {
  return document.querySelector('#overlay-root [role="dialog"][data-variant="drawer"]');
}

function dialogs() {
  return [...document.querySelectorAll('#overlay-root [role="dialog"]')];
}

function confirmDialog() {
  return qs('confirm-discard');
}

function input(id, value) {
  const element = qs(id);
  element.value = value;
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function fillClient(overrides = {}) {
  input('name', overrides.name ?? 'Empresa Demo 1');
  input('code', overrides.code ?? 'CLI-DEMO-003');
  input('category', overrides.category ?? 'Prospecto');
  input('cf-accountOwner', overrides.accountOwner ?? 'Ejecutivo A');
  input('cf-acquisitionSource', overrides.acquisitionSource ?? 'Referido');
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

function seedClient(overrides = {}) {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido',
    ...overrides
  });
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US-UX-02 — alta y edición de cliente en drawer', () => {
  it('abre el drawer desde «Nuevo cliente» con formulario vacío, obligatorios marcados y foco inicial', () => {
    qs('nav-entities-new').click();

    const panel = drawer();
    expect(panel).not.toBeNull();
    expect(qs('view-entities').hidden).toBe(false);
    expect(panel.querySelector('#entity-form')).not.toBeNull();
    expect(qs('entity-id').value).toBe('');
    expect(qs('name').value).toBe('');
    expect(document.activeElement).toBe(qs('name'));
    expect(qs('name').getAttribute('aria-required')).toBe('true');
    expect(document.querySelector('label[for="name"]').textContent).toContain('*');
  });

  it('guarda un cliente válido, cierra el drawer y muestra la fila sin recargar', () => {
    qs('nav-entities-new').click();
    fillClient();
    submitForm('entity-form');

    expect(drawer()).toBeNull();
    expect(storage.loadEntities().length).toBe(1);
    expect(qs('entity-message').textContent).toMatch(/guardado|registrad/i);
    expect(qs('client-list-items').textContent).toContain('Empresa Demo 1');
    expect(qs('client-list-empty').hidden).toBe(true);
    expect(qs('entity-form').closest('.card').parentElement).toBe(qs('view-entities'));
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('edita desde la acción «Editar» de la fila conservando id y entity_id', () => {
    const created = seedClient();
    qs('nav-entities').click();

    const edit = qs('client-list-items').querySelector('[data-action="edit"]');
    expect(edit).not.toBeNull();
    expect(edit.getAttribute('aria-label')).toMatch(/Editar .*Empresa Demo 1/);
    edit.focus();
    edit.click();

    expect(drawer()).not.toBeNull();
    expect(qs('entity-id').value).toBe(created.id);
    expect(qs('name').value).toBe('Empresa Demo 1');
    expect(qs('client-list-items').querySelector('[data-delete-entity]')).toBeNull();

    input('cf-acquisitionSource', 'Sitio web');
    submitForm('entity-form');

    const updated = storage.loadEntities()[0];
    expect(drawer()).toBeNull();
    expect(updated.id).toBe(created.id);
    expect(updated.entity_id).toBe(created.entity_id);
    expect(updated.acquisitionSource).toBe('Sitio web');
    expect(qs('client-list-items').textContent).toContain('Sitio web');
  });

  it('muestra los errores dentro del drawer, conserva lo escrito y enfoca el primer campo inválido', () => {
    qs('nav-entities-new').click();
    input('name', '   ');
    input('code', '');
    input('category', '');

    submitForm('entity-form');

    const panel = drawer();
    expect(panel).not.toBeNull();
    expect(panel.contains(qs('error-name'))).toBe(true);
    expect(panel.contains(qs('error-code'))).toBe(true);
    expect(qs('error-name').textContent).toContain('obligatorio');
    expect(qs('name').getAttribute('aria-describedby')).toContain('error-name');
    expect(qs('name').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(qs('name'));
    expect(qs('name').value).toBe('   ');
    expect(storage.loadEntities().length).toBe(0);
  });

  it('pide confirmación con el modal propio al cerrar con Esc y conserva los datos con «Seguir editando»', () => {
    qs('nav-entities-new').click();
    input('name', 'Borrador sin guardar');

    pressEscape();

    const confirm = confirmDialog();
    expect(confirm).not.toBeNull();
    expect(confirm.getAttribute('role')).toBe('dialog');
    expect(confirm.dataset.variant).toBe('modal');
    expect(confirm.textContent).toContain('Descartar cambios');
    expect(dialogs().length).toBe(2);
    expect(confirm.querySelector('[data-cancel-discard]').textContent).toBe('Seguir editando');
    expect(confirm.querySelector('[data-confirm-discard]').textContent).toBe('Descartar');

    confirm.querySelector('[data-cancel-discard]').click();

    expect(confirmDialog()).toBeNull();
    expect(drawer()).not.toBeNull();
    expect(qs('name').value).toBe('Borrador sin guardar');
    expect(dialogs().length).toBe(1);
  });

  it('descarta sin persistir ni mostrar éxito y devuelve el foco al disparador', () => {
    const trigger = qs('topbar-primary-action');
    trigger.focus();
    trigger.click();
    input('name', 'Borrador sin guardar');

    pressEscape();
    confirmDialog().querySelector('[data-confirm-discard]').click();

    expect(drawer()).toBeNull();
    expect(confirmDialog()).toBeNull();
    expect(storage.loadEntities().length).toBe(0);
    expect(qs('entity-message').textContent).toBe('');
    expect(qs('entity-form').closest('.card').parentElement).toBe(qs('view-entities'));
    expect(document.activeElement).toBe(trigger);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('pide confirmación al cerrar con el velo y con «Cancelar edición»', () => {
    const created = seedClient();
    qs('nav-entities').click();
    const edit = qs('client-list-items').querySelector('[data-action="edit"]');
    edit.click();
    input('name', 'Nombre modificado');

    const backdrop = document.querySelector('#overlay-root [data-overlay-backdrop]');
    backdrop.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(confirmDialog()).not.toBeNull();

    confirmDialog().querySelector('[data-confirm-discard]').click();
    expect(drawer()).toBeNull();
    expect(storage.loadEntities()[0].name).toBe(created.name);

    edit.click();
    input('name', 'Otro cambio');
    qs('cancel-edit').click();
    expect(confirmDialog()).not.toBeNull();
    confirmDialog().querySelector('[data-cancel-discard]').click();
    expect(drawer()).not.toBeNull();
    expect(qs('name').value).toBe('Otro cambio');
  });

  it('encierra el foco con Tab y Shift+Tab dentro del drawer', () => {
    qs('nav-entities-new').click();
    const panel = drawer();
    const first = qs('name');
    const last = qs('submit-button');

    last.focus();
    pressTab();
    expect(document.activeElement).toBe(first);

    first.focus();
    pressTab(true);
    expect(document.activeElement).toBe(last);

    qs('topbar-primary-action').focus();
    expect(document.activeElement).not.toBe(qs('topbar-primary-action'));
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('expone role="dialog", aria-modal y un título asociado', () => {
    qs('nav-entities-new').click();
    const panel = drawer();
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    const labelId = panel.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId).textContent).toBe('Nuevo cliente');
  });
});
