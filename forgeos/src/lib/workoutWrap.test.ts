import { describe, expect, it } from 'vitest';
import { buildWorkoutWrap, pickEquivalent, timeOfDay, type WrapArchetype } from './workoutWrap';
import { WRAP_EN, WRAP_SK } from './wrapCopy';
import type { PR, Workout } from '../types';

let n = 0;
const lift = (date: string, sets: [number, number][], over: Partial<Workout> = {}): Workout => ({
  id: `w${++n}`, name: 'Push Day', date, completed: true, durationSec: 50 * 60,
  exercises: [{ id: `e${n}`, exerciseId: 'pow-3', sets: sets.map(([kg, reps], i) => ({ id: `s${n}-${i}`, weightKg: kg, reps, completed: true })) }],
  ...over,
});
const tens = (kg: number): [number, number][] => [[kg, 10], [kg, 10], [kg, 10]];

describe('workout wrap', () => {
  it('calls the very first session Day One', () => {
    const w = lift('2026-11-02T18:00:00', tens(60));
    expect(buildWorkoutWrap(w, [w], []).archetype).toBe('firstEver');
  });

  it('crowns a PR day and lists the records from that day only', () => {
    const a = lift('2026-11-01T18:00:00', tens(60));
    const b = lift('2026-11-03T18:00:00', [[100, 3], [90, 8]]);
    const prs: PR[] = [
      { id: 'p1', exerciseId: 'pow-3', exerciseName: 'Bench Press', weightKg: 100, reps: 3, e1rm: 110, date: '2026-11-03T18:40:00' },
      { id: 'p0', exerciseId: 'pow-3', exerciseName: 'Bench Press', weightKg: 80, reps: 5, e1rm: 90, date: '2026-10-01T18:00:00' },
    ];
    const wrap = buildWorkoutWrap(b, [a, b], prs);
    expect(wrap.archetype).toBe('pr');
    expect(wrap.prs).toEqual([{ name: 'Bench Press', weightKg: 100, reps: 3 }]);
    expect(wrap.slides).toContain('prs');
    expect(wrap.topSet).toMatchObject({ name: 'Bench Press', weightKg: 100, reps: 3 });
  });

  it('welcomes a comeback after ten days off and shows the gap', () => {
    const a = lift('2026-10-01T18:00:00', tens(60));
    const b = lift('2026-10-15T18:00:00', tens(60));
    const wrap = buildWorkoutWrap(b, [a, b], []);
    expect(wrap.archetype).toBe('comeback');
    expect(wrap.daysSincePrevious).toBe(14);
    expect(wrap.slides).toContain('comeback');
  });

  it('tells heavy, big-volume, long and quick days apart', () => {
    const base = lift('2026-11-01T18:00:00', tens(60));
    const heavy = lift('2026-11-03T18:00:00', [[100, 3], [100, 3], [100, 3]]);
    const big = lift('2026-11-03T18:00:00', [[60, 10], [60, 10], [60, 10], [60, 10], [60, 10]]);
    const long = lift('2026-11-03T18:00:00', tens(55), { durationSec: 90 * 60 });
    const quick = lift('2026-11-03T18:00:00', tens(55), { durationSec: 25 * 60 });
    const kinds: WrapArchetype[] = [heavy, big, long, quick].map((w) => buildWorkoutWrap(w, [base, w], []).archetype);
    expect(kinds).toEqual(['heavy', 'volume', 'marathon', 'quick']);
  });

  it('compares with the last session of the same name', () => {
    const a = lift('2026-11-01T18:00:00', tens(50));
    const b = lift('2026-11-03T18:00:00', tens(55));
    const wrap = buildWorkoutWrap(b, [a, b], []);
    expect(wrap.versus).toEqual({ deltaPct: 10, history: [1500, 1650] });
  });

  it('wraps cardio by distance and pace, and spots a further run', () => {
    const run = (date: string, km: number, min: number): Workout => ({ id: `c${++n}`, name: 'Run', date, completed: true, exercises: [], cardio: { machine: 'Treadmill', distanceKm: km, durationMin: min } });
    const a = run('2026-11-01T07:00:00', 5, 30);
    const b = run('2026-11-03T07:00:00', 6, 33);
    const wrap = buildWorkoutWrap(b, [a, b], []);
    expect(wrap.kind).toBe('cardio');
    expect(wrap.archetype).toBe('cardioFar');
    expect(wrap.cardio).toMatchObject({ distanceKm: 6, paceSecPerKm: 330, deltaPct: 20 });
    expect(wrap.slides).toEqual(['intro', 'cardio', 'outro']);
  });

  it('wraps a watch-only session by its duration', () => {
    const a = lift('2026-11-01T18:00:00', tens(60));
    const watch: Workout = { id: 'g1', name: 'Garmin strength', date: '2026-11-02T18:00:00', completed: true, exercises: [], durationSec: 42 * 60 };
    const wrap = buildWorkoutWrap(watch, [a, watch], []);
    expect(wrap).toMatchObject({ kind: 'watch', archetype: 'watch', durationMin: 42 });
  });

  it('never wraps two workouts identically: the id varies colours and lines', () => {
    const base = lift('2026-11-01T18:00:00', tens(60));
    const wraps = Array.from({ length: 12 }, () => lift('2026-11-03T18:00:00', tens(60))).map((w) => buildWorkoutWrap(w, [base, w], []));
    expect(new Set(wraps.map((w) => w.palette.from)).size).toBeGreaterThan(3);
    expect(new Set(wraps.map((w) => w.variant)).size).toBe(3);
  });

  it('picks a fun comparison the volume can actually carry', () => {
    expect(pickEquivalent(300, 1)).toBeUndefined();
    const eq = pickEquivalent(9000, 2)!;
    expect(9000 / { car: 1500, hippo: 2500, elephant: 6000, trex: 8000 }[eq.key as 'car']).toBeGreaterThanOrEqual(1);
  });

  it('names the time of day', () => {
    expect([5, 9, 12, 15, 19, 23].map((h) => timeOfDay(new Date(2026, 10, 3, h)))).toEqual(['dawn', 'morning', 'lunch', 'afternoon', 'evening', 'night']);
  });

  it('has every line in English and Slovak', () => {
    const archetypes: WrapArchetype[] = ['firstEver', 'pr', 'comeback', 'heavy', 'volume', 'marathon', 'quick', 'balanced', 'cardioFar', 'cardioFast', 'cardioSteady', 'watch'];
    for (const a of archetypes) for (const k of ['title', 'l0', 'l1', 'l2']) {
      expect(WRAP_EN[`ww.arch.${a}.${k}`], `${a}.${k}`).toBeTruthy();
      expect(WRAP_SK[`ww.arch.${a}.${k}`], `${a}.${k} sk`).toBeTruthy();
    }
    expect(Object.keys(WRAP_SK).sort()).toEqual(Object.keys(WRAP_EN).sort());
  });
});
