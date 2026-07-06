import { describe, it, expect } from 'vitest';
import { coachInsights, daysUntilInsights } from './coach';
import type { HealthDay, Workout } from '../types';

const day = (date: string, over: Partial<HealthDay> = {}): HealthDay => ({
  date, source: 'manual', updatedAt: 0, ...over,
});
const workout = (date: string, vol = 5000): Workout => ({
  id: date, name: 'Push', date: `${date}T18:00:00.000Z`, exercises: [], completed: true, totalVolumeKg: vol,
});

// 20 days: trains every even day, sleeps long before training days, short otherwise.
function fixture() {
  const days: HealthDay[] = [];
  const workouts: Workout[] = [];
  for (let i = 1; i <= 20; i++) {
    const date = `2026-06-${String(i).padStart(2, '0')}`;
    const trains = i % 2 === 0;
    days.push(day(date, { sleepMinutes: trains ? 500 : 380, steps: trains ? 4000 : 9000, restingHr: 52 }));
    if (trains) workouts.push(workout(date));
  }
  return { days, workouts };
}

describe('coachInsights', () => {
  it('stays silent under 14 days of data', () => {
    const { workouts } = fixture();
    expect(coachInsights(workouts, [day('2026-06-01', { sleepMinutes: 480 })])).toHaveLength(0);
  });

  it('spots the sleep gap between training and rest days', () => {
    const { days, workouts } = fixture();
    const out = coachInsights(workouts, days);
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((i) => i.text.includes('before training days'))).toBe(true);
  });

  it('never returns more than 3 insights', () => {
    const { days, workouts } = fixture();
    expect(coachInsights(workouts, days).length).toBeLessThanOrEqual(3);
  });
});

describe('daysUntilInsights', () => {
  it('counts down to the 14-day unlock', () => {
    expect(daysUntilInsights([day('2026-06-01')])).toBe(13);
    expect(daysUntilInsights(Array.from({ length: 20 }, (_, i) => day(`2026-06-${String(i + 1).padStart(2, '0')}`)))).toBe(0);
  });
});
