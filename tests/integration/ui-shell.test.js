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

function pressEscape() {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

function typeSearch(value) {
  const input = qs('global-search-input');
  input.value = value;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

function activeNavigation() {
  return [...document.querySelectorAll('[aria-current="page"]')];
}

function drawer() {
  return document.querySelector('#overlay-root [role="dialog"][data-variant="drawer"]');
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

function seed() {
  const client = storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  storage.addEntity({
    name: 'Empresa Demo 2',
    code: 'CLI-DEMO-004',
    category: 'Activo',
    accountOwner: 'Ejecutivo B',
    acquisitionSource: 'Sitio web'
  });
  storage.addDocument({
    entityId: client.entity_id,
    series: 'OPP',
    folio: 3001,
    startDate: '2026-11-02',
    endDate: '2026-11-30',
    totalAmount: 8500000,
    currency: 'CLP',
    status: 'Nueva',
    opportunityTitle: 'Adquisición de compresor industrial',
    opportunityOwner: 'Ejecutivo A'
  });
}

beforeEach(async () => {
  await startDom();
  seed();
});

afterEach(() => {
  dom.window.close();
});

describe('US-UX-01 — navegación y búsqueda global', () => {
  it('navega a #view-search al escribir en #global-search-input sin clic adicional', () => {
    expect(qs('view-dashboard').hidden).toBe(false);

    typeSearch('CLI-DEMO-003');

    expect(qs('view-search').hidden).toBe(false);
    expect(qs('view-dashboard').hidden).toBe(true);
    expect(qs('global-search-input').value).toBe('CLI-DEMO-003');
    expect(qs('search-results-list').textContent).toContain('Empresa Demo 1');
    expect(qs('search-hint').hidden).toBe(true);
  });

  it('conserva el criterio al navegar a otra vista y volver a la búsqueda', () => {
    typeSearch('demo');
    expect(qs('view-search').hidden).toBe(false);

    qs('nav-dashboard').click();
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('global-search-input').value).toBe('demo');

    qs('action-find').click();
    expect(qs('view-search').hidden).toBe(false);
    expect(qs('search-results-list').textContent).toContain('Empresa Demo 1');
  });

  it('sin criterio permanece en la vista con la pista, sin listar y sin borrar filtros', () => {
    typeSearch('cli');
    qs('search-filter-category').value = 'Prospecto';
    qs('search-filter-category').dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    typeSearch('');

    expect(qs('view-search').hidden).toBe(false);
    expect(qs('search-hint').hidden).toBe(false);
    expect(qs('search-hint').textContent).toContain('Escribe para buscar');
    expect(qs('search-empty').hidden).toBe(true);
    expect(qs('search-results-list').children.length).toBe(0);
    expect(qs('search-opportunities-list').children.length).toBe(0);
    expect(qs('search-filter-category').value).toBe('Prospecto');
  });

  it('no existe #nav-search y la barra lateral contiene Panel, Clientes y Oportunidades', () => {
    expect(qs('nav-search')).toBeNull();
    expect(qs('nav-search-label')).toBeNull();

    const input = qs('global-search-input');
    expect(input.getAttribute('type')).toBe('search');
    expect(input.getAttribute('aria-label')).toMatch(/clientes/i);
    expect(input.getAttribute('aria-label')).toMatch(/oportunidades/i);

    expect(qs('nav-dashboard-label').textContent).toBe('Panel');
    expect(qs('nav-entities-label').textContent).toBe('Clientes');
    expect(qs('nav-documents-label').textContent).toBe('Oportunidades');
    expect(document.querySelector('aside.sidebar').textContent).not.toMatch(/\bBuscar\b/);
  });

  it('expone submenús con aria-expanded y aria-controls sin cambiar de vista', () => {
    const section = qs('nav-section-entities');
    const submenuId = section.getAttribute('aria-controls');
    const submenu = document.getElementById(submenuId);

    expect(section.tagName).toBe('BUTTON');
    expect(section.classList.contains('nav-section')).toBe(true);
    expect(submenu).not.toBeNull();
    expect(submenu.tagName).toBe('UL');
    expect(section.getAttribute('aria-expanded')).toBe('false');
    expect(submenu.hidden).toBe(true);

    section.click();

    expect(section.getAttribute('aria-expanded')).toBe('true');
    expect(submenu.hidden).toBe(false);
    expect(qs('view-dashboard').hidden).toBe(false);

    section.click();

    expect(section.getAttribute('aria-expanded')).toBe('false');
    expect(submenu.hidden).toBe(true);
    expect(qs('view-dashboard').hidden).toBe(false);
  });

  it('genera entradas con data-mode list|new y abre el drawer desde “Nuevo”', () => {
    const subitems = [...document.querySelectorAll('.nav-subitem[data-module][data-mode]')];
    expect(subitems.map((item) => `${item.dataset.module}:${item.dataset.mode}`)).toEqual([
      'entities:list',
      'entities:new',
      'documents:list',
      'documents:new'
    ]);
    expect(subitems.map((item) => item.textContent)).toEqual(['Listado', 'Nuevo', 'Listado', 'Nuevo']);
    expect(document.querySelector('aside.sidebar').textContent).not.toContain('Reportes');

    qs('nav-documents-new').click();

    expect(qs('view-documents').hidden).toBe(false);
    const panel = drawer();
    expect(panel).not.toBeNull();
    expect(panel.querySelector('#document-form')).not.toBeNull();
    expect(qs('document-id').value).toBe('');
    expect(document.activeElement).toBe(qs('document-entity'));

    pressEscape();

    expect(drawer()).toBeNull();
    expect(qs('document-form').closest('.card').parentElement).toBe(qs('view-documents'));
  });

  it('marca exactamente un elemento con aria-current="page" según vista y modo', () => {
    expect(activeNavigation().length).toBe(1);
    expect(activeNavigation()[0].id).toBe('nav-dashboard');

    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    expect(activeNavigation().length).toBe(1);
    expect(activeNavigation()[0].id).toBe('nav-entities');

    qs('nav-entities-new').click();
    expect(activeNavigation().length).toBe(1);
    expect(activeNavigation()[0].dataset.mode).toBe('new');

    pressEscape();

    expect(activeNavigation().length).toBe(1);
    expect(activeNavigation()[0].id).toBe('nav-entities');

    typeSearch('demo');

    expect(activeNavigation().length).toBe(1);
    expect(activeNavigation()[0].id).toBe('global-search-input');
  });

  it('abre “Nuevo cliente” desde #topbar-primary-action con formulario vacío y foco', () => {
    qs('topbar-primary-action').click();

    expect(qs('view-entities').hidden).toBe(false);
    const panel = drawer();
    expect(panel).not.toBeNull();
    expect(panel.querySelector('#entity-form')).not.toBeNull();
    expect(qs('entity-id').value).toBe('');
    expect(qs('name').value).toBe('');
    expect(document.activeElement).toBe(qs('name'));
  });

  it('pide confirmación con confirm-discard al navegar con cambios sin guardar', () => {
    qs('nav-entities-new').click();
    qs('name').value = 'Borrador sin guardar';
    qs('name').dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    qs('nav-dashboard').click();

    const confirmDialog = qs('confirm-discard');
    expect(confirmDialog).not.toBeNull();
    expect(confirmDialog.getAttribute('role')).toBe('dialog');
    expect(confirmDialog.dataset.variant).toBe('modal');
    expect(confirmDialog.textContent).toContain('Descartar cambios');
    expect(confirmDialog.querySelector('[data-cancel-discard]').textContent).toBe('Seguir editando');
    expect(confirmDialog.querySelector('[data-confirm-discard]').textContent).toBe('Descartar');

    confirmDialog.querySelector('[data-cancel-discard]').click();

    expect(qs('confirm-discard')).toBeNull();
    expect(qs('name').value).toBe('Borrador sin guardar');
    expect(drawer()).not.toBeNull();
    expect(qs('view-entities').hidden).toBe(false);

    qs('nav-dashboard').click();
    qs('confirm-discard').querySelector('[data-confirm-discard]').click();

    expect(qs('confirm-discard')).toBeNull();
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(drawer()).toBeNull();
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });
});
