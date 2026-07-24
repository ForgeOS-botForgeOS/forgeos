import { describe, it, expect } from 'vitest';
import { prTimelineData, prSeriesByLift, xpCurveData } from './progressCharts';
import type { PR, Workout } from '../types';

const pr = (over: Partial<PR>): PR => ({ id: 'p', exerciseId: 'e', exerciseName: 'Bench', weightKg: 100, reps: 3, e1rm: 108, date: '2026-01-01', ...over } as PR);
const wk = (date: string, vol: number): Workout => ({ id: date, name: 'W', date, exercises: [], totalVolumeKg: vol } as unknown as Workout);

describe('prTimelineData', () => {
  it('maps PRs to time-ordered points', () => {
    const pts = prTimelineData([pr({ date: '2026-02-01' }), pr({ date: '2026-01-01' })]);
    expect(pts[0].t).toBeLessThan(pts[1].t);
    expect(pts[0].exercise).toBe('Bench');
  });
  it('groups by lift into series', () => {
    const series = prSeriesByLift(prTimelineData([pr({ exerciseName: 'Bench' }), pr({ exerciseName: 'Squat' }), pr({ exerciseName: 'Bench' })]));
    expect(series).toHaveLength(2);
    expect(series.find((s) => s.exercise === 'Bench')?.points).toHaveLength(2);
  });
});

describe('xpCurveData', () => {
  it('rises over time and ends exactly at the current XP', () => {
    const curve = xpCurveData([wk('2026-01-01', 1000), wk('2026-01-08', 2000), wk('2026-01-15', 1500)], 5000);
    expect(curve).toHaveLength(3);
    expect(curve[curve.length - 1].xp).toBe(5000);
    expect(curve[0].xp).toBeLessThan(curve[2].xp);
  });
  it('handles no history', () => {
    expect(xpCurveData([], 0)).toEqual([]);
    expect(xpCurveData([], 300)).toHaveLength(1);
  });
});
