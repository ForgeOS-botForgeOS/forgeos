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
}

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
