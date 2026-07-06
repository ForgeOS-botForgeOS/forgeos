import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HealthDay, HealthSource } from '../types';
import { useGami } from './gamificationStore';

// Wearable / wellness data (sleep, steps, recovery). Source-agnostic: Garmin
// export, Android Health Connect and manual entry all land here, merged per day.
// Client-only and offline-first like the rest of the app — nothing leaves the
// device unless the user explicitly imports.

interface HealthState {
  days: Record<string, HealthDay>; // keyed by 'YYYY-MM-DD'
  lastSyncAt: number | null;
  lastSource: HealthSource | null;
  // Watch-workout import ledger: Health Connect record id → when we handled it.
  // Every considered session lands here (imported OR skipped) so a session is
  // never re-evaluated — the idempotency key for garminWorkouts.ts.
  importedWorkoutIds: Record<string, number>;
  /** Merge one day in, field-by-field (a later source never blanks an earlier value). */
  upsertDay: (day: HealthDay) => void;
  /** Bulk merge (import / auto-sync). Returns how many distinct days were touched. */
  ingest: (days: HealthDay[], source: HealthSource) => number;
  markWorkoutsHandled: (ids: string[]) => void;
  removeDay: (date: string) => void;
  clearAll: () => void;
}

const NUMERIC: (keyof HealthDay)[] = [
  'sleepMinutes', 'sleepScore', 'steps', 'restingHr', 'activeCalories', 'bodyBattery', 'stress',
];

// Merge `incoming` onto `base`: keep every existing number, only fill blanks or
// take the incoming value when present. This way importing a CSV that only has
// steps never wipes a sleep figure synced earlier the same day.
function mergeDay(base: HealthDay | undefined, incoming: HealthDay): HealthDay {
  if (!base) return incoming;
  const out: HealthDay = { ...base, source: incoming.source, updatedAt: incoming.updatedAt };
  for (const k of NUMERIC) {
    const v = incoming[k] as number | undefined;
    if (typeof v === 'number' && !Number.isNaN(v)) (out[k] as number) = v;
  }
  return out;
}

export const useHealth = create<HealthState>()(
  persist(
    (set, get) => ({
      days: {},
      lastSyncAt: null,
      lastSource: null,
      importedWorkoutIds: {},

      upsertDay: (day) => {
        set((s) => ({
          days: { ...s.days, [day.date]: mergeDay(s.days[day.date], day) },
          lastSyncAt: Date.now(),
          lastSource: day.source,
        }));
        useGami.getState().syncHealthQuests(sortedDays(get().days));
      },

      ingest: (incoming, source) => {
        if (!incoming.length) return 0;
        const days = { ...get().days };
        const seen = new Set<string>();
        for (const d of incoming) {
          if (!d.date) continue;
          days[d.date] = mergeDay(days[d.date], d);
          seen.add(d.date);
        }
        set({ days, lastSyncAt: Date.now(), lastSource: source });
        useGami.getState().syncHealthQuests(sortedDays(days));
        return seen.size;
      },

      markWorkoutsHandled: (ids) => {
        if (!ids.length) return;
        const now = Date.now();
        const importedWorkoutIds = { ...get().importedWorkoutIds };
        for (const id of ids) importedWorkoutIds[id] = now;
        // Keep the ledger bounded: drop entries older than 90 days (Health
        // Connect only serves ~30 days back, so they can never reappear).
        const cutoff = now - 90 * 86400000;
        for (const [id, at] of Object.entries(importedWorkoutIds)) {
          if (at < cutoff) delete importedWorkoutIds[id];
        }
        set({ importedWorkoutIds });
      },

      removeDay: (date) =>
        set((s) => {
          const days = { ...s.days };
          delete days[date];
          return { days };
        }),

      clearAll: () => set({ days: {}, lastSyncAt: null, lastSource: null }),
    }),
    { name: 'forge-health' },
  ),
);

/** Days newest-first, as a plain array (selectors should derive with useMemo). */
export function sortedDays(days: Record<string, HealthDay>): HealthDay[] {
  return Object.values(days).sort((a, b) => (a.date < b.date ? 1 : -1));
}
