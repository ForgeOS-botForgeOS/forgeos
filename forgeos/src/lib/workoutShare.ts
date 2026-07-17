import type { CardioLog, SubTargetKind, Workout, WorkoutExercise } from '../types';

const uid = () => Math.random().toString(36).slice(2, 10);

// A trimmed, id-free view of a single workout that's safe (and small enough) to
// carry in a share link — no local ids, dates, sync flags or personal totals.
interface SharedSet {
  weightKg: number;
  reps: number;
  rpe?: number;
  subKind?: SubTargetKind;
}
interface SharedExercise {
  exerciseId: string;
  sets: SharedSet[];
  supersetGroup?: number; // index-based group tag, re-linked on import
  restPresetSec?: number;
}
export interface SharedWorkout {
  name: string;
  exercises: SharedExercise[];
  cardio?: CardioLog;
}

// ---- base64url helpers (same scheme as planShare) ----
function toBase64Url(json: string): string {
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

// Trim a full Workout down to the shareable view. Maps real superset group
// ids to small integer tags so linkage survives the trip without leaking
// local ids. Also used by live races to carry the workout in the invite.
export function toSharedWorkout(w: Workout): SharedWorkout {
  const groupTag = new Map<string, number>();
  return {
    name: w.name,
    exercises: w.exercises.map((e) => {
      let tag: number | undefined;
      if (e.supersetGroup) {
        if (!groupTag.has(e.supersetGroup)) groupTag.set(e.supersetGroup, groupTag.size + 1);
        tag = groupTag.get(e.supersetGroup);
      }
      return {
        exerciseId: e.exerciseId,
        supersetGroup: tag,
        restPresetSec: e.restPresetSec,
        sets: e.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe, subKind: s.subKind })),
      };
    }),
    cardio: w.cardio,
  };
}

export function encodeWorkout(w: Workout): string {
  return toBase64Url(JSON.stringify(toSharedWorkout(w)));
}

export function decodeWorkout(code: string): SharedWorkout | null {
  try {
    const parsed = JSON.parse(fromBase64Url(code)) as SharedWorkout;
    if (!parsed || typeof parsed.name !== 'string' || !Array.isArray(parsed.exercises)) return null;
    const ok = parsed.exercises.every(
      (e) => typeof e.exerciseId === 'string' && Array.isArray(e.sets),
    );
    if (!ok) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Rebuild proper WorkoutExercise[] (fresh ids, superset groups re-linked, sets
// reset to uncompleted) so a shared workout can be started as a live session.
export function sharedToExercises(shared: SharedWorkout): WorkoutExercise[] {
  const groupId = new Map<number, string>();
  return shared.exercises.map((e) => {
    let supersetGroup: string | undefined;
    if (e.supersetGroup != null) {
      if (!groupId.has(e.supersetGroup)) groupId.set(e.supersetGroup, uid());
      supersetGroup = groupId.get(e.supersetGroup);
    }
    return {
      id: uid(),
      exerciseId: e.exerciseId,
      supersetGroup,
      restPresetSec: e.restPresetSec ?? 90,
      sets: e.sets.map((s) => ({
        id: uid(),
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe ?? 7,
        subKind: s.subKind ?? 'none',
        completed: false,
      })),
    };
  });
}

// Full shareable link that opens the in-app import screen.
export function workoutShareUrl(w: Workout): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/import-workout?w=${encodeWorkout(w)}`;
}

export async function shareWorkout(w: Workout): Promise<'shared' | 'copied'> {
  const url = workoutShareUrl(w);
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: 'ForgeOS workout', text: `Try my "${w.name}" workout on ForgeOS 💪`, url });
      return 'shared';
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
