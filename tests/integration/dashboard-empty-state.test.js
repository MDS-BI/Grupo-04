import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

let dom;

function qs(id) {
  return document.getElementById(id);
}

function storageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
  return keys.sort();
}

async function bootCrm() {
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  const { normalizeConfig, userConfig } = await import('../../src/module-config.js');
  await initApp(normalizeConfig(userConfig));
}

beforeEach(() => {
  vi.resetModules();
  dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.confirm = vi.fn(() => true);
  window.scrollTo = vi.fn();
});

afterEach(() => dom.window.close());

it('shows the empty state and hides KPI band, distribution and board without records', async () => {
  await bootCrm();

  expect(qs('view-dashboard').hidden).toBe(false);
  expect(qs('dashboard-empty-state').hidden).toBe(false);
  expect(qs('crm-stat-grid').hidden).toBe(true);
  expect(qs('stage-distribution').hidden).toBe(true);
  expect(qs('commercial-board').hidden).toBe(true);
});

it('keeps the empty state, the explanation and a decorative icon with a primary CTA', async () => {
  await bootCrm();

  const emptyState = qs('dashboard-empty-state');
  const icon = emptyState.querySelector('.empty-state__icon');
  expect(icon).not.toBeNull();
  expect(icon.getAttribute('aria-hidden')).toBe('true');
  expect(icon.querySelector('svg')).not.toBeNull();
  expect(qs('dashboard-empty-hint').hidden).toBe(false);
  expect(qs('dashboard-empty-hint').textContent).toMatch(/comienz|registr/i);

  const cta = qs('dashboard-empty-cta');
  expect(cta).not.toBeNull();
  expect(cta.textContent).toMatch(/primer cliente/i);
  expect(cta.className).toContain('btn-primary');
});

it('opens the empty client drawer from the empty-state CTA without touching storage', async () => {
  await bootCrm();
  const before = storageKeys();

  qs('dashboard-empty-cta').click();

  const drawer = qs('entities-drawer');
  expect(drawer).not.toBeNull();
  expect(drawer.getAttribute('role')).toBe('dialog');
  expect(drawer.dataset.variant).toBe('drawer');
  expect(qs('entity-id').value).toBe('');
  expect(document.activeElement).toBe(qs('name'));
  expect(storageKeys()).toEqual(before);
});

it('opens the empty entity and opportunity drawers from the quick actions without writing records', async () => {
  await bootCrm();
  const before = storageKeys();

  qs('action-new-entity').click();
  expect(qs('view-entities').hidden).toBe(false);
  expect(qs('entities-drawer')).not.toBeNull();
  expect(qs('entity-id').value).toBe('');
  expect(document.activeElement).toBe(qs('name'));
  expect(storageKeys()).toEqual(before);

  qs('action-new-document').click();
  expect(qs('view-documents').hidden).toBe(false);
  expect(qs('documents-drawer')).not.toBeNull();
  expect(qs('document-id').value).toBe('');
  expect(document.activeElement).toBe(qs('document-entity'));
  expect(storageKeys()).toEqual(before);
});

it('hides the empty state and shows the KPI band and distribution with clients but no opportunities', async () => {
  await bootCrm();
  const { addEntity } = await import('../../src/storage.js');
  addEntity({
    name: 'Empresa Demo',
    code: 'CLI-DEMO-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  qs('nav-dashboard').click();

  expect(qs('dashboard-empty-state').hidden).toBe(true);
  expect(qs('dashboard-empty-hint').hidden).toBe(true);
  expect(qs('crm-stat-grid').hidden).toBe(false);
  expect(qs('stage-distribution').hidden).toBe(false);
  expect(qs('commercial-board').hidden).toBe(true);
});

it('keeps the empty state hidden when only opportunities exist', async () => {
  await bootCrm();
  localStorage.setItem(
    'erp_base_module:documents',
    JSON.stringify([
      {
        id: 'doc_1',
        entity_id: 'cli_001',
        series: 'OPP',
        folio: 1001,
        opportunityTitle: 'Compresor',
        startDate: '2026-11-02',
        endDate: '2026-11-30',
        totalAmount: 100000,
        currency: 'CLP',
        status: 'Nueva'
      }
    ])
  );
  localStorage.setItem('erp_base_module:entities', JSON.stringify([]));
  localStorage.setItem('erp_base_module:schemaVersion', JSON.stringify({ schemaVersion: 1 }));
  qs('nav-dashboard').click();

  expect(qs('dashboard-empty-state').hidden).toBe(true);
  expect(qs('crm-stat-grid').hidden).toBe(false);
  expect(qs('stage-distribution').hidden).toBe(false);
});
