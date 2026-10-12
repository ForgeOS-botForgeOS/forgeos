import type { Workout } from '../types';

// Unsaved edits on the "Add a past workout" / edit-session screen.
//
// That screen kept everything in component state, so tapping Back, switching
// tab or the phone killing the app threw away a half-typed session. The draft
// now lives on the device under one key per workout ('new' for a session not
// saved yet) until it is saved or deliberately thrown away.

const PREFIX = 'forge-workout-draft:';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // private mode / blocked site data: the screen still works, just without drafts
  }
}

/** Minimal shape check: a draft from an older build or a corrupted write is ignored, never crashes the screen. */
function isWorkout(v: unknown): v is Workout {
  if (!v || typeof v !== 'object') return false;
  const w = v as Partial<Workout>;
  return typeof w.id === 'string' && typeof w.name === 'string' && typeof w.date === 'string'
    && Array.isArray(w.exercises)
    && w.exercises.every((e) => e && typeof e.exerciseId === 'string' && Array.isArray(e.sets));
}

export function loadDraft(key: string): Workout | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWorkout(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: Workout): void {
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(draft));
  } catch {
    // Quota full or storage blocked: losing the draft is the old behaviour, not a crash.
  }
}

export function clearDraft(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    /* nothing to clear */
  }
}

export const hasDraft = (key: string): boolean => loadDraft(key) !== null;

/** True when the draft differs from what is saved, so an untouched screen leaves no draft behind. */
export function isDirty(draft: Workout, saved: Workout | null): boolean {
  return JSON.stringify(draft) !== JSON.stringify(saved);
}
