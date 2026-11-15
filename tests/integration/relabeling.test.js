import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
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
});

afterEach(() => {
  dom.window.close();
});

async function bootWith(configOverride) {
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(configOverride));
}

describe('User Story 6 - relabel screens from configuration', () => {
  it('shows default Entidad/Documento terms everywhere when no mappings are provided', async () => {
    await bootWith(undefined);
    expect(qs('brand-name').textContent).toBe('Módulo Base ERP');
    expect(qs('nav-entities-label').textContent).toBe('Entidades');
    expect(qs('nav-documents-label').textContent).toBe('Documentos');
    expect(qs('action-new-entity-title').textContent).toBe('Nueva Entidad');
    qs('nav-entities').click();
    expect(qs('entity-form-heading').textContent).toBe('Agregar / Editar Entidad');
    expect(qs('delete-entity').textContent).toBe('Eliminar la entidad seleccionada');
    qs('nav-search').click();
    expect(qs('search-view-heading').textContent).toBe('Buscar Entidades');
  });

  it('uses configured terms on every screen without altering navigation behavior', async () => {
    await bootWith({
      moduleName: 'Ventas',
      labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' }
    });
    expect(document.title).toBe('Ventas');
    expect(qs('brand-name').textContent).toBe('Ventas');
    expect(qs('dashboard-heading').textContent).toBe('Ventas');
    expect(qs('nav-entities-label').textContent).toBe('Clientes');
    expect(qs('nav-documents-label').textContent).toBe('Pedidos de Venta');
    expect(qs('action-new-entity-title').textContent).toBe('Nuevo Cliente');
    expect(qs('action-new-document-title').textContent).toBe('Nuevo Pedido de Venta');

    qs('nav-entities').click();
    expect(qs('entities-view-heading').textContent).toBe('Clientes');
    expect(qs('entity-form-heading').textContent).toBe('Agregar / Editar Cliente');
    expect(qs('edit-entity-heading').textContent).toBe('Editar o eliminar el cliente');
    expect(qs('delete-entity').textContent).toBe('Eliminar el cliente seleccionado');

    qs('nav-documents').click();
    expect(qs('documents-view-heading').textContent).toBe('Pedidos de Venta');
    expect(qs('document-form-heading').textContent).toBe('Agregar / Editar Pedido de Venta');
    expect(qs('edit-document-heading').textContent).toBe('Editar o eliminar el pedido de venta');
    expect(qs('delete-document').textContent).toBe('Eliminar el pedido de venta seleccionado');

    qs('nav-search').click();
    expect(qs('search-view-heading').textContent).toBe('Buscar Clientes');
    expect(qs('search-empty').textContent).toContain('coincidencias');
  });

  it('keeps navigation behavior unchanged after relabeling', async () => {
    await bootWith({ labels: { entity: 'Producto', entities: 'Productos', document: 'Orden', documents: 'Órdenes' } });
    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    qs('nav-documents').click();
    expect(qs('view-entities').hidden).toBe(true);
    expect(qs('view-documents').hidden).toBe(false);
    qs('nav-dashboard').click();
    expect(qs('view-dashboard').hidden).toBe(false);
  });

  it('derives the logo monogram from the configured module name', async () => {
    await bootWith({ moduleName: 'Warehouse Pro' });
    expect(qs('logo-mark').querySelector('svg text').textContent).toBe('WP');
  });
});

async function bootCrm(override) {
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot(override);
}

const crmClient = {
  name: 'Empresa Demo 1',
  code: 'CLI-DEMO-003',
  category: 'Prospecto',
  accountOwner: 'Ejecutivo A',
  acquisitionSource: 'Referido'
};

describe('US6 — terminología comercial consistente con el perfil CRM', () => {
  it('uses Cliente/Clientes and Oportunidad/Oportunidades on every P1 view', async () => {
    await bootCrm();
    expect(document.title).toBe('CRM — Clientes y Oportunidades');
    expect(qs('brand-name').textContent).toBe('CRM — Clientes y Oportunidades');
    expect(qs('nav-entities-label').textContent).toBe('Clientes');
    expect(qs('nav-documents-label').textContent).toBe('Oportunidades');
    expect(qs('nav-search-label').textContent).toBe('Buscar');
    expect(qs('nav-dashboard').hidden).toBe(true);

    expect(qs('view-entities').hidden).toBe(false);
    expect(qs('entities-view-heading').textContent).toBe('Clientes');
    expect(qs('client-list-heading').textContent).toBe('Clientes registrados');
    expect(qs('client-list-empty-text').textContent).toBe('No hay clientes registrados');
    expect(qs('client-list-create').textContent).toMatch(/nuevo cliente/i);
    expect(qs('entity-form-heading').textContent).toBe('Agregar / Editar Cliente');
    expect(qs('edit-entity-heading').textContent).toBe('Editar o eliminar el cliente');
    expect(qs('delete-entity').textContent).toBe('Eliminar el cliente seleccionado');

    qs('nav-documents').click();
    expect(qs('documents-view-heading').textContent).toBe('Oportunidades');
    expect(qs('document-form-heading').textContent).toBe('Agregar / Editar Oportunidad');
    expect(qs('opportunity-list-empty').textContent).toBe('No se encontraron oportunidades');
    expect(qs('delete-document').textContent).toBe('Eliminar la oportunidad seleccionada');
    expect(qs('document-entity-label').textContent).toBe('Cliente *');
    expect(qs('document-fixed').textContent).toContain('OPP');

    qs('nav-search').click();
    expect(qs('search-view-heading').textContent).toBe('Buscar Clientes');
    expect(qs('search-heading').textContent).toBe('Buscar el cliente');
    expect(qs('search-hint').textContent).toBe('Ingresa un criterio');
    expect(qs('entity-detail-heading').textContent).toBe('Ficha del cliente');
    expect(qs('opportunity-detail-heading').textContent).toBe('Detalle de la oportunidad');
  });

  it('uses commercial terminology in confirmations and success messages', async () => {
    await bootCrm();
    qs('nav-entities').click();
    qs('name').value = crmClient.name;
    qs('code').value = crmClient.code;
    qs('category').value = crmClient.category;
    qs('cf-accountOwner').value = crmClient.accountOwner;
    qs('cf-acquisitionSource').value = crmClient.acquisitionSource;
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(qs('entity-message').textContent).toContain('Cliente');

    globalThis.confirm = vi.fn(() => false);
    const select = qs('edit-entity');
    select.value = select.options[1].value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();
    expect(globalThis.confirm.mock.calls[0][0]).toMatch(/cliente/i);
  });

  it('warns about configuration conflicts without overwriting stored values', async () => {
    await bootCrm();
    const storage = await import('../../src/storage.js');
    storage.addEntity(crmClient);

    vi.resetModules();
    const { initApp } = await import('../../src/app.js');
    const { normalizeConfig, userConfig } = await import('../../src/module-config.js');
    const conflicting = {
      ...userConfig,
      customFields: [
        ...userConfig.customFields,
        { target: 'entity', key: 'code', label: 'Código duplicado', type: 'text' }
      ]
    };
    await initApp(normalizeConfig(conflicting));

    expect(qs('config-errors').hidden).toBe(false);
    expect(qs('config-errors').textContent).toMatch(/choca con un campo base/);
    const { loadEntities } = await import('../../src/storage.js');
    expect(loadEntities().length).toBe(1);
    expect(loadEntities()[0].code).toBe('CLI-DEMO-003');
  });

  it('preserves unknown stored values when the profile changes', async () => {
    await bootCrm();
    const storage = await import('../../src/storage.js');
    const entity = storage.addEntity(crmClient);

    const raw = JSON.parse(localStorage.getItem('erp_base_module:entities'));
    raw[0].legacyField = 'valor heredado';
    localStorage.setItem('erp_base_module:entities', JSON.stringify(raw));

    qs('nav-entities').click();
    const select = qs('edit-entity');
    select.value = entity.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('name').value = 'Cliente Renombrado';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const saved = storage.loadEntities()[0];
    expect(saved.name).toBe('Cliente Renombrado');
    expect(saved.legacyField).toBe('valor heredado');
  });

  it('keeps accessible names and the active view identified with a collapsed sidebar', async () => {
    await bootCrm();
    document.querySelectorAll('.nav-module').forEach((btn) => {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
      expect(btn.querySelector('.nav-label')).not.toBeNull();
    });
    expect(qs('nav-entities').getAttribute('aria-current')).toBe('page');

    qs('nav-documents').click();
    expect(qs('nav-documents').getAttribute('aria-current')).toBe('page');
    expect(qs('nav-entities').hasAttribute('aria-current')).toBe(false);
    expect(qs('nav-documents').getAttribute('aria-label')).toBe('Oportunidades');
  });
});
