import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FoodEntry } from '../types';

const uid = () => Math.random().toString(36).slice(2, 10);

interface NutritionState {
  log: FoodEntry[];
  addEntry: (e: Omit<FoodEntry, 'id' | 'date'> & { date?: string }) => void;
  removeEntry: (id: string) => void;
  todaysEntries: () => FoodEntry[];
  todaysTotals: () => { calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number };
}

export const useNutrition = create<NutritionState>()(
  persist(
    (set, get) => ({
      log: [],
      addEntry: (e) =>
        set({ log: [{ id: uid(), date: e.date ?? new Date().toISOString(), ...e }, ...get().log] }),
      removeEntry: (id) => set({ log: get().log.filter((x) => x.id !== id) }),
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
