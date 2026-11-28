import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

let storage;
let recovery;

async function loadModules() {
  vi.resetModules();
  storage = await import('../../src/storage.js');
  recovery = await import('../../src/storage-recovery.js');
}

beforeEach(async () => {
  store.clear();
  await loadModules();
});

function seedAggregate() {
  const entity = storage.addEntity({ name: 'Empresa Demo 1', code: 'CLI-001' });
  storage.addDocument({ entityId: entity.entity_id, folio: 3001, startDate: '2026-11-02', endDate: '2026-11-30' });
  storage.addTicket({
    entityId: entity.entity_id,
    productName: 'Compresor',
    reason: 'soporte',
    description: 'Falla',
    priority: 'Alta'
  });
  return entity;
}

describe('US8 — integración de recuperación', () => {
  it('no acepta una eliminación parcial: recupera el agregado completo tras reiniciar', async () => {
    seedAggregate();
    const previous = storage.readSnapshotForBackup();
    recovery.prepareSnapshot(previous);
    // Interrupción a mitad de la cascada: el cliente desaparece, el resto queda.
    globalThis.localStorage.setItem(storage.ENTITIES_KEY, JSON.stringify([]));

    await loadModules();
    const result = storage.recoverPendingOperation();
    expect(result.recovered).toBe(true);
    expect(storage.loadEntities()).toHaveLength(1);
    expect(storage.loadDocuments()).toHaveLength(1);
    expect(storage.loadTickets()).toHaveLength(1);
    expect(storage.isWriteBlocked()).toBe(false);
  });

  it('bloquea las escrituras si falla la propia recuperación sin éxito falso', async () => {
    seedAggregate();
    const previous = storage.readSnapshotForBackup();
    recovery.prepareSnapshot(previous);

    const real = globalThis.localStorage;
    globalThis.localStorage = {
      ...real,
      setItem: (key, value) => {
        if (key === storage.ENTITIES_KEY) throw new Error('QuotaExceededError');
        real.setItem(key, value);
      }
    };
    let result;
    try {
      result = storage.recoverPendingOperation();
    } finally {
      globalThis.localStorage = real;
    }
    expect(result.recovered).toBe(false);
    expect(result.blocked).toBe(true);
    expect(storage.isWriteBlocked()).toBe(true);
    expect(() => storage.addEntity({ name: 'Otra', code: 'CLI-002' })).toThrow(/bloquead/i);
  });

  it('mantiene oportunidades, tickets, contactos y actividades en la versión recuperable', async () => {
    const entity = seedAggregate();
    const contact = storage.addContact({ entityId: entity.entity_id, name: 'Contacto Uno', isPrimary: true });
    storage.addActivity({
      entityId: entity.entity_id,
      type: 'llamada',
      subject: 'Llamada',
      owner: 'Ejecutivo A',
      contactId: contact.id
    });
    const previous = storage.readSnapshotForBackup();
    recovery.prepareSnapshot(previous);
    globalThis.localStorage.setItem(storage.CONTACTS_KEY, JSON.stringify([]));
    globalThis.localStorage.setItem(storage.ACTIVITIES_KEY, JSON.stringify([]));

    await loadModules();
    storage.recoverPendingOperation();
    expect(storage.loadContacts()).toHaveLength(1);
    expect(storage.loadActivities()).toHaveLength(1);
  });
});
