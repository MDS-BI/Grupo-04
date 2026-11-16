import { describe, it, expect } from 'vitest';
import { stageDistribution } from '../../src/crm-metrics.js';
import { userConfig } from '../../src/module-config.js';

const STATUSES = userConfig.statusLifecycle.statuses;

const documents = [
  { status: 'Nueva', totalAmount: 100000 },
  { status: 'Nueva', totalAmount: 25000 },
  { status: 'Negociación', totalAmount: 300000 },
  { status: 'Ganada', totalAmount: 50000 },
  { status: 'Perdida', totalAmount: 0 }
];

describe('stageDistribution', () => {
  it('returns one bucket per lifecycle status in the configured order, including zeros', () => {
    const buckets = stageDistribution([], STATUSES);

    expect(buckets).toHaveLength(STATUSES.length);
    expect(buckets.map((bucket) => bucket.status)).toEqual(STATUSES);
    expect(buckets.every((bucket) => bucket.count === 0 && bucket.amount === 0)).toBe(true);
  });

  it('counts opportunities and sums their amounts per status', () => {
    const buckets = stageDistribution(documents, STATUSES);

    expect(buckets).toEqual([
      { status: 'Nueva', count: 2, amount: 125000 },
      { status: 'Contactada', count: 0, amount: 0 },
      { status: 'Propuesta', count: 0, amount: 0 },
      { status: 'Negociación', count: 1, amount: 300000 },
      { status: 'Ganada', count: 1, amount: 50000 },
      { status: 'Perdida', count: 1, amount: 0 }
    ]);
  });

  it('ignores documents whose status is not part of the lifecycle', () => {
    const buckets = stageDistribution(
      [
        { status: 'Nueva', totalAmount: 1000 },
        { status: 'Archivada', totalAmount: 9999 },
        { status: undefined, totalAmount: 5000 },
        null
      ],
      STATUSES
    );

    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
    expect(buckets.reduce((sum, bucket) => sum + bucket.amount, 0)).toBe(1000);
  });

  it('does not produce NaN when totalAmount is missing or invalid', () => {
    const buckets = stageDistribution(
      [{ status: 'Nueva' }, { status: 'Nueva', totalAmount: 'invalido' }, { status: 'Nueva', totalAmount: 2000 }],
      STATUSES
    );

    const nueva = buckets.find((bucket) => bucket.status === 'Nueva');
    expect(nueva).toEqual({ status: 'Nueva', count: 3, amount: 2000 });
    expect(buckets.every((bucket) => Number.isFinite(bucket.amount))).toBe(true);
  });

  it('returns an empty list when statuses is missing and tolerates a non-array documents value', () => {
    expect(stageDistribution(documents, undefined)).toEqual([]);
    expect(stageDistribution(null, STATUSES).every((bucket) => bucket.count === 0)).toBe(true);
  });
});
