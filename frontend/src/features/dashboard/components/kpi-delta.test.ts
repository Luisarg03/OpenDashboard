import { describe, expect, it } from 'vitest';

import { computeDelta } from './kpi-delta';

describe('computeDelta', () => {
  it('computes the percentage change', () => {
    expect(computeDelta(110, 100).deltaPct).toBeCloseTo(10, 10);
  });

  it('is up when the current value grew', () => {
    const { deltaPct, direction } = computeDelta(110, 100);
    expect(direction).toBe('up');
    expect(deltaPct).toBeGreaterThan(0);
  });

  it('is down when the current value shrank', () => {
    const { deltaPct, direction } = computeDelta(100, 110);
    expect(direction).toBe('down');
    expect(deltaPct).toBeCloseTo(-9.0909, 3);
  });

  it('is neutral when current is zero', () => {
    expect(computeDelta(0, 100)).toEqual({ deltaPct: 0, direction: 'neutral' });
  });

  it('is neutral when previous is zero', () => {
    expect(computeDelta(100, 0)).toEqual({ deltaPct: 0, direction: 'neutral' });
  });

  it('is neutral when both are zero', () => {
    expect(computeDelta(0, 0)).toEqual({ deltaPct: 0, direction: 'neutral' });
  });

  it('is neutral when values are equal', () => {
    expect(computeDelta(100, 100).direction).toBe('neutral');
  });
});
