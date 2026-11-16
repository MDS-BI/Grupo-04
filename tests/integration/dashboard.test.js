import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';
import { addEntity, addDocument, loadEntities } from '../../src/storage.js';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
}

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

async function bootWith(configOverride) {
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
    expect(document.activeElement).toBe(qs('global-search-input'));
  });
});

async function bootCrmDashboard() {
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  const { normalizeConfig, userConfig } = await import('../../src/module-config.js');
  await initApp(normalizeConfig(userConfig));
  return import('../../src/storage.js');
}

function localDay(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function seedPanelFixture() {
  const today = localDay(0);
  const yesterday = localDay(-1);
  const entities = [
    {
      id: 'ent_1',
      entity_id: 'cli_001',
      name: 'Cliente Uno',
      code: 'CLI-001',
      category: 'Activo',
      targetDate: yesterday
    },
    { id: 'ent_2', entity_id: 'cli_002', name: 'Cliente Dos', code: 'CLI-002', category: 'Activo', targetDate: today },
    {
      id: 'ent_3',
      entity_id: 'cli_003',
      name: 'Cliente Tres',
      code: 'CLI-003',
      category: 'Inactivo',
      targetDate: yesterday
    }
  ];
  const opportunity = (id, entity, folio, amount, status) => ({
    id,
    entity_id: entity,
    series: 'OPP',
    folio,
    opportunityTitle: `Oportunidad ${folio}`,
    startDate: '2026-11-02',
    endDate: '2026-11-30',
    totalAmount: amount,
    currency: 'CLP',
    status,
    opportunityOwner: 'Ejecutivo A'
  });
  const documents = [
    opportunity('doc_a', 'cli_001', 4001, 100000, 'Negociación'),
    opportunity('doc_b', 'cli_002', 4002, 200000, 'Propuesta'),
    opportunity('doc_c', 'cli_001', 4003, 50000, 'Ganada'),
    opportunity('doc_d', 'cli_002', 4004, 75000, 'Perdida')
  ];
  localStorage.setItem('erp_base_module:entities', JSON.stringify(entities));
  localStorage.setItem('erp_base_module:documents', JSON.stringify(documents));
  localStorage.setItem('erp_base_module:schemaVersion', JSON.stringify({ schemaVersion: 1 }));
  qs('nav-entities').click();
  qs('nav-dashboard').click();
}

describe('US7 — panel CRM con indicadores descriptivos', () => {
  it('opens on the CRM panel when there is no hash and keeps the Panel entry visible', async () => {
    await bootCrmDashboard();
    expect(qs('nav-dashboard').hidden).toBe(false);
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('crm-stat-grid').hidden).toBe(true);
    expect(qs('stage-distribution').hidden).toBe(true);
    expect(qs('commercial-board').hidden).toBe(true);
    expect(qs('dashboard-empty-state').hidden).toBe(false);
    expect(qs('stat-clients').textContent).toBe('0');
  });

  it('shows six indicators at zero on empty storage and explains how to start', async () => {
    await bootCrmDashboard();
    for (const id of [
      'stat-clients',
      'stat-open-opportunities',
      'stat-open-amount',
      'stat-overdue-followups',
      'stat-today-contacts'
    ]) {
      expect(qs(id).textContent).toBe('0');
    }
    expect(qs('stat-close-rate').textContent).toBe('Sin datos');
    expect(qs('dashboard-empty-hint').hidden).toBe(false);
    expect(qs('dashboard-empty-hint').textContent).toMatch(/comienz|registr/i);
    expect(qs('crm-stat-grid').hidden).toBe(true);
    expect(qs('stage-distribution').hidden).toBe(true);
    expect(qs('commercial-board').hidden).toBe(true);
  });

  it('calculates the six indicators with the data-model control fixture', async () => {
    await bootCrmDashboard();
    seedPanelFixture();

    expect(qs('stat-clients').textContent).toBe('3');
    expect(qs('stat-open-opportunities').textContent).toBe('2');
    expect(qs('stat-open-amount').textContent).toBe('300000');
    expect(qs('stat-overdue-followups').textContent).toBe('1');
    expect(qs('stat-today-contacts').textContent).toBe('1');
    expect(qs('stat-close-rate').textContent).toBe('50%');
    expect(qs('dashboard-empty-hint').hidden).toBe(true);
    expect(qs('dashboard-empty-state').hidden).toBe(true);
    expect(qs('crm-stat-grid').hidden).toBe(false);
    expect(qs('stage-distribution').hidden).toBe(false);
    expect(qs('commercial-board').hidden).toBe(false);
    expect(qs('crm-stat-grid').className).toContain('kpi-band');
  });

  it('removes a lost opportunity from the open amount when returning to the panel', async () => {
    const storage = await bootCrmDashboard();
    seedPanelFixture();

    storage.updateDocument('doc_a', { status: 'Perdida', lossReason: 'Precio' });
    qs('nav-entities').click();
    qs('nav-dashboard').click();

    expect(qs('stat-open-opportunities').textContent).toBe('1');
    expect(qs('stat-open-amount').textContent).toBe('200000');
    expect(qs('stat-close-rate').textContent).toBe('33%');
  });

  it('recalculates after creating and editing records elsewhere in the app', async () => {
    const storage = await bootCrmDashboard();
    const client = storage.addEntity({
      name: 'Empresa Demo 1',
      code: 'CLI-DEMO-003',
      category: 'Activo',
      accountOwner: 'Ejecutivo A',
      acquisitionSource: 'Referido'
    });
    storage.addDocument({
      entityId: client.entity_id,
      folio: 3001,
      opportunityTitle: 'Compresor industrial',
      startDate: '2026-11-02',
      endDate: '2026-11-30',
      totalAmount: 120000,
      opportunityOwner: 'Ejecutivo A'
    });

    qs('nav-dashboard').click();
    expect(qs('stat-clients').textContent).toBe('1');
    expect(qs('stat-open-opportunities').textContent).toBe('1');
    expect(qs('stat-open-amount').textContent).toBe('120000');

    storage.updateDocument(storage.loadDocuments()[0].id, { totalAmount: 150000 });
    qs('nav-entities').click();
    qs('nav-dashboard').click();
    expect(qs('stat-open-amount').textContent).toBe('150000');
  });

  it('offers the panel quick actions with commercial terminology', async () => {
    await bootCrmDashboard();
    expect(qs('action-new-entity-title').textContent).toBe('Nuevo Cliente');
    expect(qs('action-new-document-title').textContent).toBe('Nueva Oportunidad');
    expect(qs('action-open-entities-title').textContent).toBe('Gestionar Clientes');
    expect(qs('action-find-title').textContent).toBe('Buscar');
    expect(qs('stat-clients-label').textContent).toBe('Clientes registrados');
    expect(qs('stat-open-opportunities-label').textContent).toBe('Oportunidades abiertas');
  });

  it('does not persist derived totals in localStorage', async () => {
    await bootCrmDashboard();
    seedPanelFixture();
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
    expect(keys.sort()).toEqual(
      ['erp_base_module:documents', 'erp_base_module:entities', 'erp_base_module:schemaVersion'].sort()
    );
    expect(keys.join(' ')).not.toMatch(/metric|total|dashboard/i);
  });
});
