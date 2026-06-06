import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyStat, SavedPlan, UserProfile, WeekPlan, WeighIn } from '../types';
import { macrosFor, mifflinStJeor, tdee } from '../lib/fitness';
import { upsertProfile } from '../lib/repositories';

const uid = () => Math.random().toString(36).slice(2, 10);

interface UserState {
  profile: UserProfile | null;
  weekPlan: WeekPlan | null;
  weighIns: WeighIn[];
  bodyStats: BodyStat[];
  savedPlans: SavedPlan[];
  setProfile: (p: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  recompute: () => void;
  setWeekPlan: (p: WeekPlan) => void;
  savePlanAs: (name: string) => void;
  loadPlan: (id: string) => void;
  deletePlan: (id: string) => void;
  addWeighIn: (kg: number) => void;
  addBodyStat: (patch: Partial<BodyStat>) => void;
  reset: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      weekPlan: null,
      weighIns: [],
      bodyStats: [],
      savedPlans: [],
      setProfile: (p) => {
        set({ profile: p });
        void upsertProfile(p); // no-op in mock mode
      },
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
      savePlanAs: (name) => {
        const p = get().weekPlan;
        if (!p) return;
        const entry: SavedPlan = { id: uid(), name: name.trim() || 'My plan', plan: p, savedAt: new Date().toISOString() };
        set({ savedPlans: [entry, ...get().savedPlans] });
      },
      loadPlan: (id) => {
        const found = get().savedPlans.find((s) => s.id === id);
        if (found) set({ weekPlan: found.plan });
      },
      deletePlan: (id) => set({ savedPlans: get().savedPlans.filter((s) => s.id !== id) }),
      addWeighIn: (kg) => {
        const today = new Date().toISOString().slice(0, 10);
        const rest = get().weighIns.filter((w) => w.date !== today);
        set({ weighIns: [...rest, { date: today, weightKg: kg }].sort((a, b) => a.date.localeCompare(b.date)) });
        get().updateProfile({ weightKg: kg });
      },
      // Merge a body snapshot for today (weight + girths + optional photo).
      addBodyStat: (patch) => {
        const today = new Date().toISOString().slice(0, 10);
        const existing = get().bodyStats.find((b) => b.date === today) ?? { date: today };
        const rest = get().bodyStats.filter((b) => b.date !== today);
        const merged: BodyStat = { ...existing, ...patch, date: today };
        set({ bodyStats: [...rest, merged].sort((a, b) => a.date.localeCompare(b.date)) });
        if (patch.weightKg) get().addWeighIn(patch.weightKg);
      },
      reset: () => set({ profile: null, weekPlan: null, weighIns: [], bodyStats: [] }),
    }),
    {
      name: 'forge-user',
      // Migrate old German weekday codes (Mo/Di/Mi…) to English (Mon/Tue/Wed…).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const MAP: Record<string, string> = { Mo: 'Mon', Di: 'Tue', Mi: 'Wed', Do: 'Thu', Fr: 'Fri', Sa: 'Sat', So: 'Sun' };
        const fix = (plan: WeekPlan | null) =>
          plan ? { ...plan, days: plan.days.map((d) => ({ ...d, day: (MAP[d.day] ?? d.day) as WeekPlan['days'][number]['day'] })) } : plan;
        if (state.weekPlan) state.weekPlan = fix(state.weekPlan)!;
        if (state.savedPlans?.length) state.savedPlans = state.savedPlans.map((sp) => ({ ...sp, plan: fix(sp.plan)! }));
      },
    },
  ),
);
