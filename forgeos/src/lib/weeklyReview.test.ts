import { describe, expect, test } from 'vitest';
import type { PR, Workout } from '../types';
import { buildWeeklyReview, weekStart } from './weeklyReview';

// Wed 2026-07-15 12:00 local — reviewed week is Mon 2026-07-06 … Sun 2026-07-12.
const NOW = new Date(2026, 6, 15, 12, 0, 0).getTime();

function workout(date: string, volumeKg: number): Workout {
  return { id: date, name: 'W', date, completed: true, exercises: [], totalVolumeKg: volumeKg };
}

function pr(date: string, exerciseName: string, weightKg: number): PR {
  return { id: date + exerciseName, exerciseId: 'x', exerciseName, weightKg, reps: 5, e1rm: weightKg * 1.15, date };
}

describe('weekStart', () => {
  test('finds the Monday of the current week', () => {
    expect(weekStart(NOW).getDay()).toBe(1);
    expect(weekStart(NOW).getDate()).toBe(13);
  });

  test('a Monday is its own week start', () => {
    const monday = new Date(2026, 6, 13, 8, 0).getTime();
    expect(weekStart(monday).getDate()).toBe(13);
  });
});

describe('buildWeeklyReview', () => {
  test('null when the reviewed week had no workouts', () => {
    expect(buildWeeklyReview([workout(new Date(2026, 6, 14, 18, 0).toISOString(), 5000)], [], [], NOW)).toBeNull();
  });

  test('sums the reviewed week and compares against the week before', () => {
    const history = [
      workout(new Date(2026, 6, 7, 18, 0).toISOString(), 6000), // reviewed week (Tue)
      workout(new Date(2026, 6, 10, 18, 0).toISOString(), 4000), // reviewed week (Fri)
      workout(new Date(2026, 6, 1, 18, 0).toISOString(), 8000), // week before
    ];
    const review = buildWeeklyReview(history, [], [], NOW);
    expect(review).not.toBeNull();
    expect(review?.sessions).toBe(2);
    expect(review?.volumeKg).toBe(10000);
    expect(review?.volumeDeltaPct).toBe(25); // 10000 vs 8000
  });

  test('picks the heaviest PR of the week as best set', () => {
    const history = [workout(new Date(2026, 6, 8, 18, 0).toISOString(), 5000)];
    const prs = [
      pr(new Date(2026, 6, 8, 18, 0).toISOString(), 'Bench', 100),
      pr(new Date(2026, 6, 10, 18, 0).toISOString(), 'Squat', 140),
      pr(new Date(2026, 6, 1, 18, 0).toISOString(), 'Deadlift', 180), // previous week — excluded
    ];
    const review = buildWeeklyReview(history, prs, [], NOW);
    expect(review?.prCount).toBe(2);
    expect(review?.bestSet).toEqual({ exerciseName: 'Squat', weightKg: 140 });
  });

  test('always produces a focus key', () => {
    const review = buildWeeklyReview([workout(new Date(2026, 6, 8, 18, 0).toISOString(), 5000)], [], [], NOW);
    expect(review?.focusKey).toMatch(/^wr\.focus\./);
  });
});
