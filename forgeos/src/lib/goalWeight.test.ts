import { describe, it, expect } from 'vitest';
import { weightTrend, daysSinceWeighIn } from './goalWeight';
import type { WeighIn } from '../types';

const NOW = new Date('2026-07-06T12:00:00Z');

/** Steady loss: 82 kg four weeks ago, dropping ~0.5 kg/week. */
function losing(): WeighIn[] {
  return [0, 7, 14, 21, 28].map((d) => ({
    date: new Date(NOW.getTime() - (28 - d) * 86400000).toISOString().slice(0, 10),
    weightKg: 82 - d * (0.5 / 7),
  }));
}

describe('weightTrend', () => {
  it('measures a steady cut at about -0.5 kg/week', () => {
    const t = weightTrend(losing(), undefined, NOW)!;
    expect(t.ratePerWeek).toBeLessThan(-0.3);
    expect(t.ratePerWeek).toBeGreaterThan(-0.7);
    expect(t.etaDate).toBeNull(); // no goal set
  });

  it('projects an ETA when moving toward the goal', () => {
    const t = weightTrend(losing(), 78, NOW)!;
    expect(t.etaDate).not.toBeNull();
    expect(t.etaWeeks).toBeGreaterThan(1);
    expect(Date.parse(t.etaDate!)).toBeGreaterThan(NOW.getTime());
  });

  it('gives no ETA when the scale moves away from the goal', () => {
    const t = weightTrend(losing(), 90, NOW)!; // losing but wants to gain
    expect(t.etaDate).toBeNull();
  });

  it('reports "already there" when within half a kilo', () => {
    const t = weightTrend(losing(), 80.1, NOW)!;
    expect(t.etaWeeks).toBe(0);
  });

  it('needs at least a week of data', () => {
    const short: WeighIn[] = [
      { date: '2026-07-04', weightKg: 80 },
      { date: '2026-07-06', weightKg: 79.5 },
    ];
    expect(weightTrend(short, 78, NOW)).toBeNull();
  });

  it('ignores stale history outside the 6-week window', () => {
    const old: WeighIn[] = [
      { date: '2025-01-01', weightKg: 95 },
      { date: '2025-02-01', weightKg: 90 },
    ];
    expect(weightTrend(old, 78, NOW)).toBeNull();
  });
});

describe('daysSinceWeighIn', () => {
  it('counts days from the latest entry', () => {
    expect(daysSinceWeighIn([{ date: '2026-06-26', weightKg: 80 }], NOW)).toBe(10);
  });
  it('is null with no entries', () => {
    expect(daysSinceWeighIn([], NOW)).toBeNull();
  });
});
