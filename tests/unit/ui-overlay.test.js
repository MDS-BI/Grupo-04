import { describe, it, expect, beforeEach, vi } from 'vitest';

let overlay;

function press(key, options = {}) {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }));
}

function contentWithFields() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <label for="field-a">Nombre</label>
    <input id="field-a" />
    <label for="field-b">Código</label>
    <input id="field-b" />
    <button type="button" id="inside-button">Confirmar</button>
  `;
  return wrapper;
}

function dialogs() {
  return [...document.querySelectorAll('#overlay-root [role="dialog"]')];
}

function mount() {
  document.body.innerHTML = `
    <div class="workspace">
      <button type="button" id="trigger">Abrir</button>
      <input id="background-field" />
      <button type="button" id="background-button">Fondo</button>
    </div>
    <div id="overlay-root"></div>
  `;
}

function openForm({ id = 'form-overlay', isDirty } = {}) {
  const trigger = document.getElementById('trigger');
  trigger.focus();
  return overlay.openOverlay({
    id,
    variant: 'drawer',
    title: 'Nuevo cliente',
    content: contentWithFields(),
    returnFocus: trigger,
    isDirty
  });
}

beforeEach(async () => {
  vi.resetModules();
  mount();
  globalThis.confirm = vi.fn(() => true);
  overlay = await import('../../src/components/ui-overlay.js');
});

describe('ui-overlay — diálogo accesible con pila', () => {
  it('abre el overlay en #overlay-root con rol, aria-modal y título asociado', () => {
    const record = openForm();
    const [dialog] = dialogs();

    expect(dialogs().length).toBe(1);
    expect(dialog.dataset.variant).toBe('drawer');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId).textContent).toBe('Nuevo cliente');
    expect(record.id).toBe('form-overlay');
    expect(overlay.getTopOverlay().id).toBe('form-overlay');
    expect(document.activeElement.id).toBe('field-a');
  });

  it('bloquea el foco del fondo sin usar inert', () => {
    openForm();
    const background = document.getElementById('background-field');
    background.focus();

    expect(background.contains(document.activeElement)).toBe(false);
    expect(document.querySelector('.workspace').hasAttribute('inert')).toBe(false);
    expect(document.getElementById('overlay-root').contains(document.activeElement)).toBe(true);
  });

  it('cierra con Escape y devuelve el foco al disparador', () => {
    const trigger = document.getElementById('trigger');
    openForm();
    trigger.focus();
    trigger.blur();
    trigger.focus();

    press('Escape');

    expect(dialogs().length).toBe(0);
    expect(overlay.getTopOverlay()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('cierra con clic en el velo', () => {
    const trigger = document.getElementById('trigger');
    openForm();
    const backdrop = document.querySelector('#overlay-root [data-overlay-backdrop]');
    backdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(dialogs().length).toBe(0);
    expect(document.activeElement).toBe(trigger);
  });

  it('atrapar el foco con Tab y Shift+Tab dentro del overlay', () => {
    openForm();
    const first = document.getElementById('field-a');
    const last = document.getElementById('inside-button');

    last.focus();
    press('Tab');
    expect(document.activeElement).toBe(first);

    first.focus();
    press('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(last);

    document.getElementById('background-button').focus();
    expect(document.getElementById('overlay-root').contains(document.activeElement)).toBe(true);
  });

  it('pide confirmación si el overlay está sucio y no usa window.confirm', () => {
    openForm({ isDirty: () => true });

    press('Escape');

    const confirmDialog = document.getElementById('confirm-discard');
    expect(confirmDialog).not.toBeNull();
    expect(confirmDialog.dataset.variant).toBe('modal');
    expect(confirmDialog.textContent).toContain('Descartar cambios');
    expect(confirmDialog.querySelector('[data-cancel-discard]').textContent).toBe('Seguir editando');
    expect(confirmDialog.querySelector('[data-confirm-discard]').textContent).toBe('Descartar');
    expect(overlay.getTopOverlay().id).toBe('confirm-discard');
    expect(overlay.hasDirtyOverlay()).toBe(true);

    confirmDialog.querySelector('[data-cancel-discard]').click();

    expect(document.getElementById('confirm-discard')).toBeNull();
    expect(overlay.getTopOverlay().id).toBe('form-overlay');
    expect(document.getElementById('overlay-root').contains(document.activeElement)).toBe(true);

    press('Escape');
    document.querySelector('#confirm-discard [data-confirm-discard]').click();

    expect(document.getElementById('confirm-discard')).toBeNull();
    expect(overlay.getTopOverlay()).toBeNull();
    expect(dialogs().length).toBe(0);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });

  it('apila dos overlays y solo responde el superior', () => {
    const trigger = document.getElementById('trigger');
    overlay.openOverlay({
      id: 'base',
      variant: 'drawer',
      title: 'Base',
      content: contentWithFields(),
      returnFocus: trigger
    });
    overlay.openOverlay({
      id: 'stacked',
      variant: 'modal',
      title: 'Encima',
      content: contentWithFields(),
      returnFocus: trigger
    });

    expect(dialogs().length).toBe(2);
    dialogs().forEach((dialog) => expect(dialog.getAttribute('aria-modal')).toBe('true'));
    expect(overlay.getTopOverlay().id).toBe('stacked');
    expect(dialogs()[1].getAttribute('aria-labelledby')).toBe('overlay-title');
    expect(dialogs()[0].getAttribute('aria-labelledby')).not.toBe('overlay-title');

    const baseBackdrop = dialogs()[0].parentElement.querySelector('[data-overlay-backdrop]');
    baseBackdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(dialogs().length).toBe(2);

    press('Escape');
    expect(dialogs().length).toBe(1);
    expect(overlay.getTopOverlay().id).toBe('base');
    expect(dialogs()[0].getAttribute('aria-labelledby')).toBe('overlay-title');

    press('Escape');
    expect(dialogs().length).toBe(0);
    expect(overlay.getTopOverlay()).toBeNull();
    expect(overlay.hasDirtyOverlay()).toBe(false);
  });

  it('openConfirmDialog confirma, cancela con Escape y conserva el error sin cerrar', () => {
    const trigger = document.getElementById('trigger');
    trigger.focus();
    let outcome = 'No se pudo guardar';
    overlay.openConfirmDialog({
      id: 'test-confirm',
      title: 'Eliminar ticket',
      message: ['¿Eliminar TKT-2026-0001?', 'El cliente permanece.'],
      confirmLabel: 'Eliminar ticket',
      danger: true,
      returnFocus: trigger,
      onConfirm: () => outcome
    });

    const dialog = document.getElementById('test-confirm');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('TKT-2026-0001');
    expect(dialog.textContent).toContain('El cliente permanece');
    expect(document.activeElement).toBe(dialog.querySelector('[data-dialog-confirm]'));

    dialog.querySelector('[data-dialog-confirm]').click();
    expect(document.getElementById('test-confirm')).not.toBeNull();
    expect(document.getElementById('test-confirm-error').textContent).toBe('No se pudo guardar');

    outcome = true;
    dialog.querySelector('[data-dialog-confirm]').click();
    expect(document.getElementById('test-confirm')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(globalThis.confirm).not.toHaveBeenCalled();

    overlay.openConfirmDialog({ id: 'test-cancel', title: 'Cerrar', message: '¿Cerrar?' });
    press('Escape');
    expect(document.getElementById('test-cancel')).toBeNull();
  });
});
