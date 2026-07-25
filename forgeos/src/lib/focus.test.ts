import { describe, it, expect } from 'vitest';
import { focusProgress, focusTarget, pendingSets } from './focus';
import type { SetEntry, Workout } from '../types';

function set(id: string, weightKg: number, reps: number, completed = false): SetEntry {
  return { id, weightKg, reps, completed };
}

function session(): Workout {
  return {
    id: 'w1',
    name: 'Push day',
    date: '2026-07-25T10:00:00.000Z',
    completed: false,
    exercises: [
      { id: 'we1', exerciseId: 'bench', sets: [set('s1', 80, 8, true), set('s2', 80, 8)] },
      { id: 'we2', exerciseId: 'ohp', sets: [set('s3', 45, 10), set('s4', 45, 10)] },
    ],
  };
}

describe('pendingSets', () => {
  it('returns nothing when there is no live session', () => {
    expect(pendingSets(null)).toEqual([]);
  });

  it('lists uncompleted sets in the order they will be done', () => {
    const queue = pendingSets(session());

    expect(queue.map((p) => p.set.id)).toEqual(['s2', 's3', 's4']);
    expect(queue[0].exerciseIndex).toBe(0);
    expect(queue[0].setIndex).toBe(1);
    expect(queue[1].exercise.id).toBe('we2');
  });

  it('is empty once every set is completed', () => {
    const w = session();
    const done: Workout = {
      ...w,
      exercises: w.exercises.map((we) => ({ ...we, sets: we.sets.map((s) => ({ ...s, completed: true })) })),
    };

    expect(pendingSets(done)).toEqual([]);
  });
});

describe('focusTarget', () => {
  it('picks the head of the queue by default', () => {
    expect(focusTarget(session())?.set.id).toBe('s2');
  });

  it('prefers the exercise you tapped', () => {
    expect(focusTarget(session(), 'we2')?.set.id).toBe('s3');
  });

  it('falls back to the queue when the preferred exercise has no sets left', () => {
    const w = session();
    const finishedFirst: Workout = {
      ...w,
      exercises: [{ ...w.exercises[0], sets: w.exercises[0].sets.map((s) => ({ ...s, completed: true })) }, w.exercises[1]],
    };

    expect(focusTarget(finishedFirst, 'we1')?.set.id).toBe('s3');
  });

  it('returns null when nothing is pending', () => {
    expect(focusTarget(null)).toBeNull();
  });
});

describe('focusProgress', () => {
  it('counts completed sets and their volume only', () => {
    const p = focusProgress(session());

    expect(p.doneSets).toBe(1);
    expect(p.totalSets).toBe(4);
    expect(p.volumeKg).toBe(640);
    expect(p.pct).toBe(25);
  });

  it('never divides by zero on an empty session', () => {
    expect(focusProgress(null)).toEqual({ doneSets: 0, totalSets: 0, volumeKg: 0, pct: 0 });
  });
});
