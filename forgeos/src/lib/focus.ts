import type { SetEntry, Workout, WorkoutExercise } from '../types';
import { volumeOf } from './fitness';

// ---- Focus HUD queue ----
// The heads-up display shows exactly one set at a time, so the whole screen can
// be the set you're about to lift. Everything it needs is derived from the live
// session here (pure), never stored: what to lift now, what's up next, and how
// far through the session you are.

export interface PendingSet {
  exercise: WorkoutExercise;
  exerciseIndex: number; // 0-based position in the session
  set: SetEntry;
  setIndex: number; // 0-based position within the exercise
}

/**
 * Every not-yet-completed set of the live session, in the order they'll be
 * done — exercise by exercise, set by set. `[0]` is what to lift right now,
 * `[1]` is what the HUD previews as "up next".
 */
export function pendingSets(active: Workout | null): PendingSet[] {
  if (!active) return [];
  const queue: PendingSet[] = [];
  active.exercises.forEach((exercise, exerciseIndex) => {
    exercise.sets.forEach((set, setIndex) => {
      if (!set.completed) queue.push({ exercise, exerciseIndex, set, setIndex });
    });
  });
  return queue;
}

/**
 * The set the HUD should show. Normally the head of the queue, but when you tap
 * another exercise's chip (supersets, a busy rack) that exercise's next pending
 * set wins — until it runs out of sets, when focus falls back to the queue.
 */
export function focusTarget(active: Workout | null, preferExerciseId?: string | null): PendingSet | null {
  const queue = pendingSets(active);
  if (preferExerciseId) {
    const preferred = queue.find((p) => p.exercise.id === preferExerciseId);
    if (preferred) return preferred;
  }
  return queue[0] ?? null;
}

export interface FocusProgress {
  doneSets: number;
  totalSets: number;
  volumeKg: number; // completed sets only
  pct: number; // 0–100
}

/** Session totals for the HUD's slim progress strip. */
export function focusProgress(active: Workout | null): FocusProgress {
  let doneSets = 0;
  let totalSets = 0;
  let volumeKg = 0;
  for (const we of active?.exercises ?? []) {
    for (const s of we.sets) {
      totalSets += 1;
      if (!s.completed) continue;
      doneSets += 1;
      volumeKg += volumeOf(s.weightKg, s.reps);
    }
  }
  return {
    doneSets,
    totalSets,
    volumeKg,
    pct: totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0,
  };
}
