/**
 * Protocolo de versión recuperable (US-08).
 *
 * Antes de sustituir datos se guarda una instantánea completa serializada en
 * `erp_base_module:crmRecovery`. La escritura de las colecciones solo se
 * confirma después de que la instantánea recuperable existe; si la aplicación
 * se interrumpe, `detectPendingRecovery` permite restaurarla antes de habilitar
 * nuevas escrituras.
 *
 * Este módulo no conoce el dominio: solo serializa y administra el marcador.
 */

export const RECOVERY_KEY = 'erp_base_module:crmRecovery';
export const SCHEMA_KEY = 'erp_base_module:schemaVersion';

export const COLLECTION_KEYS = Object.freeze({
  entities: 'erp_base_module:entities',
  documents: 'erp_base_module:documents',
  tickets: 'erp_base_module:tickets',
  contacts: 'erp_base_module:crmContacts',
  activities: 'erp_base_module:crmActivities',
  trash: 'erp_base_module:crmTrash'
});

export const CRM_STORAGE_KEYS = Object.freeze([...Object.values(COLLECTION_KEYS), RECOVERY_KEY, SCHEMA_KEY]);

const QUOTA_MESSAGE =
  'No hay espacio suficiente para preparar una versión recuperable. La operación se rechazó y los datos anteriores se conservaron.';

const RECOVERY_MESSAGE =
  'No se pudo completar la recuperación de la operación interrumpida. Los datos no se modificaron; recarga la aplicación e inténtalo de nuevo.';

const SNAPSHOT_KEYS = Object.keys(COLLECTION_KEYS);

/** Indica si una clave pertenece al CRM (o es el borrado total del almacenamiento). */
export function isCrmStorageKey(key) {
  if (key === null || key === undefined) return true;
  return CRM_STORAGE_KEYS.includes(String(key));
}

/** Normaliza una instantánea a arreglos serializables. */
export function serializeSnapshot(snapshot = {}) {
  const out = {};
  for (const key of SNAPSHOT_KEYS) {
    out[key] = Array.isArray(snapshot[key]) ? snapshot[key] : [];
  }
  return out;
}

function readRawMarker() {
  let raw;
  try {
    raw = localStorage.getItem(RECOVERY_KEY);
  } catch {
    return { error: RECOVERY_MESSAGE };
  }
  if (raw === null || raw === undefined || raw === '') return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { corrupt: true };
  }
  if (!parsed || typeof parsed !== 'object') return { corrupt: true };
  return parsed;
}

/** Marcador de recuperación vigente, o `null` si no existe. */
export function readRecoveryMarker() {
  return readRawMarker();
}

/**
 * Guarda una versión completa recuperable antes de reemplazar la vigente.
 * Si no hay espacio, la operación se rechaza sin tocar las colecciones.
 */
export function prepareSnapshot(snapshot) {
  const marker = {
    pending: true,
    preparedAt: new Date().toISOString(),
    snapshot: serializeSnapshot(snapshot)
  };
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(marker));
  } catch {
    throw new Error(QUOTA_MESSAGE);
  }
  return marker;
}

/**
 * Marca la operación como confirmada conservando la versión anterior como
 * respaldo recuperable. Un fallo al actualizar el marcador no invalida la
 * escritura ya confirmada, pero deja preparada la versión recuperable.
 */
export function commitSnapshot(previousSnapshot) {
  const marker = {
    pending: false,
    committedAt: new Date().toISOString(),
    snapshot: serializeSnapshot(previousSnapshot)
  };
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(marker));
  } catch {
    // La escritura de las colecciones ya se completó; el marcador previo sigue
    // siendo una versión completa y recuperable.
  }
  return marker;
}

/** Detecta una operación interrumpida o un marcador ilegible. */
export function detectPendingRecovery() {
  const marker = readRawMarker();
  if (marker === null) return { pending: false, corrupt: false };
  if (marker.error) return { pending: false, corrupt: true, error: marker.error };
  if (marker.corrupt) {
    return {
      pending: false,
      corrupt: true,
      error: 'No se pudo leer la versión recuperable: el marcador está corrupto. No se habilitaron escrituras.'
    };
  }
  return { pending: marker.pending === true, corrupt: false };
}

/** Indica si el almacenamiento permite nuevas escrituras. */
export function canWrite() {
  const state = detectPendingRecovery();
  return !state.pending && !state.corrupt;
}

/**
 * Restaura la versión recuperable usando el escritor que entrega el llamador.
 * Si la restauración falla, el marcador permanece pendiente para reintentar.
 */
export function restorePreviousSnapshot(applySnapshot) {
  const marker = readRawMarker();
  if (!marker || marker.corrupt || marker.error) {
    throw new Error(RECOVERY_MESSAGE);
  }
  if (marker.pending !== true) return { restored: false };
  try {
    applySnapshot(serializeSnapshot(marker.snapshot));
  } catch {
    throw new Error(RECOVERY_MESSAGE);
  }
  try {
    localStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({
        pending: false,
        recoveredAt: new Date().toISOString(),
        snapshot: serializeSnapshot(marker.snapshot)
      })
    );
  } catch {
    // La restauración ya se aplicó; el marcador se reemplazará en la próxima escritura.
  }
  return { restored: true, snapshot: serializeSnapshot(marker.snapshot) };
}

export function clearRecovery() {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Sin almacenamiento no hay nada más que limpiar.
  }
}
