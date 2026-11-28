import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles.css'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
}

function labelTextFor(element) {
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent.trim();
  }
  return element.getAttribute('aria-label') || '';
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssToken(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`));
  return match ? match[1] : null;
}

beforeEach(async () => {
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
});

afterEach(() => {
  dom.window.close();
});

describe('T062 â€” accesibilidad (jsdom; validaciÃ³n manual en navegadores pendiente)', () => {
  it('associates a label with every visible form control', () => {
    qs('nav-entities').click();
    const controls = [
      ...document.querySelectorAll('#entity-form input, #entity-form select, #entity-form textarea')
    ].filter((element) => element.type !== 'hidden');
    expect(controls.length).toBeGreaterThan(5);
    for (const control of controls) {
      expect(labelTextFor(control)).not.toBe('');
    }

    qs('nav-documents').click();
    const docControls = [
      ...document.querySelectorAll('#document-form input, #document-form select, #document-form textarea')
    ].filter((element) => element.type !== 'hidden');
    for (const control of docControls) {
      expect(labelTextFor(control)).not.toBe('');
    }
  });

  it('links every validation error with aria-describedby and announces it politely', () => {
    qs('nav-entities').click();
    qs('name').value = '';
    qs('code').value = '';
    qs('category').value = '';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    for (const id of ['name', 'code', 'category']) {
      expect(qs(id).getAttribute('aria-describedby')).toContain(`error-${id}`);
      expect(qs(id).getAttribute('aria-invalid')).toBe('true');
      expect(qs(`error-${id}`).getAttribute('aria-live')).toBe('polite');
      expect(qs(`error-${id}`).textContent.length).toBeGreaterThan(0);
    }

    qs('nav-documents').click();
    qs('folio').value = '';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(qs('folio').getAttribute('aria-describedby')).toContain('error-folio');
    expect(qs('totalAmount').getAttribute('aria-describedby')).toContain('error-totalAmount');
    expect(qs('status').getAttribute('aria-describedby')).toContain('error-status');
  });

  it('keeps a logical tab order starting with the client identification', () => {
    qs('nav-entities').click();
    const order = ['name', 'code', 'category', 'email', 'phone', 'targetDate', 'submit-button'];
    const positions = order.map((id) =>
      [...document.querySelectorAll('#entity-form input, #entity-form select, #entity-form button')].indexOf(qs(id))
    );
    expect(positions.every((value) => value >= 0)).toBe(true);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('defines a visible focus style and sufficient contrast tokens', () => {
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/--focus-ring/);

    const text = cssToken('text');
    const background = cssToken('bg');
    const accent = cssToken('accent');
    const sidebarText = cssToken('sidebar-text');
    const sidebarBackground = cssToken('sidebar-bg');
    expect(text && background && accent && sidebarText && sidebarBackground).toBeTruthy();
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(text, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(sidebarText, sidebarBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps sidebar names accessible on a narrow screen', () => {
    expect(css).toMatch(/@media \(max-width: 900px\)/);
    expect(css).toMatch(/\.nav-module \.nav-label\s*\{\s*display:\s*none/);
    document.querySelectorAll('.nav-module').forEach((button) => {
      expect(button.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('expone el drawer como diÃ¡logo modal, atrapa el foco y lo devuelve al disparador', () => {
    const trigger = qs('nav-entities-new');
    trigger.focus();
    trigger.click();

    const panel = document.querySelector('#overlay-root [role="dialog"][data-variant="drawer"]');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-modal')).toBe('true');
    const labelId = panel.getAttribute('aria-labelledby');
    expect(document.getElementById(labelId).textContent).toBe('Nuevo cliente');
    expect(document.activeElement).toBe(qs('name'));

    const first = qs('name');
    const submit = qs('submit-button');
    submit.focus();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    first.focus();
    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    );
    expect(document.activeElement).toBe(submit);

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.querySelector('#overlay-root [role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(qs('entity-form').closest('.card').parentElement).toBe(qs('view-entities'));
  });

  it('apila el alta al vuelo y el modal de descarte sobre el drawer', () => {
    qs('nav-documents-new').click();
    qs('document-no-clients-action').click();

    let panels = [...document.querySelectorAll('#overlay-root [role="dialog"]')];
    expect(panels.length).toBe(2);
    expect(panels[1].id).toBe('quick-create-client');
    expect(panels[1].dataset.variant).toBe('modal');
    const topLabelId = panels[1].getAttribute('aria-labelledby');
    expect(topLabelId).toBe('overlay-title');
    expect(document.getElementById(topLabelId).textContent).toBe('Nuevo cliente');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    panels = [...document.querySelectorAll('#overlay-root [role="dialog"]')];
    expect(panels.length).toBe(1);
    expect(panels[0].dataset.variant).toBe('drawer');

    qs('cf-opportunityTitle').value = 'Borrador';
    qs('cf-opportunityTitle').dispatchEvent(new window.Event('input', { bubbles: true }));
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    const confirm = qs('confirm-discard');
    expect(confirm).not.toBeNull();
    panels = [...document.querySelectorAll('#overlay-root [role="dialog"]')];
    expect(panels.length).toBe(2);
    expect(confirm.getAttribute('aria-modal')).toBe('true');

    confirm.querySelector('[data-confirm-discard]').click();
    expect(document.querySelector('#overlay-root [role="dialog"]')).toBeNull();
    expect(qs('document-form').closest('.card').parentElement).toBe(qs('view-documents'));
  });
});

describe('T138 — accesibilidad de la ampliación', () => {
  async function seed() {
    const storage = await import('../../src/storage.js');
    const client = storage.addEntity({
      name: 'Empresa Accesible',
      code: 'CLI-ACC-001',
      category: 'Activo',
      accountOwner: 'Ejecutivo A',
      acquisitionSource: 'Referido'
    });
    const opportunity = storage.addDocument({
      entityId: client.entity_id,
      folio: 3001,
      opportunityTitle: 'Compra accesible',
      opportunityOwner: 'Ejecutivo A',
      totalAmount: 1000,
      startDate: '2026-11-02',
      endDate: '2026-11-30'
    });
    return { storage, client, opportunity };
  }

  it('asocia etiquetas a los controles de contactos y actividades', async () => {
    await seed();
    const ids = ['contact-name', 'contact-role', 'contact-email', 'contact-phone', 'contact-primary'];
    for (const id of ids) {
      const control = qs(id);
      expect(control).not.toBeNull();
      expect(labelTextFor(control)).not.toBe('');
    }
    const activityIds = [
      'activity-entity',
      'activity-type',
      'activity-owner',
      'activity-subject',
      'activity-due-date',
      'activity-contact',
      'activity-document',
      'activity-notes'
    ];
    for (const id of activityIds) {
      expect(labelTextFor(qs(id))).not.toBe('');
    }
  });

  it('asocia los errores de actividad con aria-describedby y aria-invalid', async () => {
    const { client } = await seed();
    qs('nav-activities').click();
    qs('activity-entity').value = client.entity_id;
    qs('activity-entity').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('activity-type').value = 'tarea';
    qs('activity-type').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('activity-subject').value = 'Tarea sin fecha';
    qs('activity-owner').value = 'Ejecutivo A';
    qs('activity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(qs('activity-due-date').getAttribute('aria-describedby')).toBe('error-activity-due-date');
    expect(qs('activity-due-date').getAttribute('aria-invalid')).toBe('true');
    expect(qs('error-activity-due-date').textContent).toMatch(/vencimiento/i);
  });

  it('ofrece el menú de movimiento del Kanban con etiqueta y anuncios aria-live', async () => {
    const { opportunity } = await seed();
    qs('nav-dashboard').click();
    const select = document.querySelector(`.board-move[data-move-opportunity="${opportunity.id}"]`);
    expect(select).not.toBeNull();
    expect(labelTextFor(select)).toMatch(/mover/i);
    expect(qs('board-announcement').getAttribute('aria-live')).toBe('polite');
  });

  it('mantiene el foco en el diálogo de motivo de pérdida y permite cancelar con Escape', async () => {
    const { storage, opportunity } = await seed();
    qs('nav-dashboard').click();
    const select = document.querySelector(`.board-move[data-move-opportunity="${opportunity.id}"]`);
    select.value = 'Perdida';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const dialog = qs('loss-reason-dialog');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(qs('loss-reason-dialog-input'));
    document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(qs('loss-reason-dialog')).toBeNull();
    expect(storage.loadDocuments()[0].status).toBe('Nueva');
  });

  it('expone acciones de papelera como botones alcanzables', async () => {
    const { storage, client } = await seed();
    storage.deleteEntity(client.id);
    qs('nav-trash').click();
    const restore = qs('trash-list-items').querySelector('[data-restore-trash]');
    const purge = qs('trash-list-items').querySelector('[data-purge-trash]');
    expect(restore.tagName).toBe('BUTTON');
    expect(purge.tagName).toBe('BUTTON');
    restore.focus();
    expect(document.activeElement).toBe(restore);
  });
});
