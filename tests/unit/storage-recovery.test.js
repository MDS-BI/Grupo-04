import { describe, it, expect, beforeEach } from 'vitest';
import {
  addEntity,
  loadEntities,
  readSnapshotForBackup,
  recoverPendingOperation,
  isWriteBlocked,
  ENTITIES_KEY
} from '../../src/storage.js';
import { RECOVERY_KEY, prepareSnapshot } from '../../src/storage-recovery.js';
import { setActiveConfig } from '../../src/module-config.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
});

describe('US8 — versión recuperable', () => {
  it('rechaza el guardado sin reemplazar datos cuando no hay espacio para la recuperación', () => {
    addEntity({ name: 'Empresa Uno', code: 'CLI-001' });
    const real = globalThis.localStorage;
    globalThis.localStorage = {
      ...real,
      setItem: (key, value) => {
        if (key === RECOVERY_KEY) throw new Error('QuotaExceededError');
        real.setItem(key, value);
      }
    };
    try {
      expect(() => addEntity({ name: 'Empresa Dos', code: 'CLI-002' })).toThrow(/espacio|recuperable|cuota/i);
    } finally {
      globalThis.localStorage = real;
    }
    expect(loadEntities().length).toBe(1);
    expect(loadEntities()[0].code).toBe('CLI-001');
  });

  it('confirma la escritura solo después de persistir y deja el marcador sin pendientes', () => {
    addEntity({ name: 'Empresa Uno', code: 'CLI-001' });
    const marker = JSON.parse(globalThis.localStorage.getItem(RECOVERY_KEY));
    expect(marker.pending).toBe(false);
    expect(Array.isArray(marker.snapshot.entities)).toBe(true);
    expect(isWriteBlocked()).toBe(false);
  });

  it('detecta una operación interrumpida y restaura la versión íntegra antes de escribir', () => {
    addEntity({ name: 'Empresa Uno', code: 'CLI-001' });
    const previous = readSnapshotForBackup();
    prepareSnapshot(previous);
    // Simula una escritura parcial y una interrupción posterior.
    globalThis.localStorage.setItem(ENTITIES_KEY, JSON.stringify([]));
    expect(isWriteBlocked()).toBe(true);
    expect(() => addEntity({ name: 'Otra', code: 'CLI-002' })).toThrow(/bloquead/i);

    const result = recoverPendingOperation();
    expect(result.recovered).toBe(true);
    expect(result.blocked).toBe(false);
    expect(loadEntities().length).toBe(1);
    expect(isWriteBlocked()).toBe(false);
  });

  it('bloquea las escrituras si el marcador no puede verificarse', () => {
    addEntity({ name: 'Empresa Uno', code: 'CLI-001' });
    globalThis.localStorage.setItem(RECOVERY_KEY, '{marcador-invalido');
    expect(isWriteBlocked()).toBe(true);
    const result = recoverPendingOperation();
    expect(result.blocked).toBe(true);
    expect(() => addEntity({ name: 'Nueva', code: 'CLI-003' })).toThrow(/bloquead/i);
    expect(loadEntities().length).toBe(1);
  });
});
