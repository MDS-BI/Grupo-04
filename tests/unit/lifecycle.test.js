import { describe, it, expect, beforeEach } from 'vitest';
import { canTransition, nextStatuses, validateStatusChange } from '../../src/crm-rules.js';
import { normalizeConfig, setActiveConfig, userConfig } from '../../src/module-config.js';

beforeEach(() => {
  setActiveConfig(normalizeConfig(userConfig).config);
});

describe('canTransition', () => {
  it('accepts every declared transition of the commercial cycle', () => {
    expect(canTransition('Nueva', 'Contactada')).toBe(true);
    expect(canTransition('Contactada', 'Propuesta')).toBe(true);
    expect(canTransition('Propuesta', 'Negociación')).toBe(true);
    expect(canTransition('Negociación', 'Ganada')).toBe(true);
  });

  it('allows closing as Perdida from any open stage', () => {
    for (const stage of ['Nueva', 'Contactada', 'Propuesta', 'Negociación']) {
      expect(canTransition(stage, 'Perdida')).toBe(true);
    }
  });

  it('rejects undeclared jumps', () => {
    expect(canTransition('Propuesta', 'Ganada')).toBe(false);
    expect(canTransition('Nueva', 'Ganada')).toBe(false);
    expect(canTransition('Nueva', 'Propuesta')).toBe(false);
    expect(canTransition('Contactada', 'Ganada')).toBe(false);
    expect(canTransition('Negociación', 'Propuesta')).toBe(false);
  });

  it('treats Ganada and Perdida as final stages', () => {
    expect(canTransition('Ganada', 'Perdida')).toBe(false);
    expect(canTransition('Ganada', 'Negociación')).toBe(false);
    expect(canTransition('Perdida', 'Nueva')).toBe(false);
    expect(canTransition('Perdida', 'Contactada')).toBe(false);
  });
});

describe('nextStatuses', () => {
  it('returns the declared next stages for each open stage', () => {
    expect(nextStatuses('Nueva')).toEqual(['Contactada', 'Perdida']);
    expect(nextStatuses('Contactada')).toEqual(['Propuesta', 'Perdida']);
    expect(nextStatuses('Propuesta')).toEqual(['Negociación', 'Perdida']);
    expect(nextStatuses('Negociación')).toEqual(['Ganada', 'Perdida']);
  });

  it('returns no next stages for final stages', () => {
    expect(nextStatuses('Ganada')).toEqual([]);
    expect(nextStatuses('Perdida')).toEqual([]);
  });

  it('returns an empty list for unknown stages', () => {
    expect(nextStatuses('Inventada')).toEqual([]);
    expect(nextStatuses(undefined)).toEqual([]);
  });
});

describe('validateStatusChange', () => {
  it('accepts keeping the current stage', () => {
    expect(validateStatusChange('Nueva', 'Nueva').valid).toBe(true);
    expect(validateStatusChange('Ganada', 'Ganada').valid).toBe(true);
  });

  it('accepts valid transitions, including Perdida with a reason', () => {
    expect(validateStatusChange('Nueva', 'Contactada').valid).toBe(true);
    expect(validateStatusChange('Negociación', 'Ganada').valid).toBe(true);
    expect(validateStatusChange('Nueva', 'Perdida', 'Precio').valid).toBe(true);
  });

  it('requires a non-blank loss reason when entering Perdida', () => {
    for (const reason of ['', '   ', undefined]) {
      const result = validateStatusChange('Nueva', 'Perdida', reason);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/motivo/i);
    }
  });

  it('rejects invalid jumps and reopening final stages', () => {
    expect(validateStatusChange('Propuesta', 'Ganada').valid).toBe(false);
    expect(validateStatusChange('Ganada', 'Negociación').valid).toBe(false);
    expect(validateStatusChange('Perdida', 'Nueva').valid).toBe(false);
    expect(validateStatusChange('Ganada', 'Perdida', 'X').valid).toBe(false);
  });
});
