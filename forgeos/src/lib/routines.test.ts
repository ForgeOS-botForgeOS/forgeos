import { describe, expect, it } from 'vitest';
import type { Workout } from '../types';
import {
  ROUTINE_NAME_MAX,
  cleanRoutineName,
  markRoutineUsed,
  routineFromWorkout,
  routinesFromFavourites,
  sortRoutines,
  suggestRoutineName,
} from './routines';

const set = (weightKg: number, reps: number, completed = true) => ({ id: `s${weightKg}-${reps}`, weightKg, reps, completed });

const workout = (over: Partial<Workout> = {}): Workout => ({
  id: 'w1',
  name: 'Push',
  date: '2026-09-01T10:00:00.000Z',
  completed: true,
  exercises: [
    { id: 'we1', exerciseId: 'bench', sets: [set(60, 8), set(70, 6)] },
    { id: 'we2', exerciseId: 'ohp', sets: [set(40, 8)] },
  ],
  ...over,
});

const nameOf = (id: string) => ({ bench: 'Bench Press', ohp: 'Overhead Press' })[id];

describe('routineFromWorkout', () => {
  it('keeps the movements in order with a target per exercise', () => {
    const r = routineFromWorkout(workout(), 'Monday Push', 'r1');
    expect(r.exerciseIds).toEqual(['bench', 'ohp']);
    expect(r.targets.bench).toEqual({ sets: 2, reps: 6, weightKg: 70 });
    expect(r.name).toBe('Monday Push');
    expect(r.uses).toBe(0);
    expect(r.sourceWorkoutId).toBe('w1');
  });

  it('takes the target from the heaviest completed set, not a back-off set', () => {
    const w = workout({ exercises: [{ id: 'we1', exerciseId: 'bench', sets: [set(100, 3), set(60, 12)] }] });
    expect(routineFromWorkout(w, 'x', 'r').targets.bench).toEqual({ sets: 2, reps: 3, weightKg: 100 });
  });

  it('ignores sets that were never completed when any set was', () => {
    const w = workout({ exercises: [{ id: 'we1', exerciseId: 'bench', sets: [set(60, 8), set(200, 1, false)] }] });
    expect(routineFromWorkout(w, 'x', 'r').targets.bench).toEqual({ sets: 1, reps: 8, weightKg: 60 });
  });

  it('falls back to the planned sets when nothing was completed', () => {
    const w = workout({ exercises: [{ id: 'we1', exerciseId: 'bench', sets: [set(60, 8, false)] }] });
    expect(routineFromWorkout(w, 'x', 'r').targets.bench.weightKg).toBe(60);
  });

  it('omits weight for bodyweight movements instead of writing 0', () => {
    const w = workout({ exercises: [{ id: 'we1', exerciseId: 'pullup', sets: [set(0, 10)] }] });
    expect(routineFromWorkout(w, 'x', 'r').targets.pullup).toEqual({ sets: 1, reps: 10 });
  });

  it('never lists the same movement twice', () => {
    const w = workout({ exercises: [
      { id: 'a', exerciseId: 'bench', sets: [set(60, 8)] },
      { id: 'b', exerciseId: 'bench', sets: [set(80, 4)] },
    ] });
    expect(routineFromWorkout(w, 'x', 'r').exerciseIds).toEqual(['bench']);
  });

  it('always ends up with a usable name', () => {
    expect(routineFromWorkout(workout(), '   ', 'r').name).toBe('Routine');
    expect(routineFromWorkout(workout(), 'a'.repeat(200), 'r').name).toHaveLength(ROUTINE_NAME_MAX);
  });
});

describe('cleanRoutineName', () => {
  it('collapses whitespace and caps the length', () => {
    expect(cleanRoutineName('  Leg   day  ')).toBe('Leg day');
    expect(cleanRoutineName('x'.repeat(99))).toHaveLength(ROUTINE_NAME_MAX);
  });
});

describe('suggestRoutineName', () => {
  it('reuses the session name when it is a real name', () => {
    expect(suggestRoutineName(workout(), nameOf)).toBe('Push');
  });

  it('builds a name from the first lift when the session names itself by its numbers', () => {
    const cardio = workout({ name: 'Treadmill · 5km · 30min' });
    expect(suggestRoutineName(cardio, nameOf)).toBe('Bench Press day');
  });

  it('still returns something for an empty session', () => {
    expect(suggestRoutineName(workout({ name: '', exercises: [] }), nameOf)).toBe('My routine');
  });
});

describe('sortRoutines', () => {
  it('puts the most-used first, then the most recently used', () => {
    const base = { exerciseIds: [], targets: {}, createdAt: '2026-01-01T00:00:00.000Z' };
    const list = [
      { ...base, id: 'a', name: 'A', uses: 1, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { ...base, id: 'b', name: 'B', uses: 5, lastUsedAt: '2026-01-01T00:00:00.000Z' },
      { ...base, id: 'c', name: 'C', uses: 1, lastUsedAt: '2026-06-01T00:00:00.000Z' },
    ];
    expect(sortRoutines(list).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the list it was given', () => {
    const list = [{ id: 'a', name: 'A', exerciseIds: [], targets: {}, createdAt: '', uses: 0 }];
    sortRoutines(list);
    expect(list[0].id).toBe('a');
  });
});

describe('markRoutineUsed', () => {
  it('counts the run and stamps the time', () => {
    const r = routineFromWorkout(workout(), 'x', 'r');
    const after = markRoutineUsed(r, '2026-09-05T08:00:00.000Z');
    expect(after.uses).toBe(1);
    expect(after.lastUsedAt).toBe('2026-09-05T08:00:00.000Z');
    expect(r.uses).toBe(0); // original untouched
  });
});

describe('routinesFromFavourites', () => {
  let n = 0;
  const makeId = () => `r${++n}`;

  it('turns every starred session into a named routine', () => {
    const history = [workout({ id: 'w1', name: 'Push' }), workout({ id: 'w2', name: 'Pull' })];
    const out = routinesFromFavourites(['w1', 'w2'], history, nameOf, makeId);
    expect(out.map((r) => r.name)).toEqual(['Push', 'Pull']);
  });

  it('skips a favourite whose workout is gone, rather than crashing', () => {
    expect(routinesFromFavourites(['missing'], [workout()], nameOf, makeId)).toEqual([]);
  });

  it('skips an empty session that would make a routine with nothing in it', () => {
    const empty = workout({ id: 'w9', exercises: [] });
    expect(routinesFromFavourites(['w9'], [empty], nameOf, makeId)).toEqual([]);
  });
});
