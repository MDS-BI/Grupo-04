import { describe, it, expect } from 'vitest';
import { canTransition, nextStatuses, validateStatusChange } from '../../src/crm-rules.js';
import { stageDistribution } from '../../src/crm-metrics.js';
import { setActiveConfig, userConfig } from '../../src/module-config.js';

setActiveConfig(userConfig);

describe('US15 — Kanban editable', () => {
  it('deriva los destinos de canTransition y rechaza saltos', () => {
    expect(nextStatuses('Nueva')).toEqual(['Contactada', 'Perdida']);
    expect(canTransition('Nueva', 'Contactada')).toBe(true);
    expect(canTransition('Nueva', 'Ganada')).toBe(false);
    expect(validateStatusChange('Nueva', 'Ganada').valid).toBe(false);
  });

  it('exige motivo al pasar a Perdida y bloquea estados finales', () => {
    expect(validateStatusChange('Negociación', 'Perdida').valid).toBe(false);
    expect(validateStatusChange('Negociación', 'Perdida', 'Precio').valid).toBe(true);
    expect(nextStatuses('Ganada')).toEqual([]);
    expect(nextStatuses('Perdida')).toEqual([]);
    expect(canTransition('Ganada', 'Nueva')).toBe(false);
  });

  it('recalcula conteos y montos por columna tras mover una oportunidad', () => {
    const documents = [
      { id: 'doc_1', status: 'Nueva', totalAmount: 100000 },
      { id: 'doc_2', status: 'Contactada', totalAmount: 200000 }
    ];
    const before = stageDistribution(documents, ['Nueva', 'Contactada', 'Ganada']);
    expect(before.find((bucket) => bucket.status === 'Nueva')).toMatchObject({ count: 1, amount: 100000 });
    expect(before.find((bucket) => bucket.status === 'Contactada')).toMatchObject({ count: 1, amount: 200000 });

    documents[0].status = 'Contactada';
    const after = stageDistribution(documents, ['Nueva', 'Contactada', 'Ganada']);
    expect(after.find((bucket) => bucket.status === 'Nueva')).toMatchObject({ count: 0, amount: 0 });
    expect(after.find((bucket) => bucket.status === 'Contactada')).toMatchObject({ count: 2, amount: 300000 });
  });
});
