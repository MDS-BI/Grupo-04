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

function submitForm(id) {
  qs(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function fill(id, value) {
  const element = qs(id);
  element.value = value;
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  element.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function seedClient(overrides = {}) {
  return storage.addEntity({
    name: 'Empresa Demo 1',
    code: 'CLI-DEMO-003',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido',
    ...overrides
  });
}

function openClientDetail(client) {
  const input = qs('global-search-input');
  input.value = client.code;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  qs('search-results-list').querySelector('[data-open-entity]').click();
}

function fillActivity(values) {
  fill('activity-type', values.type ?? 'llamada');
  fill('activity-subject', values.subject ?? 'Llamar a compras');
  if (values.owner) fill('activity-owner', values.owner);
  if (values.dueDate) fill('activity-due-date', values.dueDate);
}

beforeEach(async () => {
  await startDom();
});

afterEach(() => {
  dom.window.close();
});

describe('US13 — actividades y tareas', () => {
  it('registra una actividad desde la ficha y la muestra como vencida', () => {
    const client = seedClient();
    openClientDetail(client);
    qs('entity-detail-body').querySelector('[data-new-activity]').click();
    expect(qs('view-activities').hidden).toBe(false);
    expect(qs('activity-entity').value).toBe(client.entity_id);

    fillActivity({ type: 'tarea', subject: 'Llamar a compras', owner: 'Ejecutivo A', dueDate: yesterday() });
    submitForm('activity-form');

    const activities = storage.loadActivities();
    expect(activities).toHaveLength(1);
    expect(activities[0].status).toBe('pendiente');
    expect(qs('activity-list-items').textContent).toContain('Llamar a compras');
    expect(qs('activity-list-items').textContent).toContain('Vencida');
  });

  it('rechaza una tarea sin vencimiento y conserva lo escrito', () => {
    const client = seedClient();
    openClientDetail(client);
    qs('entity-detail-body').querySelector('[data-new-activity]').click();
    fillActivity({ type: 'tarea', owner: 'Ejecutivo A' });
    submitForm('activity-form');

    expect(storage.loadActivities()).toHaveLength(0);
    expect(qs('error-activity-due-date').textContent).toMatch(/vencimiento/i);
    expect(qs('activity-subject').value).toBe('Llamar a compras');
  });

  it('completa, edita y elimina una actividad', () => {
    const client = seedClient();
    const activity = storage.addActivity({
      entityId: client.entity_id,
      type: 'nota',
      subject: 'Nota pendiente',
      owner: 'Ejecutivo A'
    });

    qs('nav-activities').click();
    expect(qs('view-activities').hidden).toBe(false);
    qs('activity-list-items').querySelector('[data-complete-activity]').click();
    expect(storage.loadActivities()[0].status).toBe('completada');
    expect(storage.loadActivities()[0].completedAt).toBeTruthy();

    qs('activity-list-items').querySelector('[data-edit-activity]').click();
    fill('activity-subject', 'Nota editada');
    submitForm('activity-form');
    expect(storage.loadActivities()[0].subject).toBe('Nota editada');
    expect(storage.loadActivities()[0].status).toBe('completada');

    qs('activity-list-items').querySelector('[data-delete-activity]').click();
    expect(storage.loadActivities()).toHaveLength(0);
    expect(activity.id).toBeTruthy();
  });

  it('conserva las actividades del cliente en la papelera al eliminarlo', () => {
    const client = seedClient();
    storage.addActivity({
      entityId: client.entity_id,
      type: 'llamada',
      subject: 'Seguimiento',
      owner: 'Ejecutivo A'
    });
    storage.deleteEntity(client.id);
    const trash = storage.loadTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0].activities).toHaveLength(1);
    expect(storage.loadActivities()).toHaveLength(0);
  });
});
