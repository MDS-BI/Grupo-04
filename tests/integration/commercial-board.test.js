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
