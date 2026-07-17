import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RaceBroadcast, RaceConfig } from '../lib/race';

// Live-race state. Only serializable data lives here — the realtime channel
// itself is owned by lib/raceSession.ts, which rejoins from this persisted
// state after a refresh mid-race.
export type RaceStatus = 'lobby' | 'racing' | 'done';

export interface RaceRacer extends RaceBroadcast {
  online: boolean;
}

export interface ActiveRace {
  config: RaceConfig;
  role: 'host' | 'guest';
  status: RaceStatus;
  startAt?: number;
  // Volume already on my active workout when the race started — only kg moved
  // *during* the race count (matters for volume/timed races joined mid-session).
  myBaselineVolumeKg: number;
  racers: Record<string, RaceRacer>;
  winnerId?: string;
  rewarded: boolean;
}

interface RaceState {
  active: ActiveRace | null;

  begin: (config: RaceConfig, role: 'host' | 'guest', me: RaceBroadcast) => void;
  applyUpdate: (u: RaceBroadcast) => void;
  setRoster: (racers: RaceBroadcast[], onlineIds: string[]) => void;
  markStarted: (startAt: number, myBaselineVolumeKg: number) => void;
  setWinner: (userId: string) => void;
  markRewarded: () => void;
  clear: () => void;
}

export const useRace = create<RaceState>()(
  persist(
    (set) => ({
      active: null,

      begin: (config, role, me) =>
        set({
          active: {
            config,
            role,
            status: 'lobby',
            myBaselineVolumeKg: 0,
            racers: { [me.userId]: { ...me, online: true } },
            rewarded: false,
          },
        }),

      applyUpdate: (u) =>
        set((s) => {
          if (!s.active) return s;
          const prev = s.active.racers[u.userId];
          const racers = { ...s.active.racers, [u.userId]: { ...prev, ...u, online: true } };
          // Any update carrying startAt heals clients that missed the start event.
          const startAt = s.active.startAt ?? u.startAt;
          const status = s.active.status === 'lobby' && startAt != null ? 'racing' : s.active.status;
          return { active: { ...s.active, racers, startAt, status } };
        }),

      setRoster: (racers, onlineIds) =>
        set((s) => {
          if (!s.active) return s;
          const merged = { ...s.active.racers };
          for (const r of racers) merged[r.userId] = { ...merged[r.userId], ...r, online: true };
          // Keep departed racers visible (their bar stays), just flag them offline.
          for (const id of Object.keys(merged)) merged[id] = { ...merged[id], online: onlineIds.includes(id) };
          return { active: { ...s.active, racers: merged } };
        }),

      markStarted: (startAt, myBaselineVolumeKg) =>
        set((s) => (s.active && s.active.status === 'lobby'
          ? { active: { ...s.active, status: 'racing', startAt, myBaselineVolumeKg } }
          : s)),

      setWinner: (userId) =>
        set((s) => (s.active ? { active: { ...s.active, status: 'done', winnerId: userId } } : s)),

      markRewarded: () =>
        set((s) => (s.active ? { active: { ...s.active, rewarded: true } } : s)),

      clear: () => set({ active: null }),
    }),
    { name: 'forge-race' },
  ),
);
