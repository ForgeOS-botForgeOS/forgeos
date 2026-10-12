import { describe, expect, it } from 'vitest';
import { GRIP_HINT, GRIP_LABEL, GRIP_POSITIONS, coerceGrip } from './grip';
import { decodeWorkout, encodeWorkout, sharedToExercises } from './workoutShare';
import type { Workout } from '../types';

describe('grip position', () => {
  it('has a label and a hint for every grip', () => {
    for (const g of GRIP_POSITIONS) {
      expect(GRIP_LABEL[g]).toBeTruthy();
      expect(GRIP_HINT[g]).toBeTruthy();
    }
  });

  it('accepts only known grips from outside', () => {
    expect(coerceGrip('neutral')).toBe('neutral');
    for (const bad of ['Neutral', '', 'sideways', 3, null, undefined, {}]) expect(coerceGrip(bad)).toBeUndefined();
  });

  it('survives a share link, and a forged one cannot inject a grip', () => {
    const w: Workout = {
      id: 'w', name: 'Pull day', date: '2026-10-12T10:00:00Z', completed: true,
      exercises: [{ id: 'a', exerciseId: 'bod-1', sets: [{ id: 's', weightKg: 60, reps: 8, completed: true, subKind: 'grip', grip: 'wide' }] }],
    };
    const imported = sharedToExercises(decodeWorkout(encodeWorkout(w))!);
    expect(imported[0].sets[0].grip).toBe('wide');

    const forged = structuredClone(w);
    (forged.exercises[0].sets[0] as { grip?: unknown }).grip = '<img src=x>';
    expect(sharedToExercises(decodeWorkout(encodeWorkout(forged))!)[0].sets[0].grip).toBeUndefined();
  });
});
