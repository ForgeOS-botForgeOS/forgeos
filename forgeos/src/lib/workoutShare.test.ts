import { describe, it, expect } from 'vitest';
import { encodeWorkout, decodeWorkout, sharedToExercises } from './workoutShare';
import type { Workout } from '../types';

const workout: Workout = {
  id: 'w1',
  name: 'Push day',
  date: '2026-07-08T10:00:00.000Z',
  exercises: [
    {
      id: 'we1',
      exerciseId: 'bench-press',
      supersetGroup: 'grp-abc',
      restPresetSec: 120,
      sets: [
        { id: 's1', weightKg: 60, reps: 8, rpe: 8, completed: true },
        { id: 's2', weightKg: 65, reps: 6, rpe: 9, completed: true },
      ],
    },
    {
      id: 'we2',
      exerciseId: 'triceps-pushdown',
      supersetGroup: 'grp-abc',
      sets: [{ id: 's3', weightKg: 30, reps: 12, completed: true }],
    },
  ],
  completed: true,
  totalVolumeKg: 1230,
};

describe('workout share round-trip', () => {
  it('encodes and decodes the name, exercises, sets and reps', () => {
    const shared = decodeWorkout(encodeWorkout(workout));
    expect(shared?.name).toBe('Push day');
    expect(shared?.exercises).toHaveLength(2);
    expect(shared?.exercises[0].exerciseId).toBe('bench-press');
    expect(shared?.exercises[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 8], [65, 6]]);
  });

  it('drops local ids, dates and totals from the payload', () => {
    const shared = decodeWorkout(encodeWorkout(workout))!;
    const json = JSON.stringify(shared);
    expect(json).not.toContain('w1');
    expect(json).not.toContain('grp-abc');
    expect(json).not.toContain('2026-07-08');
    expect(json).not.toContain('1230');
  });

  it('returns null for a garbage code', () => {
    expect(decodeWorkout('not-valid-base64!!')).toBeNull();
  });

  it('returns null when the payload is the wrong shape', () => {
    const bad = btoa(JSON.stringify({ hello: 'world' })).replace(/=+$/, '');
    expect(decodeWorkout(bad)).toBeNull();
  });
});

describe('sharedToExercises', () => {
  it('rebuilds fresh ids and resets every set to uncompleted', () => {
    const shared = decodeWorkout(encodeWorkout(workout))!;
    const exercises = sharedToExercises(shared);
    expect(exercises).toHaveLength(2);
    expect(exercises[0].id).not.toBe('we1');
    expect(exercises.every((e) => e.sets.every((s) => !s.completed))).toBe(true);
    expect(exercises[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 8], [65, 6]]);
  });

  it('re-links superset groups: two exercises that were paired stay paired', () => {
    const shared = decodeWorkout(encodeWorkout(workout))!;
    const [a, b] = sharedToExercises(shared);
    expect(a.supersetGroup).toBeTruthy();
    expect(a.supersetGroup).toBe(b.supersetGroup);
  });
});
