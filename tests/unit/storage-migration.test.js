import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestMigration,
  applyMigration,
  cancelMigration,
  loadMigrationBackup,
  restoreMigrationBackup,
  getStoredSchemaVersion,
  SCHEMA_VERSION,
  ENTITIES_KEY,
  TICKETS_KEY,
  SCHEMA_KEY,
  MIGRATION_BACKUP_KEY
} from '../../src/storage.js';
import { RECOVERY_KEY } from '../../src/storage-recovery.js';
import { setActiveConfig } from '../../src/module-config.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function seedLegacyData(ticketOverrides = {}) {
  store.set(
    ENTITIES_KEY,
    JSON.stringify([{ id: 'ent_1', entity_id: 'cli_1', name: 'Empresa Heredada', code: 'CLI-H-001' }])
  );
  store.set(
    TICKETS_KEY,
    JSON.stringify([
      {
        id: 'tkt_1',
        entity_id: 'cli_1',
        productName: 'Compresor',
        reason: 'soporte',
        description: 'Falla histórica',
        priority: 'Alta',
        status: 'Resuelto',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        ...ticketOverrides
      }
    ])
  );
  store.set(SCHEMA_KEY, JSON.stringify({ schemaVersion: 1 }));
}

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  cancelMigration();
});

describe('US8 — migración explícita a esquema v4', () => {
  it('describe los pasos pendientes y exige confirmación y respaldo', () => {
    seedLegacyData();
    const plan = requestMigration(1, SCHEMA_VERSION);
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.backup).toBe(true);
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.steps.join(' ')).toMatch(/folio/i);
    expect(getStoredSchemaVersion()).toBe(1);
    expect(store.get(TICKETS_KEY)).not.toContain('folio');
  });

  it('cancelar conserva el formato original y bloquea la reinterpretación silenciosa', () => {
    seedLegacyData();
    requestMigration(1, SCHEMA_VERSION);
    const result = cancelMigration();
    expect(result.applied).toBe(false);
    expect(getStoredSchemaVersion()).toBe(1);
    const tickets = JSON.parse(store.get(TICKETS_KEY));
    expect(tickets[0].legacyResolutionIncomplete).toBeUndefined();
    expect(tickets[0].resolutionSummary).toBeUndefined();
    expect(tickets[0].folio).toBeUndefined();
    expect(store.get(MIGRATION_BACKUP_KEY)).toBeUndefined();
  });

  it('migra folio, asunto e historial sin inventar solución, canal ni técnico', () => {
    seedLegacyData();
    requestMigration(1, SCHEMA_VERSION);
    const result = applyMigration();
    expect(result.applied).toBe(true);
    expect(getStoredSchemaVersion()).toBe(SCHEMA_VERSION);
    const tickets = JSON.parse(store.get(TICKETS_KEY));
    expect(tickets[0].status).toBe('Resuelto');
    expect(tickets[0].legacyResolutionIncomplete).toBe(true);
    expect(tickets[0].resolutionSummary).toBeUndefined();
    expect(tickets[0].resolvedAt).toBeUndefined();
    expect(tickets[0].folio).toMatch(/^TKT-\d{4}-0001$/);
    expect(tickets[0].subject).toBe('Falla histórica');
    expect(tickets[0].channel).toBeNull();
    expect(tickets[0].assignee).toBeNull();
    expect(tickets[0].team).toBeNull();
    expect(tickets[0].firstResponseAt).toBeNull();
    expect(tickets[0].closedAt).toBeNull();
    expect(tickets[0].satisfactionScore).toBeNull();
    expect(tickets[0].slaDueAt).toBeTruthy();
    expect(tickets[0].history).toHaveLength(1);
    expect(tickets[0].history[0].type).toBe('migracion');
    expect(store.get(RECOVERY_KEY)).toBeTruthy();
  });

  it('guarda un respaldo con metadatos e instantánea íntegra y permite restaurarlo', () => {
    seedLegacyData();
    const entitiesBefore = store.get(ENTITIES_KEY);
    requestMigration(1, SCHEMA_VERSION);
    applyMigration();

    expect(store.get(MIGRATION_BACKUP_KEY)).toBeTruthy();
    const backup = loadMigrationBackup();
    expect(backup.schemaVersion).toBe(1);
    expect(backup.ticketCount).toBe(1);
    expect(backup.collections.tickets[0].folio).toBeUndefined();
    expect(backup.collections.entities).toEqual(JSON.parse(entitiesBefore));

    const restored = restoreMigrationBackup();
    expect(restored.restored).toBe(true);
    expect(restored.schemaVersion).toBe(1);
    expect(getStoredSchemaVersion()).toBe(1);
    const tickets = JSON.parse(store.get(TICKETS_KEY));
    expect(tickets[0].folio).toBeUndefined();
    expect(tickets[0].description).toBe('Falla histórica');
    expect(store.get(MIGRATION_BACKUP_KEY)).toBeTruthy();
    expect(JSON.parse(store.get(ENTITIES_KEY))).toEqual(JSON.parse(entitiesBefore));
  });

  it('asigna folios consecutivos por año y es determinista por createdAt e id', () => {
    store.set(ENTITIES_KEY, JSON.stringify([{ id: 'ent_1', entity_id: 'cli_1', name: 'A', code: 'A-1' }]));
    const base = { entity_id: 'cli_1', productName: 'P', reason: 'soporte', description: 'D', priority: 'Alta' };
    store.set(
      TICKETS_KEY,
      JSON.stringify([
        { ...base, id: 'tkt_b', status: 'Nuevo', createdAt: '2025-05-01T10:00:00.000Z' },
        { ...base, id: 'tkt_a', status: 'Nuevo', createdAt: '2026-01-01T10:00:00.000Z' },
        { ...base, id: 'tkt_c', status: 'Nuevo', createdAt: '2026-02-01T10:00:00.000Z' }
      ])
    );
    store.set(SCHEMA_KEY, JSON.stringify({ schemaVersion: 3 }));
    requestMigration(3, SCHEMA_VERSION);
    applyMigration();
    const byId = new Map(JSON.parse(store.get(TICKETS_KEY)).map((ticket) => [ticket.id, ticket]));
    expect(byId.get('tkt_b').folio).toMatch(/^TKT-2025-0001$/);
    expect(byId.get('tkt_a').folio).toMatch(/^TKT-2026-0001$/);
    expect(byId.get('tkt_c').folio).toMatch(/^TKT-2026-0002$/);
    expect(new Set([...byId.values()].map((ticket) => ticket.folio)).size).toBe(3);
  });

  it('aborta antes de escribir si un createdAt no es válido', () => {
    seedLegacyData({ createdAt: 'no-es-fecha' });
    requestMigration(1, SCHEMA_VERSION);
    expect(() => applyMigration()).toThrow(/fecha de creación/i);
    expect(getStoredSchemaVersion()).toBe(1);
    expect(JSON.parse(store.get(TICKETS_KEY))[0].folio).toBeUndefined();
    expect(store.get(MIGRATION_BACKUP_KEY)).toBeUndefined();
  });

  it('no aplica una migración sin solicitud previa', () => {
    seedLegacyData();
    expect(() => applyMigration()).toThrow(/migración solicitada/i);
  });
});
