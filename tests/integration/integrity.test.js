import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

let storage;

async function load() {
  vi.resetModules();
  storage = await import('../../src/storage.js');
}

const entity = { id: 'ent_1', entity_id: 'cli_1', name: 'Empresa Uno', code: 'CLI-001' };

beforeEach(async () => {
  store.clear();
  await load();
});

describe('US9 — integración de integridad', () => {
  it('detecta huérfanos al iniciar sin reasignar clientes', async () => {
    store.set(storage.ENTITIES_KEY, JSON.stringify([entity]));
    store.set(
      storage.DOCUMENTS_KEY,
      JSON.stringify([{ id: 'doc_1', entity_id: 'cli_inexistente', series: 'OPP', folio: 3001 }])
    );
    expect(() => storage.loadSnapshot()).toThrow(/inexistente/i);
    expect(JSON.parse(store.get(storage.DOCUMENTS_KEY))[0].entity_id).toBe('cli_inexistente');
  });

  it('no persiste un conjunto inválido ni altera la versión anterior', async () => {
    store.set(storage.ENTITIES_KEY, JSON.stringify([entity]));
    store.set(storage.DOCUMENTS_KEY, JSON.stringify([]));
    const before = {
      entities: store.get(storage.ENTITIES_KEY),
      documents: store.get(storage.DOCUMENTS_KEY)
    };
    expect(() => storage.saveDocuments([{ id: 'doc_2', entity_id: 'cli_x', series: 'OPP', folio: 3002 }])).toThrow(
      /inexistente|inválid/i
    );
    expect(store.get(storage.ENTITIES_KEY)).toBe(before.entities);
    expect(store.get(storage.DOCUMENTS_KEY)).toBe(before.documents);
  });
});
