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

function seedClients() {
  storage.addEntity({
    name: 'Zapatería Sur',
    code: 'CLI-002',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo B',
    acquisitionSource: 'Referido',
    targetDate: '2026-12-01'
  });
  storage.addEntity({
    name: 'Almacén Norte',
    code: 'CLI-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Sitio web'
  });
  storage.addEntity({
    name: 'Beta Industrial',
    code: 'CLI-003',
    category: 'Inactivo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Otro',
    targetDate: '2026-11-20'
  });
}

function seedOpportunities() {
  const client = storage.loadEntities()[0];
  storage.addDocument({
    entityId: client.entity_id,
    series: 'OPP',
    folio: 3002,
    startDate: '2026-11-02',
    endDate: '2026-11-30',
    totalAmount: 1500000,
    currency: 'CLP',
    status: 'Nueva',
    opportunityOwner: 'Ejecutivo A',
    opportunityTitle: 'Renovación de equipos'
  });
  storage.addDocument({
    entityId: client.entity_id,
    series: 'OPP',
    folio: 3001,
    startDate: '2026-11-03',
    endDate: '2026-12-01',
    totalAmount: 900000,
    currency: 'CLP',
    status: 'Nueva',
    opportunityOwner: 'Ejecutivo A',
    opportunityTitle: 'Compra de insumos'
  });
  storage.addDocument({
    entityId: client.entity_id,
    series: 'OPP',
    folio: 3003,
    startDate: '2026-11-04',
    endDate: '2026-12-02',
    totalAmount: 3200000,
    currency: 'CLP',
    status: 'Nueva',
    opportunityOwner: 'Ejecutivo A',
    opportunityTitle: 'Ampliación de bodega'
  });
}

function clientRows() {
  return [...qs('client-list-items').querySelectorAll('tbody tr')];
}

function opportunityRows() {
  return [...qs('opportunity-list-items').querySelectorAll('tbody tr')];
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
  storage = await import('../../src/storage.js');
});

afterEach(() => {
  dom.window.close();
});

describe('US-UX-03 — tablas ordenables de clientes y oportunidades', () => {
  it('renders the client table with the contract columns and default name ascending order', () => {
    seedClients();
    qs('nav-entities').click();

    const table = qs('client-list-items').querySelector('table.data-table');
    expect(table).not.toBeNull();
    const labels = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    expect(labels).toEqual(['Cliente', 'Tipo', 'Responsable', 'Origen', 'Próximo contacto', 'Acciones']);

    expect(clientRows().map((row) => row.querySelector('td').textContent)).toEqual([
      expect.stringContaining('Almacén Norte'),
      expect.stringContaining('Beta Industrial'),
      expect.stringContaining('Zapatería Sur')
    ]);

    const active = table.querySelector('th[aria-sort="ascending"]');
    expect(active).not.toBeNull();
    expect(active.textContent).toContain('Cliente');
  });

  it('shows the monogram with initials and hides it from assistive technology', () => {
    seedClients();
    qs('nav-entities').click();

    const avatar = clientRows()[0].querySelector('.avatar');
    expect(avatar).not.toBeNull();
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(avatar.textContent).toBe('AN');
  });

  it('sorts clients by responsible in both directions and updates aria-sort', () => {
    seedClients();
    qs('nav-entities').click();

    qs('client-list-items').querySelector('th button[data-sort="accountOwner"]').click();
    let rows = clientRows();
    expect(rows.map((row) => row.dataset.key)).toEqual([
      storage.loadEntities()[1].entity_id,
      storage.loadEntities()[2].entity_id,
      storage.loadEntities()[0].entity_id
    ]);
    expect(qs('client-list-items').querySelector('th[aria-sort="ascending"]').textContent).toContain('Responsable');

    qs('client-list-items').querySelector('th button[data-sort="accountOwner"]').click();
    rows = clientRows();
    expect(rows.map((row) => row.dataset.key)).toEqual([
      storage.loadEntities()[0].entity_id,
      storage.loadEntities()[1].entity_id,
      storage.loadEntities()[2].entity_id
    ]);
    expect(qs('client-list-items').querySelector('th[aria-sort="descending"]').textContent).toContain('Responsable');
  });

  it('opens the client drawer from the row edit action and never offers deletion in the row', () => {
    seedClients();
    qs('nav-entities').click();

    const row = clientRows()[0];
    expect(row.querySelector('[data-delete-entity]')).toBeNull();
    expect(row.querySelector('[data-action="delete"]')).toBeNull();

    const edit = row.querySelector('button[data-action="edit"]');
    expect(edit).not.toBeNull();
    expect(edit.getAttribute('aria-label')).toMatch(/Editar Almacén Norte/);
    edit.click();

    const drawer = document.querySelector('#overlay-root [role="dialog"]');
    expect(drawer).not.toBeNull();
    expect(qs('entity-id').value).toBe(storage.loadEntities()[1].id);
    expect(qs('name').value).toBe('Almacén Norte');
  });

  it('keeps the inherited compact bar above the table and deletes through #delete-entity', () => {
    seedClients();
    qs('nav-entities').click();

    const bar = qs('client-actions-bar');
    const wrap = qs('client-list-items').querySelector('.table-wrap');
    expect(bar).not.toBeNull();
    expect(wrap).not.toBeNull();
    expect(bar.compareDocumentPosition(wrap) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(qs('edit-entity')).not.toBeNull();
    expect(qs('delete-entity')).not.toBeNull();

    const target = storage.loadEntities()[0];
    qs('edit-entity').value = target.id;
    qs('edit-entity').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(storage.loadEntities().length).toBe(2);
  });

  it('renders the opportunity table with client, folio, subject, status and numeric amount', () => {
    seedClients();
    seedOpportunities();
    qs('nav-documents').click();

    const table = qs('opportunity-list-items').querySelector('table.data-table');
    expect(table).not.toBeNull();
    const labels = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    expect(labels).toEqual(['Cliente', 'Folio', 'Asunto', 'Estado', 'Monto', 'Acciones']);
    expect(opportunityRows().map((row) => row.dataset.key)).toEqual(
      storage
        .loadDocuments()
        .slice()
        .sort((a, b) => a.folio - b.folio)
        .map((doc) => doc.id)
    );

    const numericCells = [...table.querySelectorAll('tbody tr:first-child td[data-numeric]')];
    expect(numericCells.length).toBeGreaterThanOrEqual(2);
    expect(table.querySelector('thead th[data-numeric]')).not.toBeNull();
  });

  it('keeps the inherited opportunity bar above the table and deletes through #delete-document', () => {
    seedClients();
    seedOpportunities();
    qs('nav-documents').click();

    const bar = qs('document-actions-bar');
    const wrap = qs('opportunity-list-items').querySelector('.table-wrap');
    expect(bar.compareDocumentPosition(wrap) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const target = storage.loadDocuments()[0];
    qs('edit-document').value = target.id;
    qs('edit-document').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-document').click();

    expect(storage.loadDocuments().length).toBe(2);
  });

  it('exposes a keyboard reachable scroll region and no delete action inside opportunity rows', () => {
    seedClients();
    seedOpportunities();
    qs('nav-documents').click();

    const wrap = qs('opportunity-list-items').querySelector('.table-wrap');
    expect(wrap.getAttribute('role')).toBe('region');
    expect(wrap.getAttribute('tabindex')).toBe('0');
    expect(wrap.getAttribute('aria-label')).toBeTruthy();

    for (const row of opportunityRows()) {
      expect(row.querySelector('[data-delete-document]')).toBeNull();
      expect(row.querySelector('[data-action="delete"]')).toBeNull();
      expect(row.querySelector('button[data-action="edit"]')).not.toBeNull();
    }
  });
});
