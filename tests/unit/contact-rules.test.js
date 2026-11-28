import { describe, it, expect } from 'vitest';
import { validateContact, ensureSinglePrimary, migrateLegacyContactName } from '../../src/crm-rules.js';

const entities = [{ id: 'ent_1', entity_id: 'cli_1', name: 'Empresa', code: 'CLI-001' }];

const contact = (overrides = {}) => ({
  id: 'con_1',
  entity_id: 'cli_1',
  name: 'Contacto Uno',
  email: 'contacto@example.com',
  isPrimary: true,
  ...overrides
});

describe('US12 — reglas de contactos', () => {
  it('exige nombre y cliente existente y valida el correo cuando existe', () => {
    expect(validateContact({ name: '', entityId: 'cli_1' }, { entities }).errors.name).toMatch(/nombre/i);
    expect(validateContact({ name: 'A', entityId: 'cli_x' }, { entities }).errors.entityId).toMatch(/existente/i);
    expect(validateContact({ name: 'A', entityId: 'cli_1', email: 'no-correo' }, { entities }).errors.email).toMatch(
      /correo/i
    );
    expect(validateContact({ name: 'A', entityId: 'cli_1', email: 'a@example.com' }, { entities }).valid).toBe(true);
  });

  it('permite correos repetidos entre contactos', () => {
    expect(validateContact({ name: 'B', entityId: 'cli_1', email: 'contacto@example.com' }, { entities }).valid).toBe(
      true
    );
  });

  it('garantiza exactamente un contacto principal y cambia la marca', () => {
    const contacts = [
      contact(),
      contact({ id: 'con_2', name: 'Contacto Dos', isPrimary: false }),
      contact({ id: 'con_3', name: 'Contacto Tres', isPrimary: false })
    ];
    const switched = ensureSinglePrimary(contacts, 'cli_1', 'con_3');
    expect(switched.filter((item) => item.isPrimary)).toHaveLength(1);
    expect(switched.find((item) => item.id === 'con_3').isPrimary).toBe(true);
    expect(switched.find((item) => item.id === 'con_1').isPrimary).toBe(false);
  });

  it('migra contactName una sola vez sin duplicar', () => {
    const entity = {
      entity_id: 'cli_1',
      contactName: 'Contacto Heredado',
      email: 'heredado@example.com',
      phone: '+56 9 1111 1111'
    };
    const first = migrateLegacyContactName(entity, []);
    expect(first.migrated).toBe(true);
    expect(first.contacts).toHaveLength(1);
    expect(first.contacts[0].isPrimary).toBe(true);
    expect(first.contacts[0].name).toBe('Contacto Heredado');

    const second = migrateLegacyContactName(entity, first.contacts);
    expect(second.migrated).toBe(false);
    expect(second.contacts).toHaveLength(1);
    expect(entity.contactName).toBe('Contacto Heredado');
  });
});
