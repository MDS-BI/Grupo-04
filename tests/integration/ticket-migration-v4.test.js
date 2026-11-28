import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

const ENTITIES_KEY = 'erp_base_module:entities';
const DOCUMENTS_KEY = 'erp_base_module:documents';
const TICKETS_KEY = 'erp_base_module:tickets';
const CONTACTS_KEY = 'erp_base_module:crmContacts';
const ACTIVITIES_KEY = 'erp_base_module:crmActivities';
const TRASH_KEY = 'erp_base_module:crmTrash';
const SCHEMA_KEY = 'erp_base_module:schemaVersion';
const BACKUP_KEY = 'erp_base_module:crmBackup:v3';

let dom;
let storage;

function qs(id) {
  return document.getElementById(id);
}

function v3Snapshot() {
  return {
    [ENTITIES_KEY]: JSON.stringify([
      {
        id: 'ent_1',
        entity_id: 'cli_1',
        name: 'Empresa Histórica',
        code: 'CLI-H-001',
        category: 'Activo',
        accountOwner: 'Ejecutivo A',
        acquisitionSource: 'Referido',
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z'
      },
      {
        id: 'ent_2',
        entity_id: 'cli_2',
        name: 'Otra Empresa',
        code: 'CLI-H-002',
        category: 'Prospecto',
        accountOwner: 'Ejecutivo A',
        acquisitionSource: 'Referido'
      }
    ]),
    [DOCUMENTS_KEY]: JSON.stringify([
      {
        id: 'doc_1',
        entity_id: 'cli_1',
        series: 'OPP',
        folio: 3001,
        opportunityTitle: 'Compra histórica',
        opportunityOwner: 'Ejecutivo A',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        totalAmount: 1000,
        status: 'Nueva'
      }
    ]),
    [TICKETS_KEY]: JSON.stringify([
      {
        id: 'tkt_1',
        entity_id: 'cli_1',
        productName: 'Compresor',
        reason: 'soporte',
        description: 'Falla histórica sin asunto',
        priority: 'Media',
        status: 'En proceso',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z'
      },
      {
        id: 'tkt_2',
        entity_id: 'cli_2',
        productName: 'Bomba',
        reason: 'reclamo',
        description: 'Otra falla',
        priority: 'Alta',
        status: 'Resuelto',
        resolutionSummary: 'Repuesto cambiado',
        resolvedAt: '2026-10-02T10:00:00.000Z',
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z'
      }
    ]),
    [CONTACTS_KEY]: JSON.stringify([{ id: 'con_1', entity_id: 'cli_1', name: 'Contacto Histórico', isPrimary: true }]),
    [ACTIVITIES_KEY]: JSON.stringify([
      {
        id: 'act_1',
        entity_id: 'cli_1',
        type: 'llamada',
        subject: 'Seguimiento',
        owner: 'Ejecutivo A',
        status: 'pendiente'
      }
    ]),
    [TRASH_KEY]: JSON.stringify([]),
    [SCHEMA_KEY]: JSON.stringify({ schemaVersion: 3 })
  };
}

async function startDom(previous = null) {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  if (previous) Object.entries(previous).forEach(([key, value]) => w.localStorage.setItem(key, value));
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
  storage = await import('../../src/storage.js');
}

function valueOf(key) {
  return localStorage.getItem(key);
}

beforeEach(async () => {
  await startDom(v3Snapshot());
});

afterEach(() => {
  dom.window.close();
});

describe('Migración v3 → v4 en la interfaz', () => {
  it('warns with the detected version and blocks writes before migrating', () => {
    const banner = qs('migration-banner');
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain('v3');
    expect(banner.textContent).toMatch(/folio/i);
    expect(() =>
      storage.addEntity({
        name: 'Nueva',
        code: 'N-1',
        category: 'Activo',
        accountOwner: 'Ejecutivo A',
        acquisitionSource: 'Referido'
      })
    ).toThrow(/migración/i);
    expect(JSON.parse(valueOf(SCHEMA_KEY)).schemaVersion).toBe(3);
  });

  it('cancels from the accessible dialog without writing or creating a backup', () => {
    qs('migration-banner').querySelector('button').click();
    const dialog = qs('migration-confirm');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(globalThis.confirm).not.toHaveBeenCalled();

    dialog.querySelector('[data-dialog-cancel]').click();
    expect(qs('migration-confirm')).toBeNull();
    expect(JSON.parse(valueOf(SCHEMA_KEY)).schemaVersion).toBe(3);
    expect(valueOf(BACKUP_KEY)).toBeNull();
    expect(JSON.parse(valueOf(TICKETS_KEY))[0].folio).toBeUndefined();
  });

  it('applies the migration with backup, folios, subjects and history and leaves other collections untouched', () => {
    const before = {
      entities: valueOf(ENTITIES_KEY),
      documents: valueOf(DOCUMENTS_KEY),
      contacts: valueOf(CONTACTS_KEY),
      activities: valueOf(ACTIVITIES_KEY),
      trash: valueOf(TRASH_KEY)
    };

    qs('migration-banner').querySelector('button').click();
    qs('migration-confirm').querySelector('[data-dialog-confirm]').click();

    expect(JSON.parse(valueOf(SCHEMA_KEY)).schemaVersion).toBe(4);
    const backup = JSON.parse(valueOf(BACKUP_KEY));
    expect(backup.schemaVersion).toBe(3);
    expect(backup.ticketCount).toBe(2);
    expect(backup.collections.tickets[0].folio).toBeUndefined();

    const tickets = JSON.parse(valueOf(TICKETS_KEY));
    expect(tickets).toHaveLength(2);
    for (const ticket of tickets) {
      expect(ticket.folio).toMatch(/^TKT-\d{4}-\d{4}$/);
      expect(ticket.subject).toBeTruthy();
      expect(ticket.history.length).toBeGreaterThan(0);
      expect(ticket.channel).toBeNull();
      expect(ticket.assignee).toBeNull();
      expect(ticket.team).toBeNull();
      expect(ticket.firstResponseAt).toBeNull();
      expect(ticket.satisfactionScore).toBeNull();
    }
    expect(new Set(tickets.map((ticket) => ticket.folio)).size).toBe(2);
    expect(tickets.find((ticket) => ticket.id === 'tkt_1').subject).toBe('Falla histórica sin asunto');
    expect(tickets.find((ticket) => ticket.id === 'tkt_2').resolutionSummary).toBe('Repuesto cambiado');

    expect(valueOf(ENTITIES_KEY)).toBe(before.entities);
    expect(valueOf(DOCUMENTS_KEY)).toBe(before.documents);
    expect(valueOf(CONTACTS_KEY)).toBe(before.contacts);
    expect(valueOf(ACTIVITIES_KEY)).toBe(before.activities);
    expect(valueOf(TRASH_KEY)).toBe(before.trash);

    qs('nav-tickets').click();
    expect(qs('tickets-table').textContent).toMatch(/TKT-/);
    expect(qs('tickets-table').textContent).toContain('Falla histórica sin asunto');
    expect(qs('tickets-table').textContent).toContain('Canal no registrado');
    expect(qs('tickets-table').textContent).toContain('Sin asignar');
  });

  it('restores the v3 backup explicitly and keeps it available', () => {
    qs('migration-banner').querySelector('button').click();
    qs('migration-confirm').querySelector('[data-dialog-confirm]').click();
    expect(JSON.parse(valueOf(SCHEMA_KEY)).schemaVersion).toBe(4);

    const restore = [...qs('migration-banner').querySelectorAll('button')].find(
      (button) => button.textContent === 'Restaurar respaldo v3'
    );
    expect(restore).toBeTruthy();
    restore.click();
    expect(qs('migration-restore-confirm')).not.toBeNull();
    qs('migration-restore-confirm').querySelector('[data-dialog-confirm]').click();

    expect(JSON.parse(valueOf(SCHEMA_KEY)).schemaVersion).toBe(3);
    expect(JSON.parse(valueOf(TICKETS_KEY))[0].folio).toBeUndefined();
    expect(valueOf(BACKUP_KEY)).not.toBeNull();
  });
});
