import type { Duel, DuelMetric, Workout } from '../types';
import { computeVolume } from '../state/workoutStore';

// Pure duel rules. Duels used to advance via a manual "Log progress" button
// against a simulated opponent — now progress comes from workouts you actually
// finish. Live duels (side set) sync with a real friend through the Supabase
// `duels` table (see duelSync.ts); local duels keep the simulated opponent so
// mock mode stays playable.

export const DUEL_WIN_XP = 150;
export const DUEL_WIN_COINS = 20;

// The simulated opponent grinds at 60–130% of your pace (legacy behavior).
const SIM_PACE_MIN = 0.6;
const SIM_PACE_SPREAD = 0.7;

export function isLiveDuel(d: Duel): boolean {
  return d.side != null;
}

/** What a finished workout is worth for a duel metric. */
export function duelGainFromWorkout(metric: DuelMetric, workout: Workout): number {
  switch (metric) {
    case 'volume':
      return computeVolume(workout);
    case 'sets':
      return workout.exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);
    case 'sessions':
      return 1;
  }
}

/** Advance my side; optionally let the simulated opponent grind along. Status is sticky. */
export function applyMyGain(d: Duel, gained: number, simulateOpponent: boolean, rng: () => number = Math.random): Duel {
  if (d.status !== 'active' || gained <= 0) return d;
  const myProgress = Math.min(d.target, d.myProgress + gained);
  const theirProgress = simulateOpponent
    ? Math.min(d.target, d.theirProgress + Math.round(gained * (SIM_PACE_MIN + rng() * SIM_PACE_SPREAD)))
    : d.theirProgress;
  const status: Duel['status'] = myProgress >= d.target ? 'won' : theirProgress >= d.target ? 'lost' : 'active';
  return { ...d, myProgress, theirProgress, status };
}

/** Fold in the opponent's synced total (never lowers what we already saw). */
export function mergeTheirProgress(d: Duel, theirTotal: number): Duel {
  if (d.status !== 'active') return d;
  const theirProgress = Math.min(d.target, Math.max(d.theirProgress, theirTotal));
  const status: Duel['status'] = theirProgress >= d.target && d.myProgress < d.target ? 'lost' : d.status;
  if (theirProgress === d.theirProgress && status === d.status) return d;
  return { ...d, theirProgress, status };
}

/** Past the deadline nobody hit the target: higher total wins (tie goes to you). */
export function settleAtDeadline(d: Duel, now: number): Duel {
  if (d.status !== 'active' || now < new Date(d.endsAt).getTime()) return d;
  return { ...d, status: d.myProgress >= d.theirProgress ? 'won' : 'lost' };
}
