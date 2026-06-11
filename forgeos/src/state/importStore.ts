import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyStat, PR, WeighIn, Workout } from '../types';
import type { LaneId, TrustLevel } from '../lib/import/canonical';

// A point-in-time copy of every store slice a progress import touches, so any
// import is fully reversible (undo restores this snapshot).
export interface ForgeSnapshot {
  gami: { xp: number; coins: number; streakDays: number; bestStreak: number; weekStreak: number; heavyLifts: number; lastSessionDate: string | null };
  history: Workout[];
  prs: PR[];
  joinedAt?: string;
  weighIns: WeighIn[];
  bodyStats: BodyStat[];
  weeklyGoal: number;
}

export interface ImportSummary {
  source: string;
  streakDays: number;
  bestStreak: number;
  xpAdded: number;
  coinsAdded: number;
  heavyLifts: number;
  historyDays: number;
  prs: number;
  bodyStats: number;
  achievementsImported: number;
  memberSince?: string;
  notes: string[];
  message: string; // celebration line
}

export interface ImportRecord {
  id: string;
  source: string;
  lane: LaneId;
  trust: TrustLevel;
  at: string;
  summary: ImportSummary;
  snapshot: ForgeSnapshot;
}

interface ImportState {
  imports: ImportRecord[];
  add: (rec: ImportRecord) => void;
  /** Remove this record and any made after it (their snapshots are now stale). */
  removeFrom: (id: string) => void;
  hasSource: (source: string) => boolean;
}

export const useImports = create<ImportState>()(
  persist(
    (set, get) => ({
      imports: [],
      add: (rec) => set({ imports: [rec, ...get().imports] }),
      removeFrom: (id) => {
        const list = get().imports;
        const idx = list.findIndex((r) => r.id === id);
        if (idx === -1) return;
        set({ imports: list.slice(idx + 1) }); // drop this and newer (newest-first order)
      },
      hasSource: (source) => get().imports.some((r) => r.source.toLowerCase() === source.toLowerCase()),
    }),
    { name: 'forge-imports' },
  ),
);
