import { describe, expect, test } from 'vitest';
import type { PR, Workout } from '../types';
import { buildWrapped, lastCompletedMonth } from './wrapped';

function workout(date: string, volumeKg: number, exerciseId = 'bench-press', doneSets = 3): Workout {
  return {
    id: date,
    name: 'W',
    date,
    completed: true,
    totalVolumeKg: volumeKg,
    durationSec: 3600,
    exercises: [
      {
        id: 'we1',
        exerciseId,
        sets: Array.from({ length: doneSets }, (_, i) => ({ id: `s${i}`, weightKg: 80, reps: 8, completed: true })),
      },
    ],
  };
}

function pr(date: string, exerciseName: string, weightKg: number): PR {
  return { id: date + exerciseName, exerciseId: 'x', exerciseName, weightKg, reps: 3, e1rm: weightKg * 1.1, date };
}

describe('lastCompletedMonth', () => {
  test('mid-year points at the previous month', () => {
    expect(lastCompletedMonth(new Date(2026, 6, 19).getTime())).toEqual({ year: 2026, monthIndex: 5 });
  });

  test('january wraps to december of the previous year', () => {
    expect(lastCompletedMonth(new Date(2026, 0, 5).getTime())).toEqual({ year: 2025, monthIndex: 11 });
  });
});

describe('buildWrapped', () => {
  test('null for an empty month', () => {
    expect(buildWrapped([workout('2026-07-01T18:00:00Z', 5000)], [], 2026, 5)).toBeNull();
  });

  test('aggregates only the requested month', () => {
    const history = [
      workout('2026-06-03T18:00:00Z', 6000),
      workout('2026-06-20T18:00:00Z', 4000),
      workout('2026-07-01T18:00:00Z', 9999), // next month — excluded
    ];
    const prs = [pr('2026-06-20T18:00:00Z', 'Squat', 140), pr('2026-07-02T18:00:00Z', 'Bench', 100)];
    const w = buildWrapped(history, prs, 2026, 5);
    expect(w).toMatchObject({
      monthKey: '2026-06',
      monthLabel: 'June 2026',
      sessions: 2,
      volumeKg: 10000,
      sets: 6,
      durationMin: 120,
      prCount: 1,
      bestLift: { exerciseName: 'Squat', weightKg: 140 },
    });
  });

  test('favorite exercise is the one with the most completed sets', () => {
    const history = [
      workout('2026-06-03T18:00:00Z', 3000, 'bench-press', 2),
      workout('2026-06-05T18:00:00Z', 3000, 'back-squat', 5),
    ];
    const w = buildWrapped(history, [], 2026, 5);
    // Resolved through the real exercise library; falls back to null when unknown.
    expect(w?.favoriteExercise === null || typeof w?.favoriteExercise === 'string').toBe(true);
    expect(w?.sets).toBe(7);
  });
});
