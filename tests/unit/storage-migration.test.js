import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestMigration,
  applyMigration,
  cancelMigration,
  getStoredSchemaVersion,
  SCHEMA_VERSION,
  ENTITIES_KEY,
  TICKETS_KEY,
  SCHEMA_KEY
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

function seedLegacyData() {
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
        updatedAt: '2026-10-01T10:00:00.000Z'
      }
    ])
  );
  store.set(SCHEMA_KEY, JSON.stringify({ schemaVersion: 1 }));
}

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
});

describe('US8 — migración explícita', () => {
  it('describe la migración y exige confirmación y respaldo', () => {
    seedLegacyData();
    const plan = requestMigration(1, SCHEMA_VERSION);
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.backup).toBe(true);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(getStoredSchemaVersion()).toBe(1);
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
  });

  it('marca los tickets históricos sin inventar solución ni fecha y conserva respaldo', () => {
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
    expect(store.get(RECOVERY_KEY)).toBeTruthy();
  });

  it('no aplica una migración sin solicitud previa', () => {
    seedLegacyData();
    expect(() => applyMigration()).toThrow(/migración solicitada/i);
  });
});
