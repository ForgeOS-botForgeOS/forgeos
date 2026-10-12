import type { FoodEntry, MacroTargets } from '../types';
import { FOOD_TABLE } from '../data/foodTable';

// The numbers behind the Food tab's Info view. Pure, so every figure the user
// reads is tested; the screen only lays them out.

/** Energy per gram: the labels on every food packet are built from these. */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

/** Roughly what a kilo of body fat stores, the basis of every "deficit to kg" estimate. */
export const KCAL_PER_KG_FAT = 7700;

/** "On target" means within this share of the calorie goal, either side. */
export const ON_TARGET_BAND = 0.1;

export interface Totals { calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number }

const ZERO: Totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 };

export const dayKey = (iso: string) => iso.slice(0, 10);

export function sumEntries(entries: readonly FoodEntry[]): Totals {
  return entries.reduce<Totals>((a, e) => ({
    calories: a.calories + (e.calories || 0),
    proteinG: a.proteinG + (e.proteinG || 0),
    carbsG: a.carbsG + (e.carbsG || 0),
    fatG: a.fatG + (e.fatG || 0),
    sugarG: a.sugarG + (e.sugarG || 0),
  }), ZERO);
}

/** What is left of each target today. Negative = over. */
export function remaining(t: Totals, m: MacroTargets) {
  return {
    calories: Math.round(m.calories - t.calories),
    proteinG: Math.round(m.proteinG - t.proteinG),
    carbsG: Math.round(m.carbsG - t.carbsG),
    fatG: Math.round(m.fatG - t.fatG),
  };
}

/** Share of calories from each macro, in whole percent. Zero eaten = all zero, never NaN. */
export function macroSplit(g: { proteinG: number; carbsG: number; fatG: number }) {
  const p = g.proteinG * KCAL_PER_G.protein;
  const c = g.carbsG * KCAL_PER_G.carbs;
  const f = g.fatG * KCAL_PER_G.fat;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: Math.round((p / total) * 100), carbs: Math.round((c / total) * 100), fat: Math.round((f / total) * 100) };
}

/**
 * Daily gap between the calorie target and maintenance (TDEE), and what it
 * works out to on the scale per week. Negative kg = losing.
 */
export function energyBalance(targetKcal: number, tdeeKcal: number) {
  const dailyDiff = Math.round(targetKcal - tdeeKcal);
  const kgPerWeek = Math.round(((dailyDiff * 7) / KCAL_PER_KG_FAT) * 100) / 100;
  return { dailyDiff, kgPerWeek };
}

export interface DayPoint { date: string; calories: number; logged: boolean; onTarget: boolean }

/** The last `days` calendar days ending on `todayKey`, oldest first, with a point for every day (empty ones too). */
export function lastDays(log: readonly FoodEntry[], targetKcal: number, todayKey: string, days = 7): DayPoint[] {
  const byDay = new Map<string, number>();
  for (const e of log) byDay.set(dayKey(e.date), (byDay.get(dayKey(e.date)) ?? 0) + (e.calories || 0));
  const end = new Date(`${todayKey}T12:00:00Z`);
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const kcal = Math.round(byDay.get(key) ?? 0);
    const logged = byDay.has(key);
    out.push({ date: key, calories: kcal, logged, onTarget: logged && targetKcal > 0 && Math.abs(kcal - targetKcal) <= targetKcal * ON_TARGET_BAND });
  }
  return out;
}

/** Average over the days that have anything logged: an unlogged day is missing data, not a fast. */
export function weekSummary(points: readonly DayPoint[]) {
  const logged = points.filter((p) => p.logged);
  const avg = logged.length ? Math.round(logged.reduce((a, p) => a + p.calories, 0) / logged.length) : 0;
  return { daysLogged: logged.length, daysOnTarget: points.filter((p) => p.onTarget).length, avgCalories: avg };
}

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late';

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast (before 11)',
  lunch: 'Lunch (11 to 15)',
  snack: 'Afternoon (15 to 18)',
  dinner: 'Dinner (18 to 22)',
  late: 'Late night',
};

/** Which part of the day an entry was logged in, by the phone's local clock. */
export function mealSlot(iso: string): MealSlot {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  if (h >= 18 && h < 22) return 'dinner';
  return 'late';
}

export function bySlot(entries: readonly FoodEntry[]): Record<MealSlot, number> {
  const out: Record<MealSlot, number> = { breakfast: 0, lunch: 0, snack: 0, dinner: 0, late: 0 };
  for (const e of entries) out[mealSlot(e.date)] += Math.round(e.calories || 0);
  return out;
}

/** The biggest calorie sources today, with their share of the day. */
export function topSources(entries: readonly FoodEntry[], n = 3) {
  const total = entries.reduce((a, e) => a + (e.calories || 0), 0);
  return [...entries]
    .sort((a, b) => b.calories - a.calories)
    .slice(0, n)
    .map((e) => ({ name: e.name, calories: Math.round(e.calories), pct: total > 0 ? Math.round((e.calories / total) * 100) : 0 }));
}

/**
 * Sugar against the WHO guidance: free sugar under 10 % of energy, ideally
 * under 5 %. The log stores TOTAL sugar (fruit and milk included), so this is
 * an upper bound and the screen says so.
 */
export function sugarCheck(sugarG: number, targetKcal: number) {
  const limitG = Math.round((targetKcal * 0.1) / KCAL_PER_G.carbs);
  const idealG = Math.round((targetKcal * 0.05) / KCAL_PER_G.carbs);
  const level: 'ok' | 'high' | 'over' = sugarG <= idealG ? 'ok' : sugarG <= limitG ? 'high' : 'over';
  return { limitG, idealG, level };
}

/** Grams of a food that make `kcal` calories, from the built-in food table. */
export function gramsFor(food: string, kcal = 100): number | null {
  const row = FOOD_TABLE[food];
  if (!row || row[0] <= 0) return null;
  return Math.round((kcal / row[0]) * 100);
}

/** The foods in the table that give the most protein per 100 kcal: the cutting cheat sheet. */
export function proteinDense(n = 6, minKcal = 40) {
  return Object.entries(FOOD_TABLE)
    .filter(([, r]) => r[0] >= minKcal)
    .map(([name, r]) => ({ name, proteinPer100kcal: Math.round((r[1] / r[0]) * 1000) / 10 }))
    .sort((a, b) => b.proteinPer100kcal - a.proteinPer100kcal || a.name.localeCompare(b.name))
    // Synonyms share a row ("egg"/"eggs", "prawns"/"shrimp"): keep one of each.
    .filter((x, i, arr) => arr.findIndex((y) => y.proteinPer100kcal === x.proteinPer100kcal) === i)
    .slice(0, n);
}
