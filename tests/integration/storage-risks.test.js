import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

let dom;

function qs(id) {
  return document.getElementById(id);
}

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function fillClient(name = 'Empresa Demo 1', code = 'CLI-DEMO-003') {
  qs('nav-entities').click();
  qs('name').value = name;
  qs('code').value = code;
  qs('category').value = 'Prospecto';
  if (qs('cf-accountOwner')) qs('cf-accountOwner').value = 'Ejecutivo A';
  if (qs('cf-acquisitionSource')) qs('cf-acquisitionSource').value = 'Referido';
}

function breakWrites(failingKey) {
  const real = globalThis.localStorage;
  const wrapper = {
    getItem: (key) => real.getItem(key),
    setItem: (key, value) => {
      if (key === failingKey) throw new Error('QuotaExceededError');
      real.setItem(key, value);
    },
    removeItem: (key) => real.removeItem(key),
    clear: () => real.clear(),
    key: (index) => real.key(index),
    get length() {
      return real.length;
    }
  };
  globalThis.localStorage = wrapper;
  return () => {
    globalThis.localStorage = real;
  };
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
});

afterEach(() => {
  dom.window.close();
});

describe('T061 — riesgos de almacenamiento', () => {
  it('reports a full storage without false success and keeps the form data', () => {
    fillClient();
    const restore = breakWrites('erp_base_module:entities');
    try {
      submitForm('entity-form');
    } finally {
      restore();
    }

    expect(qs('entity-message').textContent).toMatch(/No se pudo guardar/i);
    expect(qs('entity-message').textContent).not.toMatch(/guardado correctamente/i);
    expect(qs('name').value).toBe('Empresa Demo 1');
    expect(qs('client-list-empty').hidden).toBe(false);
  });

  it('reports corrupt JSON without deleting the stored data', () => {
    globalThis.localStorage.setItem('erp_base_module:entities', '{not-json');
    qs('nav-entities').click();

    expect(qs('storage-warning').hidden).toBe(false);
    expect(qs('storage-warning').textContent).toMatch(/No se pudo leer|corrupt/i);

    qs('name').value = 'Empresa Demo 1';
    qs('code').value = 'CLI-DEMO-003';
    qs('category').value = 'Prospecto';
    qs('cf-accountOwner').value = 'Ejecutivo A';
    qs('cf-acquisitionSource').value = 'Referido';
    submitForm('entity-form');

    expect(qs('entity-message').textContent).toMatch(/No se pudo leer|corrupt|inválid/i);
    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe('{not-json');
  });

  it('refuses an incompatible schema version instead of migrating silently', () => {
    globalThis.localStorage.setItem('erp_base_module:schemaVersion', JSON.stringify({ schemaVersion: 99 }));
    globalThis.localStorage.setItem('erp_base_module:entities', '[]');
    qs('nav-entities').click();

    expect(qs('storage-warning').hidden).toBe(false);
    expect(qs('storage-warning').textContent).toMatch(/esquema|incompatible/i);

    fillClient();
    submitForm('entity-form');
    expect(qs('entity-message').textContent).toMatch(/esquema|incompatible/i);
    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe('[]');
  });

  it('blocks stale-tab saves after another tab changes the data', () => {
    fillClient();
    submitForm('entity-form');
    const before = globalThis.localStorage.getItem('erp_base_module:entities');

    dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: 'erp_base_module:entities' }));
    expect(qs('storage-warning').hidden).toBe(false);
    expect(qs('storage-warning').textContent).toMatch(/otra pestaña/i);

    fillClient('Otra Empresa', 'CLI-OTRA-1');
    submitForm('entity-form');

    expect(qs('entity-message').textContent).toMatch(/otra pestaña/i);
    expect(qs('entity-message').textContent).not.toMatch(/guardado correctamente/i);
    expect(globalThis.localStorage.getItem('erp_base_module:entities')).toBe(before);
  });
});
