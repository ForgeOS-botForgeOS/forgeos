import type { Duel, DuelMetric, Workout } from '../types';
import { computeVolume } from '../state/workoutStore';

// Pure duel rules. Duels used to advance via a manual "Log progress" button
// against a simulated opponent — now progress comes from workouts you actually
// finish. Live duels (side set) sync with a real friend through the Supabase
// `duels` table (see duelSync.ts); local duels keep the simulated opponent so
// mock mode stays playable.

export const DUEL_WIN_XP = 150;
export const DUEL_WIN_COINS = 20;

/**
 * How long an unanswered challenge stays on the table. A challenge used to be
 * accepted for you the instant it arrived — you could be losing a contest you
 * never agreed to, against a target somebody else chose. Now it waits here.
 * Two days is long enough to see it, short enough that a dead challenge does
 * not sit at the top of Social for a fortnight.
 */
export const DUEL_RESPOND_HOURS = 48;

/** Statuses where nothing is happening any more. */
const FINISHED: readonly Duel['status'][] = ['won', 'lost', 'declined', 'expired'];

export function isFinished(d: Duel): boolean {
  return FINISHED.includes(d.status);
}

/** A challenge someone sent me that I have not answered yet. */
export function isAwaitingMyAnswer(d: Duel): boolean {
  return d.status === 'pending' && d.side !== 'challenger';
}

/** A challenge I sent that the other person has not answered yet. */
export function isAwaitingTheirAnswer(d: Duel): boolean {
  return d.status === 'pending' && d.side === 'challenger';
}

/** Only accepted duels are contests; everything else is noise on the screen. */
export function activeDuels(list: readonly Duel[]): Duel[] {
  return list.filter((d) => d.status === 'active');
}

export function incomingDuels(list: readonly Duel[]): Duel[] {
  return list.filter(isAwaitingMyAnswer);
}

/** Say yes. Progress starts from zero, now — not from when they challenged. */
export function acceptDuel(d: Duel): Duel {
  if (d.status !== 'pending') return d;
  return { ...d, status: 'active', myProgress: 0, theirProgress: 0 };
}

/** Say no. Nothing is scored and the rivalry record is untouched. */
export function declineDuel(d: Duel): Duel {
  return d.status === 'pending' ? { ...d, status: 'declined' } : d;
}

/**
 * An unanswered challenge lapses instead of hanging around for ever. Separate
 * from settleAtDeadline because a challenge nobody accepted has no winner —
 * awarding the challenger a walkover would reward spamming challenges.
 */
export function expireIfUnanswered(d: Duel, now: number): Duel {
  if (d.status !== 'pending') return d;
  const deadline = d.respondBy ? new Date(d.respondBy).getTime() : new Date(d.createdAt).getTime() + DUEL_RESPOND_HOURS * 3_600_000;
  return now >= deadline ? { ...d, status: 'expired' } : d;
}

// The simulated opponent grinds at 60–130% of your pace (legacy behavior).
const SIM_PACE_MIN = 0.6;
const SIM_PACE_SPREAD = 0.7;

export function isLiveDuel(d: Duel): boolean {
  return d.side != null;
}

/** When a challenge sent now stops waiting for an answer. */
export function respondByFrom(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + DUEL_RESPOND_HOURS * 3_600_000).toISOString();
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
