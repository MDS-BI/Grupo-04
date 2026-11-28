/**
 * Papelera de clientes (US-16). Funciones puras sobre el agregado eliminado:
 * no leen `localStorage` ni el DOM.
 */

export const MAX_TRASH = 50;

let sequence = 0;

function nextId(now) {
  sequence += 1;
  return `trash_${Date.parse(now) || Date.now()}_${sequence}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Crea el elemento de papelera con una copia completa del cliente y de sus
 * oportunidades, tickets, contactos y actividades.
 */
export function createTrashEntry(
  { entity, documents, tickets, contacts, activities } = {},
  now = new Date().toISOString()
) {
  if (!entity || !entity.id) throw new Error('La papelera requiere un cliente válido.');
  return {
    id: nextId(now),
    deletedAt: now,
    entity: { ...entity },
    documents: asArray(documents).map((item) => ({ ...item })),
    tickets: asArray(tickets).map((item) => ({ ...item })),
    contacts: asArray(contacts).map((item) => ({ ...item })),
    activities: asArray(activities).map((item) => ({ ...item }))
  };
}

function deletedTime(entry) {
  const parsed = Date.parse(entry && entry.deletedAt ? entry.deletedAt : '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Conserva como máximo `max` elementos; descarta los más antiguos (FIFO). */
export function trimTrash(entries = [], max = MAX_TRASH) {
  const sorted = asArray(entries)
    .filter(Boolean)
    .slice()
    .sort((a, b) => deletedTime(a) - deletedTime(b));
  const discarded = sorted.length > max ? sorted.slice(0, sorted.length - max) : [];
  return { entries: sorted.slice(sorted.length - Math.min(max, sorted.length)), discarded };
}

/**
 * Detecta colisiones de identificadores antes de restaurar. No reasigna ni
 * corrige datos: solo informa qué registros chocan.
 */
export function detectRestoreConflicts(entry, snapshot = {}) {
  const conflicts = [];
  if (!entry || !entry.entity) return { hasConflicts: true, conflicts };
  const entity = entry.entity;
  const currentEntities = asArray(snapshot.entities);
  if (currentEntities.some((item) => item && (item.id === entity.id || item.entity_id === entity.entity_id))) {
    conflicts.push({
      collection: 'entities',
      id: entity.id,
      reference: entity.code || entity.name || entity.id,
      message: `Ya existe un cliente con el identificador ${entity.code || entity.id}`
    });
  }
  if (currentEntities.some((item) => item && item.code === entity.code)) {
    conflicts.push({
      collection: 'entities',
      id: entity.id,
      reference: entity.code,
      message: `Ya existe un cliente con el código ${entity.code}`
    });
  }
  const collections = [
    ['documents', entry.documents],
    ['tickets', entry.tickets],
    ['contacts', entry.contacts],
    ['activities', entry.activities]
  ];
  for (const [name, items] of collections) {
    const existing = new Set(asArray(snapshot[name]).map((item) => item && item.id));
    for (const item of asArray(items)) {
      if (item && existing.has(item.id)) {
        conflicts.push({
          collection: name,
          id: item.id,
          reference: item.folio ? `${item.series || ''}/${item.folio}` : item.name || item.subject || item.id,
          message: `El registro ${item.id} de ${name} ya existe`
        });
      }
    }
  }
  return { hasConflicts: conflicts.length > 0, conflicts };
}

/**
 * Devuelve la instantánea restaurada. Si hay conflictos no modifica nada y los
 * informa para que la interfaz decida.
 */
export function restoreTrashEntry(entry, snapshot = {}) {
  const { hasConflicts, conflicts } = detectRestoreConflicts(entry, snapshot);
  if (hasConflicts) return { ok: false, conflicts };
  return {
    ok: true,
    conflicts: [],
    snapshot: {
      entities: [...asArray(snapshot.entities), entry.entity],
      documents: [...asArray(snapshot.documents), ...asArray(entry.documents)],
      tickets: [...asArray(snapshot.tickets), ...asArray(entry.tickets)],
      contacts: [...asArray(snapshot.contacts), ...asArray(entry.contacts)],
      activities: [...asArray(snapshot.activities), ...asArray(entry.activities)],
      trash: asArray(snapshot.trash).filter((item) => item && item.id !== entry.id)
    }
  };
}

/** Purga definitiva: devuelve la papelera sin el elemento indicado. */
export function purgeTrashEntry(entryId, trash = []) {
  return asArray(trash).filter((item) => item && item.id !== entryId);
}

/** Cantidad de registros asociados al elemento (cliente incluido). */
export function countTrashRecords(entry) {
  if (!entry) return 0;
  return (
    1 +
    asArray(entry.documents).length +
    asArray(entry.tickets).length +
    asArray(entry.contacts).length +
    asArray(entry.activities).length
  );
}
