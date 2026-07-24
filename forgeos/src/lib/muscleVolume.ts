import type { Workout, MuscleGroup } from '../types';
import { exerciseById } from '../data/exercises';

// Rough weekly working-set landmarks per muscle — MEV (minimum effective) to MRV
// (maximum recoverable). Guidance, not gospel; enough to flag neglect / overreach.
const RANGE: Partial<Record<MuscleGroup, { mev: number; mrv: number }>> = {
  Chest: { mev: 8, mrv: 22 },
  Back: { mev: 10, mrv: 25 },
  Shoulders: { mev: 8, mrv: 26 },
  Biceps: { mev: 6, mrv: 20 },
  Triceps: { mev: 6, mrv: 18 },
  Quads: { mev: 8, mrv: 20 },
  Hamstrings: { mev: 6, mrv: 16 },
  Glutes: { mev: 4, mrv: 16 },
  Calves: { mev: 6, mrv: 20 },
  Core: { mev: 6, mrv: 25 },
};

export type MuscleStatus = 'none' | 'low' | 'good' | 'high';
export interface MuscleLoad { muscle: MuscleGroup; sets: number; mev: number; mrv: number; status: MuscleStatus }

// Weekly sets per muscle from finished (non-cardio) workouts since `sinceISO`.
// The primary muscle earns a full set; each secondary earns a half set.
export function muscleVolume(history: Workout[], sinceISO: string): MuscleLoad[] {
  const since = new Date(sinceISO).getTime();
  const tally = new Map<MuscleGroup, number>();
  for (const w of history) {
    if (w.cardio || new Date(w.date).getTime() < since) continue;
    for (const we of w.exercises) {
      const completed = we.sets.filter((s) => s.completed).length;
      if (!completed) continue;
      const ex = exerciseById(we.exerciseId);
      if (!ex) continue;
      tally.set(ex.primary, (tally.get(ex.primary) ?? 0) + completed);
      for (const sec of ex.secondary) tally.set(sec, (tally.get(sec) ?? 0) + completed * 0.5);
    }
  }
  return (Object.keys(RANGE) as MuscleGroup[])
    .map((muscle) => {
      const r = RANGE[muscle]!;
      const sets = Math.round(tally.get(muscle) ?? 0);
      const status: MuscleStatus = sets === 0 ? 'none' : sets < r.mev ? 'low' : sets > r.mrv ? 'high' : 'good';
      return { muscle, sets, mev: r.mev, mrv: r.mrv, status };
    })
    .sort((a, b) => b.sets - a.sets);
}

// Muscles that are being neglected this week (no or too-little direct work).
export function neglectedMuscles(loads: MuscleLoad[]): MuscleGroup[] {
  return loads.filter((l) => l.status === 'none' || l.status === 'low').map((l) => l.muscle);
}
