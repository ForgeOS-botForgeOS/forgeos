import type { GarminWorkout } from '../types';

// Pure rules for importing watch-recorded workouts into ForgeOS history.
// The impure half (garminWorkouts.ts) applies these decisions to the stores;
// keeping the judgement calls here makes them unit-testable and reviewable:
//
// - cardio (a real run/ride/swim…)  → cardio workout, streak credit + XP
// - strength on the watch           → session workout, streak credit + XP,
//                                     unless you already logged one in-app that
//                                     day (no double-counting your own session)
// - light activity (walks, yoga…)   → history entry + XP, but NO streak credit,
//                                     because Garmin auto-detects casual walks
//                                     and those shouldn't "train" for you
// - anything under 10 minutes       → ignored as noise

export const CARDIO_TYPES = new Set(['running', 'cycling', 'swimming', 'rowing', 'elliptical', 'stairs', 'hiit', 'hiking']);
export const STRENGTH_TYPES = new Set(['strength', 'calisthenics']);

export type ImportKind = 'cardio' | 'strength' | 'activity' | 'skip';

export interface ImportDecision {
  kind: ImportKind;
  countsSession: boolean;
  xp: number;
  reason?: string; // why a skip happened
}

/** Minimal view of an existing history entry needed for dedupe decisions. */
export interface ExistingWorkout {
  date: string; // ISO (only the yyyy-mm-dd part is compared)
  isCardio: boolean;
  fromWatch: boolean;
}

/** XP for an imported session: effort-scaled, capped so long hikes can't farm it. */
export function importXp(kind: ImportKind, durationMin: number): number {
  if (kind === 'skip') return 0;
  const base = kind === 'activity' ? 10 : 20;
  return Math.min(50, base + Math.floor(durationMin / 3));
}

export function decideImport(w: GarminWorkout, existing: ExistingWorkout[]): ImportDecision {
  if (w.durationMin < 10) return { kind: 'skip', countsSession: false, xp: 0, reason: 'under 10 minutes' };

  if (STRENGTH_TYPES.has(w.type)) {
    // Same-day in-app strength session already logged → the watch recorded the
    // workout you tracked in ForgeOS; importing it would double-count.
    const dupe = existing.some((e) => !e.fromWatch && !e.isCardio && e.date.slice(0, 10) === w.date);
    if (dupe) return { kind: 'skip', countsSession: false, xp: 0, reason: 'already logged in ForgeOS that day' };
    return { kind: 'strength', countsSession: true, xp: importXp('strength', w.durationMin) };
  }

  if (CARDIO_TYPES.has(w.type)) {
    return { kind: 'cardio', countsSession: true, xp: importXp('cardio', w.durationMin) };
  }

  // Walks and other light activity: worth keeping (and rewarding a little),
  // but a 20-min auto-detected walk must not count as a training session.
  if (w.type === 'walking' && w.durationMin < 30) {
    return { kind: 'skip', countsSession: false, xp: 0, reason: 'short walk' };
  }
  return { kind: 'activity', countsSession: false, xp: importXp('activity', w.durationMin) };
}

const TYPE_LABEL: Record<string, string> = {
  running: 'Run', walking: 'Walk', hiking: 'Hike', cycling: 'Ride', swimming: 'Swim',
  rowing: 'Row', elliptical: 'Elliptical', stairs: 'Stairs', hiit: 'HIIT',
  strength: 'Strength', calisthenics: 'Calisthenics', yoga: 'Yoga', pilates: 'Pilates',
  workout: 'Workout',
};

/** Display name for an imported session — the ⌚ marks it as watch-recorded. */
export function importLabel(w: GarminWorkout): string {
  const base = w.title?.trim() || TYPE_LABEL[w.type] || 'Workout';
  return `⌚ ${base}`;
}
