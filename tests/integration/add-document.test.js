import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, loadDocuments } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

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

describe('User Story 10 - add a document to an entity', () => {
  it('saves a document associated with the selected entity', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('series').value = 'FAC';
    qs('folio').value = '1001';
    qs('startDate').value = '2026-08-01';
    qs('endDate').value = '2026-08-05';
    qs('quantity').value = '3';
    qs('subtotal').value = '1000';
    qs('discount').value = '50';
    qs('taxAmount').value = '152';
    qs('totalAmount').value = '1102';
    qs('currency').value = 'MXN';
    qs('docPaymentTerms').value = 'neto 30';
    qs('notes').value = 'Entrega parcial';
    qs('status').value = 'pendiente';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const all = loadDocuments();
    expect(all.length).toBe(1);
    expect(all[0].entity_id).toBe(entity.entity_id);
    expect(all[0].series).toBe('FAC');
    expect(all[0].folio).toBe(1001);
    expect(all[0].quantity).toBe(3);
    expect(all[0].subtotal).toBe(1000);
    expect(all[0].discount).toBe(50);
    expect(all[0].taxAmount).toBe(152);
    expect(all[0].totalAmount).toBe(1102);
    expect(all[0].paymentTerms).toBe('neto 30');
    expect(all[0].notes).toBe('Entrega parcial');
  });

  it('prevents saving when required document information is blank', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('folio').value = '';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadDocuments().length).toBe(0);
    expect(qs('error-folio').textContent).toContain('obligatorio');
  });

  it('rejects a discount greater than the subtotal with an explanation', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('folio').value = '1002';
    qs('startDate').value = '2026-08-01';
    qs('endDate').value = '2026-08-05';
    qs('subtotal').value = '100';
    qs('discount').value = '150';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadDocuments().length).toBe(0);
    expect(qs('error-discount').textContent).toContain('superar el subtotal');
  });

  it('rejects an end date before the start date with an explanation', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('folio').value = '1003';
    qs('startDate').value = '2026-08-05';
    qs('endDate').value = '2026-08-01';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadDocuments().length).toBe(0);
    expect(qs('error-endDate').textContent).toContain('igual o posterior');
  });

  it('requires a known entity for the document', () => {
    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('folio').value = '9999';
    qs('startDate').value = '2026-08-01';
    qs('endDate').value = '2026-08-05';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadDocuments().length).toBe(0);
    expect(qs('error-document-entity').textContent).toContain('entidad');
  });
});
