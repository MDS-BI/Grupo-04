import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';
import { addEntity, addDocument, loadEntities } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

const salesConfig = {
  moduleName: 'Ventas',
  labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' }
};

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

async function bootWith(configOverride){
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(configOverride));
}

describe('User Story 3 - home dashboard with quick actions and record stats', () => {
  it('opens on the dashboard with all other views hidden', async () => {
    await bootWith(undefined);
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('view-entities').hidden).toBe(true);
    expect(qs('view-documents').hidden).toBe(true);
    expect(qs('view-search').hidden).toBe(true);
  });

  it('shows at least four quick-action buttons covering key ERP tasks', async () => {
    await bootWith(undefined);
    expect(qs('action-new-entity-title').textContent).toBe('Nueva Entidad');
    expect(qs('action-new-document-title').textContent).toBe('Nuevo Documento');
    expect(qs('action-open-entities-title').textContent).toBe('Entidades');
    expect(qs('action-find-title').textContent).toBe('Buscar registros');
  });

  it('uses configured terminology on quick actions and stat cards', async () => {
    await bootWith(salesConfig);
    expect(qs('action-new-entity-title').textContent).toBe('Nuevo Cliente');
    expect(qs('action-new-document-title').textContent).toBe('Nuevo Pedido de Venta');
    expect(qs('stat-entities-label').textContent).toBe('Clientes');
    expect(qs('stat-documents-label').textContent).toBe('Pedidos de Venta');
  });

  it('shows live statistics that match stored records', async () => {
    await bootWith(undefined);
    expect(qs('stat-entities').textContent).toBe('0');
    expect(qs('stat-documents').textContent).toBe('0');

    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    addEntity({ name: 'Globex', code: 'GL-002' });
    addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });

    qs('nav-dashboard').click();
    expect(qs('stat-entities').textContent).toBe('2');
    expect(qs('stat-documents').textContent).toBe('1');
  });

  it('refreshes statistics after creating records elsewhere in the app', async () => {
    await bootWith(undefined);
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(1);

    qs('nav-dashboard').click();
    expect(qs('stat-entities').textContent).toBe('1');
  });

  it('opens the entity management area with a cleared form via the new-entity action', async () => {
    await bootWith(undefined);
    qs('name').value = 'Stale draft';
    qs('nav-dashboard').click();

    qs('action-new-entity').click();
    expect(qs('view-entities').hidden).toBe(false);
    expect(qs('view-dashboard').hidden).toBe(true);
    expect(qs('entity-id').value).toBe('');
    expect(qs('name').value).toBe('');
    expect(document.activeElement).toBe(qs('name'));
  });

  it('opens the document management area via the new-document action', async () => {
    await bootWith(undefined);
    qs('action-new-document').click();
    expect(qs('view-documents').hidden).toBe(false);
    expect(qs('document-id').value).toBe('');
    expect(document.activeElement).toBe(qs('document-entity'));
  });

  it('opens the search screen with a focused search field via the find action', async () => {
    await bootWith(undefined);
    qs('action-find').click();
    expect(qs('view-search').hidden).toBe(false);
    expect(document.activeElement).toBe(qs('search-input'));
  });
});
