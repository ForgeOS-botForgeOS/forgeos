import { describe, it, expect } from 'vitest';
import { phaseSpans, goalNudge } from './goalPhases';
import type { WeighIn } from '../types';

describe('phaseSpans', () => {
  it('measures each phase in weeks and flags the current one', () => {
    const now = new Date('2026-03-01').getTime();
    const spans = phaseSpans(
      [
        { goal: 'gain', startISO: '2026-01-01' },
        { goal: 'lose', startISO: '2026-02-01' },
      ],
      now,
    );
    expect(spans).toHaveLength(2);
    expect(spans[0].goal).toBe('gain');
    expect(spans[0].weeks).toBeGreaterThanOrEqual(4);
    expect(spans[1].current).toBe(true);
  });
});

describe('goalNudge', () => {
  const weighIns = (kgs: number[]): WeighIn[] =>
    kgs.map((weightKg, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, weightKg }));

  it('nudges away from a cut when weight has stalled', () => {
    const tip = goalNudge('lose', weighIns([80, 80, 80.1, 79.9, 80, 80.1, 80, 79.9]));
    expect(tip).toMatch(/flat|maintenance|deficit/i);
  });

  it('nudges to eat more when not gaining on a bulk', () => {
    const tip = goalNudge('gain', weighIns([80, 80, 80, 80, 80, 80, 80, 80]));
    expect(tip).toMatch(/calorie|gaining|eat/i);
  });

  it('stays quiet when the trend matches the goal', () => {
    expect(goalNudge('lose', weighIns([82, 81.5, 81, 80.5, 80, 79.5, 79, 78.5]))).toBeNull();
  });

  it('is silent without enough data', () => {
    expect(goalNudge('lose', weighIns([80, 79]))).toBeNull();
  });
});
