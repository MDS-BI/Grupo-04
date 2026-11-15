import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { todayLocal } from '../../src/crm-rules.js';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;
let storage;

function qs(id) {
  return document.getElementById(id);
}

function typeSearch(value) {
  qs('search-input').value = value;
  qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

function clientResults() {
  return [...qs('search-results-list').querySelectorAll('.client-summary')];
}

function opportunityResults() {
  return [...qs('search-opportunities-list').querySelectorAll('.opportunity-result')];
}

function storageSnapshot() {
  return {
    entities: localStorage.getItem('erp_base_module:entities'),
    documents: localStorage.getItem('erp_base_module:documents')
  };
}

function seed() {
  storage.addEntity({
    name: 'Compañía Ñuble',
    code: 'CLI-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido',
    email: 'contacto1@example.com',
    phone: '+56 9 1111 1111',
    contactName: 'Contacto Uno',
    description: 'Cliente histórico',
    targetDate: todayLocal()
  });
  storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo B',
    acquisitionSource: 'Sitio web'
  });
  const first = storage.loadEntities()[0];
  storage.addDocument({
    entityId: first.entity_id,
    series: 'OPP',
    folio: 3001,
    startDate: '2026-11-02',
    endDate: '2026-11-30',
    totalAmount: 8500000,
    currency: 'CLP',
    status: 'Nueva',
    opportunityTitle: 'Adquisición de compresor industrial',
    opportunityOwner: 'Ejecutivo A',
    notes: 'Pendiente precisar características técnicas.'
  });
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
  seed();
  qs('nav-search').click();
});

afterEach(() => {
  dom.window.close();
});

describe('US2 — buscar clientes y consultar su ficha', () => {
  it('finds clients by full name, partial name and code', () => {
    typeSearch('Compañía Ñuble');
    expect(clientResults().length).toBe(1);
    typeSearch('demo');
    expect(clientResults().length).toBe(1);
    expect(clientResults()[0].textContent).toContain('Empresa Demo 1');
    typeSearch('cli-001');
    expect(clientResults().length).toBe(1);
    expect(clientResults()[0].textContent).toContain('Compañía Ñuble');
  });

  it('ignores case and accents and includes prospects', () => {
    typeSearch('compania nuble');
    expect(clientResults().length).toBe(1);
    typeSearch('CLI');
    expect(clientResults().length).toBe(2);
    expect(qs('search-results-list').textContent).toContain('Prospecto');
  });

  it('asks for a criterion when the field is empty', () => {
    typeSearch('');
    expect(qs('search-hint').hidden).toBe(false);
    expect(qs('search-hint').textContent).toContain('Ingresa un criterio');
    expect(qs('search-empty').hidden).toBe(true);
    expect(clientResults().length).toBe(0);
  });

  it('shows a clear no-match message', () => {
    typeSearch('zzz-nada');
    expect(qs('search-hint').hidden).toBe(true);
    expect(qs('search-empty').hidden).toBe(false);
    expect(qs('search-empty').textContent).toMatch(/Sin coincidencias/i);
  });

  it('combines filters with AND and clears them', () => {
    typeSearch('cli');
    expect(clientResults().length).toBe(2);

    qs('search-filter-category').value = 'Prospecto';
    qs('search-filter-category').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(clientResults().length).toBe(1);
    expect(clientResults()[0].textContent).toContain('Empresa Demo 1');

    qs('search-filter-owner').value = 'Ejecutivo A';
    qs('search-filter-owner').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(clientResults().length).toBe(0);
    expect(qs('search-empty').hidden).toBe(false);

    qs('clear-filters').click();
    expect(qs('search-filter-category').value).toBe('');
    expect(qs('search-filter-owner').value).toBe('');
    expect(clientResults().length).toBe(2);
  });

  it('shows opportunities by title and folio with the linked client', () => {
    typeSearch('compresor');
    expect(opportunityResults().length).toBe(1);
    expect(qs('search-opportunities').hidden).toBe(false);
    expect(qs('search-opportunities-list').textContent).toContain('OPP-3001');
    expect(qs('search-opportunities-list').textContent).toContain('Compañía Ñuble');

    typeSearch('3001');
    expect(opportunityResults().length).toBe(1);
  });

  it('opens the client file with every registered field and read-only opportunities', () => {
    typeSearch('cli-001');
    clientResults()[0].querySelector('[data-open-entity]').click();

    expect(qs('entity-detail').hidden).toBe(false);
    const text = qs('entity-detail-body').textContent;
    expect(text).toContain('Compañía Ñuble');
    expect(text).toContain('CLI-001');
    expect(text).toContain('Activo');
    expect(text).toContain('Ejecutivo A');
    expect(text).toContain('Referido');
    expect(text).toContain('contacto1@example.com');
    expect(text).toContain('+56 9 1111 1111');
    expect(text).toContain('Contacto Uno');
    expect(text).toContain('Cliente histórico');
    expect(text).toContain('Para hoy');
    expect(text).toContain('Adquisición de compresor industrial');
    expect(qs('view-documents').hidden).toBe(true);
  });

  it('shows "sin información" and "Contacto incompleto" when optional data is missing', () => {
    typeSearch('demo');
    clientResults()[0].querySelector('[data-open-entity]').click();
    const text = qs('entity-detail-body').textContent;
    expect(text).toContain('sin información');
    expect(text).toContain('Contacto incompleto');
    expect(text).toContain('Sin programar');
  });

  it('shows "Vencido" and "Programado" according to the local day', () => {
    storage.addEntity({
      name: 'Cliente Vencido',
      code: 'CLI-VENCIDO',
      category: 'Activo',
      accountOwner: 'Ejecutivo A',
      acquisitionSource: 'Otro',
      targetDate: '2020-01-01'
    });
    storage.addEntity({
      name: 'Cliente Programado',
      code: 'CLI-PROG',
      category: 'Activo',
      accountOwner: 'Ejecutivo A',
      acquisitionSource: 'Otro',
      targetDate: '2099-01-01'
    });
    typeSearch('vencido');
    clientResults()[0].querySelector('[data-open-entity]').click();
    expect(qs('entity-detail-body').textContent).toContain('Vencido');
    typeSearch('programado');
    clientResults()[0].querySelector('[data-open-entity]').click();
    expect(qs('entity-detail-body').textContent).toContain('Programado');
  });

  it('opens a read-only opportunity detail without opening the edit form', () => {
    typeSearch('3001');
    opportunityResults()[0].querySelector('[data-open-document]').click();

    const text = qs('opportunity-detail-body').textContent;
    expect(qs('opportunity-detail').hidden).toBe(false);
    expect(text).toContain('Adquisición de compresor industrial');
    expect(text).toContain('OPP-3001');
    expect(text).toContain('Nueva');
    expect(text).toContain('8500000');
    expect(text).toContain('Ejecutivo A');
    expect(text).toContain('2026-11-02');
    expect(text).toContain('2026-11-30');
    expect(text).toContain('Compañía Ñuble');
    expect(qs('view-documents').hidden).toBe(true);
    expect(qs('document-id').value).toBe('');
  });

  it('does not modify storage while searching or reading details', () => {
    const before = storageSnapshot();
    typeSearch('cli');
    clientResults()[0].querySelector('[data-open-entity]').click();
    typeSearch('3001');
    opportunityResults()[0].querySelector('[data-open-document]').click();
    expect(storageSnapshot()).toEqual(before);
    expect(storage.loadEntities().length).toBe(2);
    expect(storage.loadDocuments().length).toBe(1);
  });
});
