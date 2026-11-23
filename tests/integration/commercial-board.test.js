import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
let dom;
beforeEach(() => {
  vi.resetModules();
  dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  window.scrollTo = vi.fn();
  globalThis.confirm = vi.fn(() => true);
});
afterEach(() => dom.window.close());
it('muestra seis etapas, representa texto seguro y abre la edición desde una tarjeta', async () => {
  const { boot } = await import('../../src/app.js');
  await boot();
  const { addEntity, addDocument } = await import('../../src/storage.js');
  const client = addEntity({
    name: 'Empresa ficticia',
    code: 'CLI-001',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  const opportunity = addDocument({
    entityId: client.entity_id,
    series: 'OPP',
    folio: 1,
    opportunityTitle: '<img src=x onerror=alert(1)>',
    opportunityOwner: 'Ejecutivo A',
    totalAmount: 1500000,
    currency: 'CLP',
    startDate: '2026-11-15',
    endDate: '2026-12-15',
    status: 'Nueva'
  });
  document.getElementById('nav-dashboard').click();
  expect(document.querySelectorAll('.commercial-column')).toHaveLength(6);
  expect(document.querySelector('#commercial-columns img')).toBeNull();
  const card = document.querySelector('.commercial-card');
  expect(card.textContent).toContain('Empresa ficticia');
  expect(card.textContent).toContain('1.500.000');
  card.click();
  expect(document.getElementById('view-documents').hidden).toBe(false);
  expect(document.getElementById('document-id').value).toBe(opportunity.id);
});
it('oculta el tablero en el perfil genérico', async () => {
  const { boot } = await import('../../src/app.js');
  await boot(null);
  expect(document.getElementById('commercial-board').hidden).toBe(true);
});

async function seedBoard() {
  const entities = [
    {
      id: 'ent_1',
      entity_id: 'cli_001',
      name: 'Empresa Demo',
      code: 'CLI-DEMO-001',
      category: 'Activo',
      accountOwner: 'Ejecutivo A',
      acquisitionSource: 'Referido'
    }
  ];
  const base = {
    entity_id: 'cli_001',
    series: 'OPP',
    opportunityOwner: 'Ejecutivo A',
    currency: 'CLP',
    startDate: '2026-11-02',
    endDate: '2026-11-30'
  };
  const documents = [
    { ...base, id: 'doc_a', folio: 2001, opportunityTitle: 'Compresor', totalAmount: 100000, status: 'Nueva' },
    { ...base, id: 'doc_b', folio: 2002, opportunityTitle: 'Extractor', totalAmount: 250000, status: 'Nueva' },
    { ...base, id: 'doc_c', folio: 2003, opportunityTitle: 'Bomba', totalAmount: 50000, status: 'Ganada' }
  ];
  localStorage.setItem('erp_base_module:entities', JSON.stringify(entities));
  localStorage.setItem('erp_base_module:documents', JSON.stringify(documents));
  localStorage.setItem('erp_base_module:schemaVersion', JSON.stringify({ schemaVersion: 1 }));
  document.getElementById('nav-dashboard').click();
  return entities[0];
}

it('alimenta las seis columnas desde stageDistribution con etiqueta, conteo y monto', async () => {
  const { boot } = await import('../../src/app.js');
  await boot();
  await seedBoard();

  const columns = [...document.querySelectorAll('#commercial-columns .commercial-column')];
  expect(columns).toHaveLength(6);
  expect(columns.map((column) => column.querySelector('h3').textContent)).toEqual([
    'Nueva · 2',
    'Contactada · 0',
    'Propuesta · 0',
    'Negociación · 0',
    'Ganada · 1',
    'Perdida · 0'
  ]);
  expect(columns[0].querySelector('p').textContent).toContain('350.000');
  expect(columns[4].querySelector('p').textContent).toContain('50.000');
  expect(columns[1].querySelector('p').textContent).toContain('0');
  expect(columns[1].textContent).toContain('Sin oportunidades');
});

it('expone el tablero en una región desplazable accesible', async () => {
  const { boot } = await import('../../src/app.js');
  await boot();
  await seedBoard();

  const scroll = document.querySelector('.board-scroll');
  expect(scroll).not.toBeNull();
  expect(scroll.getAttribute('role')).toBe('region');
  expect(scroll.getAttribute('tabindex')).toBe('0');
  expect(scroll.getAttribute('aria-label')).toBeTruthy();
  expect(scroll.contains(document.getElementById('commercial-columns'))).toBe(true);
});

it('oculta el tablero cuando hay clientes pero ninguna oportunidad', async () => {
  const { boot } = await import('../../src/app.js');
  await boot();
  const { addEntity } = await import('../../src/storage.js');
  addEntity({
    name: 'Empresa Demo',
    code: 'CLI-DEMO-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  document.getElementById('nav-dashboard').click();

  expect(document.getElementById('commercial-board').hidden).toBe(true);
  expect(document.getElementById('commercial-columns').children.length).toBe(0);
});
