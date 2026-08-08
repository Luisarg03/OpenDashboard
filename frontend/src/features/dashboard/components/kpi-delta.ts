/**
 * Pure delta math for KPI tiles. Kept separate from kpi-section.tsx so the
 * unit test does not pull in the component module (recharts/motion).
 */

export type DeltaDirection = 'up' | 'down' | 'neutral';

export interface Delta {
  deltaPct: number;
  direction: DeltaDirection;
}

/**
 * Percentage change of `current` vs. `previous`, plus the sign as a direction.
 * Neutral when either side is zero: no baseline to compare against (also
 * guards the division by zero).
 */
export function computeDelta(current: number, previous: number): Delta {
  if (current === 0 || previous === 0) {
    return { deltaPct: 0, direction: 'neutral' };
  }
  const deltaPct = ((current - previous) / previous) * 100;
  return { deltaPct, direction: deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'neutral' };
}
