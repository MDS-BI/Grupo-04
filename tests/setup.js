import { afterEach, beforeEach } from 'vitest';

function clearStorage() {
  try {
    if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.clear();
    }
  } catch {
    // Un almacenamiento de un jsdom ya cerrado no debe romper la limpieza.
  }
}

beforeEach(clearStorage);
afterEach(clearStorage);
