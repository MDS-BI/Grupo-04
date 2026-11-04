import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';
import { loadEntities, searchEntities } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

const configWithFields = {
  customFields: [
    { target: 'entity', key: 'ingresosAnuales', label: 'Ingresos anuales', type: 'number', required: true },
    { target: 'entity', key: 'region', label: 'Región', type: 'select', options: ['EMEA', 'APAC'] }
  ]
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
  await initApp(normalizeConfig(configOverride ?? configWithFields));
}

describe('User Story 7 - declare custom fields for records', () => {
  it('renders declared fields with the correct input types on the entity form', async () => {
    await bootWith();
    qs('nav-entities').click();
    const numberInput = qs('cf-ingresosAnuales');
    expect(numberInput).not.toBeNull();
    expect(numberInput.getAttribute('type')).toBe('number');
    expect(numberInput.closest('.custom-field').querySelector('label').textContent).toBe('Ingresos anuales *');
    const select = qs('cf-region');
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map(o => o.value)).toEqual(['', 'EMEA', 'APAC']);
  });

  it('blocks saving when a required custom field is blank and explains why', async () => {
    await bootWith();
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(0);
    expect(qs('error-cf-ingresosAnuales').textContent).toContain('obligatorio');
  });

  it('persists custom values and displays them in search results with labels', async () => {
    await bootWith();
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('cf-ingresosAnuales').value = '5000';
    qs('cf-region').value = 'EMEA';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const saved = loadEntities()[0];
    expect(saved.ingresosAnuales).toBe(5000);
    expect(saved.region).toBe('EMEA');

    qs('nav-search').click();
    qs('search-input').value = 'emea';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const items = [...qs('search-results-list').querySelectorAll('.entity-item')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Región: EMEA');
  });

  it('renders document select custom fields from configuration', async () => {
    await bootWith({
      customFields: [
        { target: 'document', key: 'metodoEnvio', label: 'Método de envío', type: 'select', options: ['estándar', 'exprés'] }
      ]
    });
    qs('nav-entities').click();
    qs('nav-documents').click();
    const select = qs('cf-metodoEnvio');
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map(o => o.textContent)).toEqual(['--', 'estándar', 'exprés']);
  });

  it('behaves identically to the unmodified base when no fields are declared', async () => {
    await bootWith({});
    qs('nav-entities').click();
    expect(qs('entity-custom-fields').hidden).toBe(true);
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(1);
    expect(searchEntities('acme').length).toBe(1);
  });

  it('populates custom field values when editing an existing entity', async () => {
    await bootWith();
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('cf-ingresosAnuales').value = '750';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const select = qs('edit-entity');
    select.value = select.options[1].value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('cf-ingresosAnuales').value).toBe('750');

    qs('cf-ingresosAnuales').value = '900';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities()[0].ingresosAnuales).toBe(900);
  });
});
