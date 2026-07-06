import type { GarminWorkout, Workout, CardioLog } from '../types';
import { decideImport, importLabel, type ExistingWorkout } from './garminRules';
import { useHealth } from '../state/healthStore';
import { useWorkout } from '../state/workoutStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import { toast } from './toast';

// The impure half of the watch-workout import: applies garminRules decisions
// to the stores. Called after every Health Connect sync (App launch/foreground,
// Health screen, background-cache drain). Idempotent — every considered session
// id is remembered in healthStore.importedWorkoutIds, imported or not.

const uid = () => Math.random().toString(36).slice(2, 10);

const CARDIO_MACHINE: Record<string, string> = {
  running: 'Run', cycling: 'Bike', swimming: 'Swim', rowing: 'Rowing',
  elliptical: 'Elliptical', stairs: 'Stair climber', hiit: 'HIIT', hiking: 'Hike',
  walking: 'Walk',
};

function buildImported(w: GarminWorkout, kind: 'cardio' | 'strength' | 'activity', xp: number): Workout {
  const base: Workout = {
    id: `gw-${w.id.slice(0, 12)}-${uid()}`,
    name: importLabel(w),
    date: w.start,
    exercises: [],
    durationSec: Math.round(w.durationMin * 60),
    completed: true,
    totalVolumeKg: 0,
    xpEarned: xp,
  };
  if (kind !== 'strength') {
    // The history card titles cardio entries by `machine`, so the watch label
    // (with its ⌚ marker) goes there; the raw type keeps a fallback name.
    const cardio: CardioLog = {
      machine: w.title?.trim() ? importLabel(w) : `⌚ ${CARDIO_MACHINE[w.type] ?? (w.type.charAt(0).toUpperCase() + w.type.slice(1))}`,
      distanceKm: w.distanceKm ?? 0,
      durationMin: Math.round(w.durationMin),
      calories: w.calories,
    };
    base.cardio = cardio;
  }
  return base;
}

/**
 * Merge watch-recorded sessions into workout history. Returns how many were
 * imported; shows one summary toast when anything new arrived.
 */
export function ingestGarminWorkouts(workouts: GarminWorkout[]): number {
  if (!workouts.length) return 0;
  const settings = useSettings.getState();
  if (!settings.recoveryEnabled || !settings.autoImportWorkouts) return 0;

  const handled = useHealth.getState().importedWorkoutIds;
  const fresh = workouts.filter((w) => !handled[w.id]);
  if (!fresh.length) return 0;

  const history = useWorkout.getState().history;
  const existing: ExistingWorkout[] = history.map((h) => ({
    date: h.date,
    isCardio: !!h.cardio,
    fromWatch: h.id.startsWith('gw-'),
  }));

  let imported = 0;
  let totalXp = 0;
  const newEntries: Workout[] = [];
  // Oldest first so history order (and streak accounting) reads naturally.
  const sorted = [...fresh].sort((a, b) => (a.start < b.start ? -1 : 1));
  for (const w of sorted) {
    const d = decideImport(w, existing);
    if (d.kind === 'skip') continue;
    const entry = buildImported(w, d.kind, d.xp);
    newEntries.push(entry);
    existing.push({ date: entry.date, isCardio: !!entry.cardio, fromWatch: true });
    if (d.countsSession) useGami.getState().countSession(entry.date);
    totalXp += d.xp;
    imported++;
  }

  if (newEntries.length) {
    useWorkout.setState((s) => ({ history: [...newEntries.reverse(), ...s.history] }));
    useGami.getState().addXp(totalXp);
    toast(`⌚ ${imported} Garmin workout${imported > 1 ? 's' : ''} imported +${totalXp} XP`, 'success');
  }
  // Skips are remembered too — a session judged once is never re-judged.
  useHealth.getState().markWorkoutsHandled(fresh.map((w) => w.id));
  return imported;
}
