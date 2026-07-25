import type { PR, SetEntry, Workout } from '../types';
import { e1rm, volumeOf } from './fitness';

// ---- Per-lift history ----
// Everything the exercise detail page shows about *your* relationship with one
// movement: how often you've done it, your best set, the recorded PR, the
// session-by-session log and the e1RM trend. Pure — reads history + prs, writes
// nothing.

export interface LiftSession {
  workoutId: string;
  date: string; // ISO, as stored on the workout
  sets: SetEntry[]; // completed sets of this lift in that session
  topSet: SetEntry; // the set with the highest estimated 1RM
  bestE1rm: number;
  volumeKg: number;
}

export interface LiftStats {
  sessions: LiftSession[]; // newest first
  sessionCount: number;
  totalSets: number;
  totalVolumeKg: number;
  bestE1rm: number;
  bestSet: SetEntry | null; // the set behind bestE1rm
  bestSetDate: string | null;
  lastSession: LiftSession | null;
  pr: PR | null; // the recorded PR for this lift (highest e1RM)
  trendPct: number | null; // best-e1RM change from first to latest session, %
}

const EMPTY: LiftStats = {
  sessions: [],
  sessionCount: 0,
  totalSets: 0,
  totalVolumeKg: 0,
  bestE1rm: 0,
  bestSet: null,
  bestSetDate: null,
  lastSession: null,
  pr: null,
  trendPct: null,
};

export function liftStats(history: Workout[], prs: PR[], exerciseId: string): LiftStats {
  if (!exerciseId) return EMPTY;

  const sessions: LiftSession[] = [];
  for (const w of history) {
    // The same lift can appear twice in one session (e.g. after a superset
    // split) — fold every occurrence into that session's row.
    const sets = w.exercises
      .filter((we) => we.exerciseId === exerciseId)
      .flatMap((we) => we.sets.filter((s) => s.completed));
    if (!sets.length) continue;
    const topSet = sets.reduce((a, b) => (e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
    sessions.push({
      workoutId: w.id,
      date: w.date,
      sets,
      topSet,
      bestE1rm: e1rm(topSet.weightKg, topSet.reps),
      volumeKg: sets.reduce((a, s) => a + volumeOf(s.weightKg, s.reps), 0),
    });
  }
  if (!sessions.length) {
    // No logged work yet, but a PR may still exist (imported progress).
    return { ...EMPTY, pr: prFor(prs, exerciseId) };
  }

  // History is stored newest-first, but imports can land out of order.
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  const best = sessions.reduce((a, b) => (b.bestE1rm > a.bestE1rm ? b : a));
  const oldest = sessions[sessions.length - 1];
  const newest = sessions[0];

  return {
    sessions,
    sessionCount: sessions.length,
    totalSets: sessions.reduce((a, s) => a + s.sets.length, 0),
    totalVolumeKg: Math.round(sessions.reduce((a, s) => a + s.volumeKg, 0)),
    bestE1rm: best.bestE1rm,
    bestSet: best.topSet,
    bestSetDate: best.date,
    lastSession: newest,
    pr: prFor(prs, exerciseId),
    trendPct:
      sessions.length >= 2 && oldest.bestE1rm > 0
        ? Math.round(((newest.bestE1rm - oldest.bestE1rm) / oldest.bestE1rm) * 100)
        : null,
  };
}

/** The strongest recorded PR for one lift (the store keeps one row per beat). */
function prFor(prs: PR[], exerciseId: string): PR | null {
  const mine = prs.filter((p) => p.exerciseId === exerciseId);
  if (!mine.length) return null;
  return mine.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
}

/** e1RM per session, oldest → newest — the shape recharts wants. */
export function liftProgression(stats: LiftStats): { date: string; e1rm: number }[] {
  return [...stats.sessions]
    .reverse()
    .map((s) => ({ date: s.date.slice(5, 10), e1rm: Math.round(s.bestE1rm) }));
}
