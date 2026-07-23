import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exercise } from '../types';

// User-created exercises. They live alongside the built-in catalogue: every
// picker lists them, plans reference them by id, and the workout logger
// treats them like any other exercise. Ids are prefixed 'cus-' so lookups
// can tell them apart from catalogue ids.

interface ExerciseState {
  custom: Exercise[];
  favouriteIds: string[]; // exercise ids the user pinned — surfaced first in the picker
  addCustom: (ex: Omit<Exercise, 'id'>) => Exercise;
  updateCustom: (id: string, patch: Partial<Exercise>) => void;
  removeCustom: (id: string) => void;
  toggleFavourite: (id: string) => void;
}

const uid = () => `cus-${Math.random().toString(36).slice(2, 10)}`;

export const useExercises = create<ExerciseState>()(
  persist(
    (set, get) => ({
      custom: [],
      favouriteIds: [],

      toggleFavourite: (id) => set({
        favouriteIds: get().favouriteIds.includes(id)
          ? get().favouriteIds.filter((x) => x !== id)
          : [...get().favouriteIds, id],
      }),

      addCustom: (ex) => {
        const created: Exercise = { ...ex, id: uid() };
        set({ custom: [created, ...get().custom] });
        return created;
      },

      updateCustom: (id, patch) =>
        set({ custom: get().custom.map((e) => (e.id === id ? { ...e, ...patch, id } : e)) }),

      removeCustom: (id) => set({ custom: get().custom.filter((e) => e.id !== id) }),
    }),
    { name: 'forge-exercises' },
  ),
);
