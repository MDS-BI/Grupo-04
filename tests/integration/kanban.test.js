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

async function startDom() {
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
}

function seedOpportunity() {
  const client = storage.addEntity({
    name: 'Empresa Kanban',
    code: 'CLI-KAN-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  });
  const opportunity = storage.addDocument({
    entityId: client.entity_id,
    folio: 3001,
    opportunityTitle: 'Compra de compresor',
    opportunityOwner: 'Ejecutivo A',
    totalAmount: 1500000,
    startDate: '2026-11-02',
    endDate: '2026-11-30'
  });
  return { client, opportunity };
}

function boardSelect(id) {
  return document.querySelector(`.board-move[data-move-opportunity="${id}"]`);
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US15 — Kanban editable', () => {
  it('mueve una oportunidad con el menú por teclado y recalcula totales', () => {
    const { opportunity } = seedOpportunity();
    qs('nav-dashboard').click();
    const select = boardSelect(opportunity.id);
    expect(select).not.toBeNull();
    const options = [...select.options].map((option) => option.value).filter(Boolean);
    expect(options).toEqual(['Contactada', 'Perdida']);

    select.value = 'Contactada';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(storage.loadDocuments()[0].status).toBe('Contactada');
    expect(document.querySelector('[data-status="Contactada"]').textContent).toContain('1');
    expect(document.querySelector('[data-status="Nueva"]').textContent).toContain('0');
    expect(qs('board-announcement').textContent).toMatch(/Contactada/);
  });

  it('rechaza saltos inválidos sin modificar la oportunidad', () => {
    const { opportunity } = seedOpportunity();
    expect(() => storage.updateDocument(opportunity.id, { status: 'Ganada' })).toThrow(/transici|permitida/i);
    expect(storage.loadDocuments()[0].status).toBe('Nueva');
  });

  it('solicita el motivo al pasar a Perdida y cancelar no modifica nada', () => {
    const { opportunity } = seedOpportunity();
    qs('nav-dashboard').click();
    const select = boardSelect(opportunity.id);
    select.value = 'Perdida';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const dialog = qs('loss-reason-dialog');
    expect(dialog).not.toBeNull();
    dialog.querySelector('[data-dialog-confirm]').click();
    expect(dialog.querySelector('.error').textContent).toMatch(/motivo/i);
    dialog.querySelector('[data-dialog-cancel]').click();

    expect(qs('loss-reason-dialog')).toBeNull();
    expect(storage.loadDocuments()[0].status).toBe('Nueva');
    expect(storage.loadDocuments()[0].lossReason).toBeUndefined();
  });

  it('acepta Perdida con motivo y bloquea el estado final', () => {
    const { opportunity } = seedOpportunity();
    qs('nav-dashboard').click();
    const select = boardSelect(opportunity.id);
    select.value = 'Perdida';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const dialog = qs('loss-reason-dialog');
    dialog.querySelector('#loss-reason-dialog-input').value = 'Precio fuera de rango';
    dialog.querySelector('[data-dialog-confirm]').click();

    const document_ = storage.loadDocuments()[0];
    expect(document_.status).toBe('Perdida');
    expect(document_.lossReason).toBe('Precio fuera de rango');
    expect(boardSelect(opportunity.id)).toBeNull();
  });
});
