import { describe, it, expect } from 'vitest';
import { validateSatisfaction } from '../../src/crm-rules.js';

describe('US-32 — validación de la satisfacción', () => {
  it('acepta enteros de 1 a 5', () => {
    for (const score of [1, 2, 3, 4, 5]) {
      const result = validateSatisfaction(score, '');
      expect(result.valid).toBe(true);
      expect(result.score).toBe(score);
      expect(result.comment).toBeNull();
    }
  });

  it('rechaza 0, 6, decimales, texto, cadenas numéricas y vacíos', () => {
    for (const score of [0, 6, 1.5, '4', '', null, undefined, NaN]) {
      const result = validateSatisfaction(score, '');
      expect(result.valid).toBe(false);
      expect(result.errors.score).toMatch(/nota entera de 1 a 5/i);
    }
  });

  it('recorta el comentario y acepta hasta 500 caracteres', () => {
    const result = validateSatisfaction(4, '  Atención rápida  ');
    expect(result.comment).toBe('Atención rápida');
    expect(validateSatisfaction(4, 'a'.repeat(500)).valid).toBe(true);
    const tooLong = validateSatisfaction(4, 'a'.repeat(501));
    expect(tooLong.valid).toBe(false);
    expect(tooLong.errors.comment).toMatch(/500/);
  });

  it('trata el comentario vacío como ausente', () => {
    expect(validateSatisfaction(5, '   ').comment).toBeNull();
    expect(validateSatisfaction(5, undefined).comment).toBeNull();
  });
});
