import { describe, it, expect } from 'vitest';
import {
  createTrashEntry,
  trimTrash,
  detectRestoreConflicts,
  restoreTrashEntry,
  purgeTrashEntry,
  countTrashRecords,
  MAX_TRASH
} from '../../src/crm-trash.js';

const entity = { id: 'ent_1', entity_id: 'cli_1', name: 'Empresa Uno', code: 'CLI-001' };
const relations = {
  documents: [{ id: 'doc_1', entity_id: 'cli_1', series: 'OPP', folio: 3001 }],
  tickets: [{ id: 'tkt_1', entity_id: 'cli_1' }],
  contacts: [{ id: 'con_1', entity_id: 'cli_1', name: 'Contacto', isPrimary: true }],
  activities: [{ id: 'act_1', entity_id: 'cli_1', subject: 'Llamada' }]
};

describe('US16 — papelera', () => {
  it('construye el agregado con cliente y todas sus relaciones', () => {
    const entry = createTrashEntry({ entity, ...relations }, '2026-11-28T10:00:00.000Z');
    expect(entry.entity).toEqual(entity);
    expect(entry.documents).toHaveLength(1);
    expect(entry.tickets).toHaveLength(1);
    expect(entry.contacts).toHaveLength(1);
    expect(entry.activities).toHaveLength(1);
    expect(countTrashRecords(entry)).toBe(5);
    expect(entry.deletedAt).toBe('2026-11-28T10:00:00.000Z');
  });

  it('conserva como máximo 50 elementos descartando el más antiguo', () => {
    const entries = Array.from({ length: 55 }, (_, index) =>
      createTrashEntry(
        { entity: { ...entity, id: `ent_${index}`, entity_id: `cli_${index}` } },
        new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString()
      )
    );
    const trimmed = trimTrash(entries);
    expect(trimmed.entries).toHaveLength(MAX_TRASH);
    expect(trimmed.discarded).toHaveLength(5);
    expect(trimmed.discarded.map((entry) => entry.entity.id)).toEqual(['ent_0', 'ent_1', 'ent_2', 'ent_3', 'ent_4']);
    expect(trimmed.entries[trimmed.entries.length - 1].entity.id).toBe('ent_54');
  });

  it('detecta conflictos de identificadores antes de restaurar', () => {
    const entry = createTrashEntry({ entity, ...relations }, '2026-11-28T10:00:00.000Z');
    const conflicts = detectRestoreConflicts(entry, {
      entities: [{ ...entity }],
      documents: [],
      tickets: [],
      contacts: [],
      activities: []
    });
    expect(conflicts.hasConflicts).toBe(true);
    expect(conflicts.conflicts[0].collection).toBe('entities');

    const result = restoreTrashEntry(entry, {
      entities: [{ ...entity }],
      documents: [],
      tickets: [],
      contacts: [],
      activities: [],
      trash: [entry]
    });
    expect(result.ok).toBe(false);
  });

  it('restaura el agregado completo sin conflictos y lo quita de la papelera', () => {
    const entry = createTrashEntry({ entity, ...relations }, '2026-11-28T10:00:00.000Z');
    const result = restoreTrashEntry(entry, {
      entities: [],
      documents: [],
      tickets: [],
      contacts: [],
      activities: [],
      trash: [entry]
    });
    expect(result.ok).toBe(true);
    expect(result.snapshot.entities).toHaveLength(1);
    expect(result.snapshot.documents).toHaveLength(1);
    expect(result.snapshot.tickets).toHaveLength(1);
    expect(result.snapshot.contacts).toHaveLength(1);
    expect(result.snapshot.activities).toHaveLength(1);
    expect(result.snapshot.trash).toHaveLength(0);
  });

  it('purga definitivamente y admite clientes sin relaciones', () => {
    const entry = createTrashEntry({ entity }, '2026-11-28T10:00:00.000Z');
    expect(countTrashRecords(entry)).toBe(1);
    expect(purgeTrashEntry(entry.id, [entry])).toHaveLength(0);
  });
});
