import type { CardioLog, SubTargetKind, Workout, WorkoutExercise } from '../types';
import { cleanNumber, displayTitle } from './sanitize';
import { coerceGrip, type GripPosition } from './grip';

const uid = () => Math.random().toString(36).slice(2, 10);

// A trimmed, id-free view of a single workout that's safe (and small enough) to
// carry in a share link — no local ids, dates, sync flags or personal totals.
interface SharedSet {
  weightKg: number;
  reps: number;
  rpe?: number;
  subKind?: SubTargetKind;
  grip?: GripPosition;
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
    name: displayTitle(w.name, 'Shared workout'),
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
        sets: e.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe, subKind: s.subKind, grip: s.grip })),
      };
    }),
    cardio: w.cardio,
  };
}

export function encodeWorkout(w: Workout): string {
  return toBase64Url(JSON.stringify(toSharedWorkout(w)));
}

const SUB_KINDS: readonly string[] = ['tut', 'band', 'isometric', 'grip', 'none'];

/**
 * Rebuild a shared workout from an untrusted object. Share links and race
 * invites are written by strangers, and the result becomes a live session that
 * is persisted: a set whose `weightKg` is an object, or a thousand exercises,
 * used to be carried straight into the workout store. Known keys only, numbers
 * clamped, strings cleaned, lists bounded. Null means "not a usable workout".
 */
export function sanitizeSharedWorkout(raw: unknown): SharedWorkout | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || !Array.isArray(r.exercises) || r.exercises.length > 40) return null;
  const exercises: SharedExercise[] = [];
  for (const e of r.exercises) {
    if (typeof e !== 'object' || e === null) return null;
    const x = e as Record<string, unknown>;
    if (typeof x.exerciseId !== 'string' || !/^[A-Za-z0-9_.:-]{1,64}$/.test(x.exerciseId) || !Array.isArray(x.sets) || x.sets.length > 30) return null;
    const sets: SharedSet[] = [];
    for (const s of x.sets) {
      if (typeof s !== 'object' || s === null) return null;
      const y = s as Record<string, unknown>;
      sets.push({
        weightKg: cleanNumber(y.weightKg, 0, 1000),
        reps: Math.round(cleanNumber(y.reps, 0, 1000)),
        rpe: y.rpe == null ? undefined : cleanNumber(y.rpe, 1, 10, 7),
        subKind: typeof y.subKind === 'string' && SUB_KINDS.includes(y.subKind) ? (y.subKind as SubTargetKind) : undefined,
        grip: coerceGrip(y.grip),
      });
    }
    exercises.push({
      exerciseId: x.exerciseId,
      sets,
      supersetGroup: x.supersetGroup == null ? undefined : Math.round(cleanNumber(x.supersetGroup, 0, 100)),
      restPresetSec: x.restPresetSec == null ? undefined : Math.round(cleanNumber(x.restPresetSec, 0, 1800, 90)),
    });
  }
  let cardio: CardioLog | undefined;
  if (typeof r.cardio === 'object' && r.cardio !== null && !Array.isArray(r.cardio)) {
    const c = r.cardio as Record<string, unknown>;
    cardio = {
      machine: displayTitle(c.machine, 'Cardio'),
      distanceKm: cleanNumber(c.distanceKm, 0, 10_000),
      durationMin: cleanNumber(c.durationMin, 0, 1440),
      ...(c.calories == null ? {} : { calories: cleanNumber(c.calories, 0, 20_000) }),
    };
  }
  return { name: displayTitle(r.name, 'Shared workout'), exercises, ...(cardio ? { cardio } : {}) };
}

export function decodeWorkout(code: string): SharedWorkout | null {
  try {
    if (code.length > 120_000) return null;
    return sanitizeSharedWorkout(JSON.parse(fromBase64Url(code)));
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
        grip: coerceGrip(s.grip),
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
