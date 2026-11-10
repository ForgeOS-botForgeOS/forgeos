import { describe, expect, it } from 'vitest';
import type { WeekPlan } from '../types';
import { last7DaysVolume, todayFocus } from './homeDash';

// A Monday, 10:00 local.
const MON = new Date(2026, 10, 9, 10, 0, 0);
const at = (daysBack: number, volume: number) => {
  const d = new Date(MON.getTime());
  d.setDate(d.getDate() - daysBack);
  return { date: d.toISOString(), totalVolumeKg: volume };
};

describe('last7DaysVolume', () => {
  it('ends on today and is not empty on a Monday', () => {
    const out = last7DaysVolume([at(0, 1000), at(2, 500), at(2, 250)], MON);
    expect(out.map((b) => b.day)).toEqual(['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']);
    expect(out[6]).toEqual({ day: 'Mon', volume: 1000, today: true });
    expect(out[4].volume).toBe(750);
  });
  it('leaves out anything older than seven days, and unreadable dates', () => {
    const out = last7DaysVolume([at(7, 999), { date: 'nope', totalVolumeKg: 5 }], MON);
    expect(out.reduce((a, b) => a + b.volume, 0)).toBe(0);
  });
});

describe('todayFocus', () => {
  const plan = {
    days: [
      { day: 'Mon', label: 'Push', exerciseIds: ['a', 'b', 'c'], rest: false },
      { day: 'Tue', label: 'Rest', exerciseIds: [], rest: true },
    ],
  } as unknown as WeekPlan;
  it('names the planned session', () => {
    expect(todayFocus(plan, false, MON)).toEqual({ kind: 'session', label: 'Push', exercises: 3 });
  });
  it('says so when today is a rest day', () => {
    const tue = new Date(2026, 10, 10, 10);
    expect(todayFocus(plan, false, tue)).toEqual({ kind: 'rest' });
  });
  it('a logged session wins over the plan', () => {
    expect(todayFocus(plan, true, MON)).toEqual({ kind: 'done' });
  });
  it('is open when nothing is planned', () => {
    expect(todayFocus(null, false, MON)).toEqual({ kind: 'open' });
    expect(todayFocus(plan, false, new Date(2026, 10, 11, 10))).toEqual({ kind: 'open' });
  });
});
