import { describe, expect, it } from 'vitest';
import {
  bySlot, energyBalance, gramsFor, lastDays, macroSplit, mealSlot, proteinDense, remaining, sugarCheck,
  sumEntries, topSources, weekSummary,
} from './calInfo';
import type { FoodEntry } from '../types';

let n = 0;
const e = (date: string, calories: number, p = 0, c = 0, f = 0, sugar = 0, name = `food${++n}`): FoodEntry =>
  ({ id: String(n), name, calories, proteinG: p, carbsG: c, fatG: f, sugarG: sugar, date, source: 'manual' });

const macros = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 67 };

describe('today', () => {
  it('sums the log and shows what is left, negative when over', () => {
    const t = sumEntries([e('2026-10-12T08:00:00Z', 500, 30, 50, 20, 10), e('2026-10-12T13:00:00Z', 1700, 130, 160, 50)]);
    expect(t).toEqual({ calories: 2200, proteinG: 160, carbsG: 210, fatG: 70, sugarG: 10 });
    expect(remaining(t, macros)).toEqual({ calories: -200, proteinG: -10, carbsG: -10, fatG: -3 });
  });

  it('splits calories by macro using 4/4/9, and never divides by zero', () => {
    expect(macroSplit({ proteinG: 100, carbsG: 100, fatG: 0 })).toEqual({ protein: 50, carbs: 50, fat: 0 });
    expect(macroSplit({ proteinG: 0, carbsG: 0, fatG: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 });
    const s = macroSplit({ proteinG: 150, carbsG: 200, fatG: 67 });
    expect(s.protein + s.carbs + s.fat).toBeGreaterThanOrEqual(99);
  });

  it('buckets entries by the hour they were logged', () => {
    const at = (h: number) => { const d = new Date(2026, 9, 12, h, 0); return d.toISOString(); };
    expect(mealSlot(at(7))).toBe('breakfast');
    expect(mealSlot(at(12))).toBe('lunch');
    expect(mealSlot(at(16))).toBe('snack');
    expect(mealSlot(at(19))).toBe('dinner');
    expect(mealSlot(at(23))).toBe('late');
    expect(mealSlot(at(2))).toBe('late');
    expect(bySlot([e(at(7), 400), e(at(8), 100), e(at(19), 700)])).toEqual({ breakfast: 500, lunch: 0, snack: 0, dinner: 700, late: 0 });
  });

  it('names the biggest sources with their share', () => {
    const top = topSources([e('x', 100, 0, 0, 0, 0, 'apple'), e('x', 600, 0, 0, 0, 0, 'pizza'), e('x', 300, 0, 0, 0, 0, 'rice')], 2);
    expect(top).toEqual([{ name: 'pizza', calories: 600, pct: 60 }, { name: 'rice', calories: 300, pct: 30 }]);
    expect(topSources([])).toEqual([]);
  });

  it('checks sugar against the WHO 10% / 5% guidance', () => {
    expect(sugarCheck(20, 2000)).toEqual({ limitG: 50, idealG: 25, level: 'ok' });
    expect(sugarCheck(40, 2000).level).toBe('high');
    expect(sugarCheck(60, 2000).level).toBe('over');
  });
});

describe('the week', () => {
  const log = [
    e('2026-10-12T09:00:00Z', 1000), e('2026-10-12T19:00:00Z', 1000), // 2000, on target
    e('2026-10-10T12:00:00Z', 2500), // over the 10% band
    e('2026-10-01T12:00:00Z', 9999), // outside the week
  ];

  it('returns a point for each of the last 7 days, oldest first, empty days included', () => {
    const pts = lastDays(log, 2000, '2026-10-12');
    expect(pts.map((p) => p.date)).toEqual(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
    expect(pts[6]).toEqual({ date: '2026-10-12', calories: 2000, logged: true, onTarget: true });
    expect(pts[4]).toMatchObject({ calories: 2500, logged: true, onTarget: false });
    expect(pts[0]).toMatchObject({ calories: 0, logged: false, onTarget: false });
  });

  it('crosses month boundaries', () => {
    expect(lastDays([], 2000, '2026-03-02', 3).map((p) => p.date)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('averages only logged days', () => {
    expect(weekSummary(lastDays(log, 2000, '2026-10-12'))).toEqual({ daysLogged: 2, daysOnTarget: 1, avgCalories: 2250 });
    expect(weekSummary(lastDays([], 2000, '2026-10-12'))).toEqual({ daysLogged: 0, daysOnTarget: 0, avgCalories: 0 });
  });
});

describe('reference numbers', () => {
  it('turns the daily gap into kg per week', () => {
    expect(energyBalance(2000, 2550)).toEqual({ dailyDiff: -550, kgPerWeek: -0.5 });
    expect(energyBalance(2500, 2500)).toEqual({ dailyDiff: 0, kgPerWeek: 0 });
  });

  it('knows what 100 kcal of a food weighs', () => {
    expect(gramsFor('olive oil')).toBe(11);
    expect(gramsFor('broccoli')).toBe(294);
    expect(gramsFor('unobtainium')).toBeNull();
  });

  it('lists the most protein-dense foods without synonyms twice', () => {
    const d = proteinDense(6);
    expect(d).toHaveLength(6);
    for (let i = 1; i < d.length; i++) expect(d[i - 1].proteinPer100kcal).toBeGreaterThanOrEqual(d[i].proteinPer100kcal);
    expect(new Set(d.map((x) => x.proteinPer100kcal)).size).toBe(6);
  });
});
