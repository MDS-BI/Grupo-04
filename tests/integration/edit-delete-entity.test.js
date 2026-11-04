import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, loadEntities } from '../../src/storage.js';

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
  const first = addEntity({ name: 'Acme', code: 'AC-001' });
  addEntity({ name: 'Globex', code: 'GL-002' });
  const { boot } = await import('../../src/app.js');
  await boot();
  globalThis.__firstId = first.id;
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 2 - edit and remove entities', () => {
  it('edits an existing entity through the selector and persists the change', () => {
    qs('nav-entities').click();
    const select = qs('edit-entity');
    select.value = select.options[1].value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('entity-id').value).toBe(globalThis.__firstId);
    expect(qs('submit-button').textContent).toBe('Actualizar');
    expect(qs('name').value).toBe('Acme');

    qs('name').value = 'Acme Updated';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities()[0].name).toBe('Acme Updated');
  });

  it('deletes a selected entity so it disappears from storage', () => {
    qs('nav-entities').click();
    const select = qs('edit-entity');
    select.value = select.options[1].value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    qs('delete-entity').click();
    expect(loadEntities().length).toBe(1);
    expect(loadEntities()[0].code).toBe('GL-002');
  });

  it('stays responsive and correct when many entities exist', () => {
    for(let i = 0; i < 300; i++){
      addEntity({ name: `Bulk ${i}`, code: `B-${String(i).padStart(4, '0')}` });
    }
    qs('nav-entities').click();
    const select = qs('edit-entity');
    expect(select.options.length).toBe(303);
    const target = [...select.options].find(o => o.textContent.includes('Bulk 150'));
    select.value = target.value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('name').value).toBe('Bulk 150');
    qs('name').value = 'Bulk 150 Renamed';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().find(e => e.code === 'B-0150').name).toBe('Bulk 150 Renamed');
  });
});
