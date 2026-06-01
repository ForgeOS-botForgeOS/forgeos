import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FoodEntry } from '../types';

const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = () => new Date().toISOString().slice(0, 10);

export interface SavedMeal {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
}

interface NutritionState {
  log: FoodEntry[];
  water: Record<string, number>; // dateKey -> ml
  savedMeals: SavedMeal[];
  addEntry: (e: Omit<FoodEntry, 'id' | 'date'> & { date?: string }) => void;
  removeEntry: (id: string) => void;
  todaysEntries: () => FoodEntry[];
  todaysTotals: () => { calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number };
  addWater: (ml: number) => void;
  todaysWaterMl: () => number;
  saveMeal: (m: Omit<SavedMeal, 'id'>) => void;
  removeSavedMeal: (id: string) => void;
  learned: Record<string, SavedMeal>;
  learn: (m: Omit<SavedMeal, 'id'>) => void;
  getLearned: (name: string) => SavedMeal | null;
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const useNutrition = create<NutritionState>()(
  persist(
    (set, get) => ({
      log: [],
      water: {},
      savedMeals: [],
      addEntry: (e) =>
        set({ log: [{ id: uid(), date: e.date ?? new Date().toISOString(), ...e }, ...get().log] }),
      removeEntry: (id) => set({ log: get().log.filter((x) => x.id !== id) }),
      addWater: (ml) => {
        const k = todayKey();
        set({ water: { ...get().water, [k]: Math.max(0, (get().water[k] ?? 0) + ml) } });
      },
      todaysWaterMl: () => get().water[todayKey()] ?? 0,
      saveMeal: (m) => {
        if (get().savedMeals.some((s) => s.name === m.name)) return;
        set({ savedMeals: [{ id: uid(), ...m }, ...get().savedMeals] });
      },
      removeSavedMeal: (id) => set({ savedMeals: get().savedMeals.filter((s) => s.id !== id) }),
      learned: {},
      // Remember a (corrected) food so future scans of the same name auto-apply it.
      learn: (m) => {
        const key = normalize(m.name);
        if (!key) return;
        set({ learned: { ...get().learned, [key]: { id: key, ...m } } });
      },
      getLearned: (name) => {
        const key = normalize(name);
        const lm = get().learned;
        if (lm[key]) return lm[key];
        // loose match: a learned name contained in the scanned name (or vice-versa)
        const hit = Object.keys(lm).find((k) => k.length > 3 && (key.includes(k) || k.includes(key)));
        return hit ? lm[hit] : null;
      },
      todaysEntries: () => {
        const today = new Date().toISOString().slice(0, 10);
        return get().log.filter((e) => e.date.slice(0, 10) === today);
      },
      todaysTotals: () =>
        get()
          .todaysEntries()
          .reduce(
            (a, e) => ({
              calories: a.calories + e.calories,
              proteinG: a.proteinG + e.proteinG,
              carbsG: a.carbsG + e.carbsG,
              fatG: a.fatG + e.fatG,
              sugarG: a.sugarG + e.sugarG,
            }),
            { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 },
          ),
    }),
    { name: 'forge-nutrition' },
  ),
);
