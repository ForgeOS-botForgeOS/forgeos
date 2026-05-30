import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, WeekPlan, WeighIn } from '../types';
import { macrosFor, mifflinStJeor, tdee } from '../lib/fitness';

interface UserState {
  profile: UserProfile | null;
  weekPlan: WeekPlan | null;
  weighIns: WeighIn[];
  setProfile: (p: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  recompute: () => void;
  setWeekPlan: (p: WeekPlan) => void;
  addWeighIn: (kg: number) => void;
  reset: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      weekPlan: null,
      weighIns: [],
      setProfile: (p) => set({ profile: p }),
      updateProfile: (patch) => {
        const cur = get().profile;
        if (!cur) return;
        set({ profile: { ...cur, ...patch } });
        get().recompute();
      },
      recompute: () => {
        const p = get().profile;
        if (!p) return;
        const bmr = mifflinStJeor(p.sex, p.weightKg, p.heightCm, p.age);
        const td = tdee(bmr, p.activity);
        const macros = macrosFor(p.goal, td, p.weightKg);
        set({ profile: { ...p, bmr, tdee: td, macros } });
      },
      setWeekPlan: (p) => set({ weekPlan: p }),
      addWeighIn: (kg) => {
        const today = new Date().toISOString().slice(0, 10);
        const rest = get().weighIns.filter((w) => w.date !== today);
        set({ weighIns: [...rest, { date: today, weightKg: kg }].sort((a, b) => a.date.localeCompare(b.date)) });
        get().updateProfile({ weightKg: kg });
      },
      reset: () => set({ profile: null, weekPlan: null, weighIns: [] }),
    }),
    { name: 'forge-user' },
  ),
);
