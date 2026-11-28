import { describe, it, expect } from 'vitest';
import { hasRealChanges } from '../../src/crm-rules.js';
import { hasQuickCreateChanges } from '../../src/components/quick-create-client.js';
import { isCrmStorageKey } from '../../src/storage-recovery.js';

describe('US10 — estado del alta rápida', () => {
  it('no solicita descarte cuando solo cambian espacios o valores vacíos', () => {
    const initial = { name: '', email: '', phone: '' };
    expect(hasRealChanges(initial, { name: '   ', email: '', phone: undefined })).toBe(false);
    expect(hasQuickCreateChanges(initial, { name: '  ', email: '', phone: '' })).toBe(false);
  });

  it('detecta cambios reales en cualquier campo del borrador', () => {
    expect(hasRealChanges({ name: '' }, { name: 'Empresa Demo' })).toBe(true);
    expect(hasQuickCreateChanges({ code: 'CLI-1' }, { code: 'CLI-2' })).toBe(true);
  });

  it('ignora claves ajenas al CRM al evaluar formularios obsoletos', () => {
    expect(isCrmStorageKey('erp_base_module:entities')).toBe(true);
    expect(isCrmStorageKey('erp_base_module:crmContacts')).toBe(true);
    expect(isCrmStorageKey('erp_base_module:crmRecovery')).toBe(true);
    expect(isCrmStorageKey(null)).toBe(true);
    expect(isCrmStorageKey('otro_modulo:preferencias')).toBe(false);
  });
});
