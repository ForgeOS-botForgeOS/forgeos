import { shareBase, shareOrCopy, type ShareResult } from './publicUrl';
import type { CardioLog, ExerciseCategory, MuscleGroup, SubTargetKind, Workout, WorkoutExercise } from '../types';
import { useExercises } from '../state/exerciseStore';
import { cleanNumber, displayTitle } from './sanitize';
import { coerceGrip, type GripPosition } from './grip';

const uid = () => Math.random().toString(36).slice(2, 10);

// The same bounds the decoder enforces: a link the app writes must always open.
export const SHARE_MAX_EXERCISES = 40;
export const SHARE_MAX_SETS = 30;
const CATEGORIES: readonly ExerciseCategory[] = ['Powerlifting', 'Bodybuilding', 'Plyometrics', 'Calisthenics', 'Olympic', 'CrossFit', 'Cardio', 'Mobility'];
const MUSCLES: readonly MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'];

function sanitizeCustom(raw: unknown): SharedCustom | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const c = raw as Record<string, unknown>;
  return {
    name: displayTitle(c.name, 'Custom exercise').slice(0, 60),
    category: CATEGORIES.includes(c.category as ExerciseCategory) ? (c.category as ExerciseCategory) : 'Bodybuilding',
    primary: MUSCLES.includes(c.primary as MuscleGroup) ? (c.primary as MuscleGroup) : 'Full Body',
    equipment: displayTitle(c.equipment, 'Other').slice(0, 40),
  };
}

// A trimmed, id-free view of a single workout that's safe (and small enough) to
// carry in a share link — no local ids, dates, sync flags or personal totals.
interface SharedSet {
  weightKg: number;
  reps: number;
  rpe?: number;
  subKind?: SubTargetKind;
  grip?: GripPosition;
}
// A custom exercise only exists on the sender's phone, so its name and kind
// travel with the link and are recreated on the friend's phone.
export interface SharedCustom {
  name: string;
  category: ExerciseCategory;
  primary: MuscleGroup;
  equipment: string;
}
interface SharedExercise {
  exerciseId: string;
  sets: SharedSet[];
  custom?: SharedCustom;
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

function customFor(exerciseId: string): { custom?: SharedCustom } {
  if (!exerciseId.startsWith('cus-')) return {};
  const ex = useExercises.getState().custom.find((c) => c.id === exerciseId);
  return ex ? { custom: { name: ex.name, category: ex.category, primary: ex.primary, equipment: ex.equipment } } : {};
}

// Trim a full Workout down to the shareable view. Maps real superset group
// ids to small integer tags so linkage survives the trip without leaking
// local ids. Also used by live races to carry the workout in the invite.
export function toSharedWorkout(w: Workout): SharedWorkout {
  const groupTag = new Map<string, number>();
  return {
    name: displayTitle(w.name, 'Shared workout'),
    exercises: w.exercises.slice(0, SHARE_MAX_EXERCISES).map((e) => {
      let tag: number | undefined;
      if (e.supersetGroup) {
        if (!groupTag.has(e.supersetGroup)) groupTag.set(e.supersetGroup, groupTag.size + 1);
        tag = groupTag.get(e.supersetGroup);
      }
      return {
        exerciseId: e.exerciseId,
        supersetGroup: tag,
        restPresetSec: e.restPresetSec,
        sets: e.sets.slice(0, SHARE_MAX_SETS).map((s) => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe, subKind: s.subKind, grip: s.grip })),
        ...customFor(e.exerciseId),
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
      ...(x.custom == null ? {} : { custom: sanitizeCustom(x.custom) }),
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

// The friend's own copy of a sender's custom exercise: reuse one with the same
// name, otherwise create it, so the session never shows a nameless row.
function resolveExerciseId(e: SharedExercise): string {
  if (!e.custom) return e.exerciseId;
  const store = useExercises.getState();
  const same = store.custom.find((c) => c.name.toLowerCase() === e.custom!.name.toLowerCase());
  if (same) return same.id;
  return store.addCustom({ ...e.custom, secondary: [], isCore: false }).id;
}

/** Display name of a shared exercise, built-in or carried custom. */
export function sharedExerciseName(e: SharedExercise, lookup: (id: string) => { name: string } | undefined): string {
  return lookup(e.exerciseId)?.name ?? e.custom?.name ?? 'Exercise';
}

// Rebuild proper WorkoutExercise[] (fresh ids, superset groups re-linked, sets
// reset to uncompleted) so a shared workout can be started as a live session.
export function sharedToExercises(shared: SharedWorkout): WorkoutExercise[] {
  const groupId = new Map<number, string>();
  return shared.exercises.map((e) => {
    const exerciseId = resolveExerciseId(e);
    let supersetGroup: string | undefined;
    if (e.supersetGroup != null) {
      if (!groupId.has(e.supersetGroup)) groupId.set(e.supersetGroup, uid());
      supersetGroup = groupId.get(e.supersetGroup);
    }
    return {
      id: uid(),
      exerciseId,
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
  return `${shareBase()}#/import-workout?w=${encodeWorkout(w)}`;
}

export async function shareWorkout(w: Workout): Promise<ShareResult> {
  const what = w.cardio ? `${w.cardio.machine} session` : `"${w.name}" workout`;
  return shareOrCopy({ title: 'ForgeOS workout', text: `Try my ${what} on ForgeOS 💪`, url: workoutShareUrl(w) });
}
