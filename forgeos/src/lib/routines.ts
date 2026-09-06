import type { ExerciseTarget, Routine, Workout } from '../types';

// Routines — "I train these same four sessions forever", made a first-class
// thing instead of a star on a history row.
//
// The app already had two half-answers to this: `favouriteIds` pinned a past
// workout to the top of a picker, and `repeatWorkout()` copied the most recent
// one. Neither let you NAME the thing, and a favourite decayed into a date
// stamp ("Push · 14/03") the moment you tried to remember which one it was. A
// routine is the workout's shape — its exercises and their sets/reps/weights —
// with a name you chose, kept separately from the session it came from, so
// deleting old history never takes your Monday session with it.
//
// Everything here is pure. The store (state/workoutStore) owns the list.

/** Cap so one routine can't be pathological — 40 exercises is already absurd. */
export const ROUTINE_MAX_EXERCISES = 40;
export const ROUTINE_NAME_MAX = 40;

/**
 * The shape of a finished session, ready to run again. Weights and reps come
 * from what was actually COMPLETED — a set you abandoned is not a target — and
 * fall back to the planned set when nothing in the session was completed.
 */
export function routineFromWorkout(
  workout: Workout,
  name: string,
  id: string,
  now: string = new Date().toISOString(),
): Routine {
  const exerciseIds: string[] = [];
  const targets: Record<string, ExerciseTarget> = {};

  for (const we of workout.exercises.slice(0, ROUTINE_MAX_EXERCISES)) {
    if (exerciseIds.includes(we.exerciseId)) continue; // one entry per movement
    const done = we.sets.filter((s) => s.completed);
    const use = done.length ? done : we.sets;
    if (use.length === 0) continue;
    // The heaviest completed set is the honest target: a back-off set should
    // not become next week's plan.
    const top = use.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
    exerciseIds.push(we.exerciseId);
    targets[we.exerciseId] = {
      sets: use.length,
      reps: top.reps,
      ...(top.weightKg > 0 ? { weightKg: top.weightKg } : {}),
    };
  }

  return {
    id,
    name: cleanRoutineName(name) || 'Routine',
    exerciseIds,
    targets,
    createdAt: now,
    sourceWorkoutId: workout.id,
    uses: 0,
  };
}

/** Trim, collapse whitespace, cap. Names are typed by hand, so they arrive messy. */
export function cleanRoutineName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, ROUTINE_NAME_MAX);
}

/**
 * What to put in the "name it" box before the user types. The session's own
 * name is nearly always right ("Push", "Legs"); a cardio-ish or unnamed session
 * gets a name built from what is in it.
 */
export function suggestRoutineName(workout: Workout, nameOf: (exerciseId: string) => string | undefined): string {
  const own = cleanRoutineName(workout.name ?? '');
  // A cardio log names itself "Treadmill · 5km · 30min" — that is a record of
  // one session, not the name of a routine.
  if (own && !own.includes('·')) return own;
  const first = workout.exercises[0] && nameOf(workout.exercises[0].exerciseId);
  return cleanRoutineName(first ? `${first} day` : 'My routine');
}

/** Most-used first, then most recently used, then newest. Ties break by name. */
export function sortRoutines(list: readonly Routine[]): Routine[] {
  const time = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
  return [...list].sort(
    (a, b) =>
      b.uses - a.uses ||
      time(b.lastUsedAt) - time(a.lastUsedAt) ||
      time(b.createdAt) - time(a.createdAt) ||
      a.name.localeCompare(b.name),
  );
}

/** Record a run. Kept pure so "did starting it count?" is testable. */
export function markRoutineUsed(r: Routine, now: string = new Date().toISOString()): Routine {
  return { ...r, uses: r.uses + 1, lastUsedAt: now };
}

/**
 * One-time migration off the old star-a-history-row favourites. Every starred
 * workout that still exists becomes a named routine, so nobody loses the
 * sessions they pinned when the feature grew up.
 */
export function routinesFromFavourites(
  favouriteIds: readonly string[],
  history: readonly Workout[],
  nameOf: (exerciseId: string) => string | undefined,
  makeId: () => string,
  now: string = new Date().toISOString(),
): Routine[] {
  const out: Routine[] = [];
  for (const id of favouriteIds) {
    const w = history.find((h) => h.id === id);
    if (!w || w.exercises.length === 0) continue;
    const r = routineFromWorkout(w, suggestRoutineName(w, nameOf), makeId(), now);
    if (r.exerciseIds.length > 0) out.push(r);
  }
  return out;
}
