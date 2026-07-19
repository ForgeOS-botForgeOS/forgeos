import type { PR, Workout } from '../types';
import { exerciseById } from '../data/exercises';

// Forge Wrapped — the month that was, from your own data. Pure arithmetic over
// the stores (same philosophy as coach.ts / weeklyReview.ts).

export interface WrappedStats {
  monthLabel: string; // "July 2026"
  monthKey: string; // "2026-07" — dismissal / identity key
  sessions: number;
  volumeKg: number;
  sets: number;
  durationMin: number;
  prCount: number;
  bestLift: { exerciseName: string; weightKg: number } | null;
  favoriteExercise: string | null; // most completed sets
}

/** The most recent fully completed month relative to `now`. */
export function lastCompletedMonth(now: number): { year: number; monthIndex: number } {
  const d = new Date(now);
  const monthIndex = d.getMonth() === 0 ? 11 : d.getMonth() - 1;
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  return { year, monthIndex };
}

/** Stats for one calendar month. Null when it had no finished workouts. */
export function buildWrapped(history: Workout[], prs: PR[], year: number, monthIndex: number): WrappedStats | null {
  const inMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  };
  const month = history.filter((w) => w.completed && inMonth(w.date));
  if (month.length === 0) return null;

  let volumeKg = 0;
  let sets = 0;
  let durationMin = 0;
  const setsPerExercise = new Map<string, number>();
  for (const w of month) {
    volumeKg += w.totalVolumeKg ?? 0;
    durationMin += Math.round((w.durationSec ?? 0) / 60);
    for (const we of w.exercises) {
      const done = we.sets.filter((s) => s.completed).length;
      sets += done;
      if (done > 0) setsPerExercise.set(we.exerciseId, (setsPerExercise.get(we.exerciseId) ?? 0) + done);
    }
  }

  let favoriteId: string | null = null;
  for (const [id, n] of setsPerExercise) {
    if (favoriteId === null || n > (setsPerExercise.get(favoriteId) ?? 0)) favoriteId = id;
  }

  const monthPrs = prs.filter((p) => inMonth(p.date));
  let bestLift: WrappedStats['bestLift'] = null;
  for (const p of monthPrs) {
    if (!bestLift || p.weightKg > bestLift.weightKg) bestLift = { exerciseName: p.exerciseName, weightKg: p.weightKg };
  }

  return {
    monthLabel: new Date(year, monthIndex, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    sessions: month.length,
    volumeKg: Math.round(volumeKg),
    sets,
    durationMin,
    prCount: monthPrs.length,
    bestLift,
    favoriteExercise: favoriteId ? exerciseById(favoriteId)?.name ?? null : null,
  };
}
