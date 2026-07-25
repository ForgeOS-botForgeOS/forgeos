import { describe, it, expect } from 'vitest';
import { liftProgression, liftStats } from './exerciseStats';
import { e1rm } from './fitness';
import type { PR, SetEntry, Workout } from '../types';

function set(weightKg: number, reps: number, completed = true): SetEntry {
  return { id: `s-${weightKg}-${reps}-${completed}`, weightKg, reps, completed };
}

function workout(id: string, date: string, exerciseId: string, sets: SetEntry[]): Workout {
  return { id, name: 'Session', date, completed: true, exercises: [{ id: `we-${id}`, exerciseId, sets }] };
}

const HISTORY: Workout[] = [
  workout('w3', '2026-07-20T10:00:00.000Z', 'bench', [set(90, 5), set(90, 4)]),
  workout('w2', '2026-07-13T10:00:00.000Z', 'squat', [set(120, 5)]),
  workout('w1', '2026-07-06T10:00:00.000Z', 'bench', [set(80, 8), set(80, 6), set(60, 10, false)]),
];

const PRS: PR[] = [
  { id: 'p1', exerciseId: 'bench', exerciseName: 'Bench Press', weightKg: 90, reps: 5, e1rm: e1rm(90, 5), date: '2026-07-20' },
  { id: 'p0', exerciseId: 'bench', exerciseName: 'Bench Press', weightKg: 80, reps: 8, e1rm: e1rm(80, 8), date: '2026-07-06' },
  { id: 'p2', exerciseId: 'squat', exerciseName: 'Squat', weightKg: 120, reps: 5, e1rm: e1rm(120, 5), date: '2026-07-13' },
];

describe('liftStats', () => {
  it('returns an empty shape for a lift you have never logged', () => {
    const s = liftStats(HISTORY, PRS, 'deadlift');

    expect(s.sessionCount).toBe(0);
    expect(s.bestSet).toBeNull();
    expect(s.pr).toBeNull();
    expect(s.trendPct).toBeNull();
  });

  it('still surfaces an imported PR when no sessions were logged', () => {
    const s = liftStats([], PRS, 'squat');

    expect(s.sessionCount).toBe(0);
    expect(s.pr?.weightKg).toBe(120);
  });

  it('keeps only this lift and only completed sets', () => {
    const s = liftStats(HISTORY, PRS, 'bench');

    expect(s.sessionCount).toBe(2);
    expect(s.totalSets).toBe(4); // the 60x10 set was never completed
    expect(s.sessions.map((x) => x.workoutId)).toEqual(['w3', 'w1']); // newest first
  });

  it('finds the top set by estimated 1RM, not by weight alone', () => {
    const s = liftStats([workout('a', '2026-07-01T10:00:00.000Z', 'row', [set(100, 1), set(90, 8)])], [], 'row');

    expect(s.bestSet?.weightKg).toBe(90);
    expect(s.bestE1rm).toBeCloseTo(e1rm(90, 8), 5);
  });

  it('sums volume across sessions', () => {
    const s = liftStats(HISTORY, PRS, 'bench');

    // 90*5 + 90*4 + 80*8 + 80*6 = 450 + 360 + 640 + 480
    expect(s.totalVolumeKg).toBe(1930);
  });

  it('reports the strongest PR for the lift', () => {
    expect(liftStats(HISTORY, PRS, 'bench').pr?.id).toBe('p1');
  });

  it('measures the trend from the oldest to the newest session', () => {
    const s = liftStats(HISTORY, PRS, 'bench');

    expect(s.trendPct).toBeGreaterThan(0);
    expect(s.lastSession?.workoutId).toBe('w3');
  });

  it('has no trend from a single session', () => {
    expect(liftStats(HISTORY, PRS, 'squat').trendPct).toBeNull();
  });

  it('orders sessions by date even when history arrives shuffled', () => {
    const shuffled = [HISTORY[2], HISTORY[0]];

    expect(liftStats(shuffled, [], 'bench').sessions.map((s) => s.workoutId)).toEqual(['w3', 'w1']);
  });

  it('folds a lift that appears twice in one session into one row', () => {
    const twice: Workout = {
      id: 'w9',
      name: 'Superset',
      date: '2026-07-24T10:00:00.000Z',
      completed: true,
      exercises: [
        { id: 'a', exerciseId: 'curl', sets: [set(20, 12)] },
        { id: 'b', exerciseId: 'curl', sets: [set(22.5, 10)] },
      ],
    };
    const s = liftStats([twice], [], 'curl');

    expect(s.sessionCount).toBe(1);
    expect(s.totalSets).toBe(2);
    expect(s.bestSet?.weightKg).toBe(22.5);
  });
});

describe('liftProgression', () => {
  it('charts oldest → newest with short dates', () => {
    const points = liftProgression(liftStats(HISTORY, PRS, 'bench'));

    expect(points.map((p) => p.date)).toEqual(['07-06', '07-20']);
    expect(points[1].e1rm).toBeGreaterThan(points[0].e1rm);
  });

  it('is empty for an unlogged lift', () => {
    expect(liftProgression(liftStats(HISTORY, PRS, 'deadlift'))).toEqual([]);
  });
});
