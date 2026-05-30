import type { Workout } from '../types';
import { e1rm, volumeOf } from './fitness';
import { exerciseById } from '../data/exercises';

// ---- Plateau Breaker ----
// Flags a core lift whose best e1RM hasn't improved across ~3 weeks of sessions.
export interface PlateauFlag {
  exerciseId: string;
  exerciseName: string;
  weeksStuck: number;
  suggestion: string;
}

export function detectPlateaus(history: Workout[]): PlateauFlag[] {
  const recent = history.slice(0, 40);
  const byExercise = new Map<string, { date: string; e1rm: number }[]>();
  for (const w of recent) {
    for (const we of w.exercises) {
      const ex = exerciseById(we.exerciseId);
      if (!ex?.isCore) continue;
      const best = Math.max(0, ...we.sets.filter((s) => s.completed).map((s) => e1rm(s.weightKg, s.reps)));
      if (best <= 0) continue;
      const arr = byExercise.get(we.exerciseId) ?? [];
      arr.push({ date: w.date, e1rm: best });
      byExercise.set(we.exerciseId, arr);
    }
  }

  const flags: PlateauFlag[] = [];
  for (const [id, points] of byExercise) {
    if (points.length < 3) continue;
    const sorted = points.sort((a, b) => a.date.localeCompare(b.date));
    const last3 = sorted.slice(-3);
    const first = last3[0].e1rm;
    const improved = last3.some((p) => p.e1rm > first * 1.01);
    const spanDays = (new Date(last3[2].date).getTime() - new Date(last3[0].date).getTime()) / 86400000;
    if (!improved && spanDays >= 14) {
      const ex = exerciseById(id);
      flags.push({
        exerciseId: id,
        exerciseName: ex?.name ?? 'Lift',
        weeksStuck: Math.round(spanDays / 7),
        suggestion:
          'No progress in 3 weeks. Try a variation (e.g. pause/tempo) for 2 weeks or run a 10% deload, then re-test.',
      });
    }
  }
  return flags;
}

// ---- Per-lift e1RM progression series (oldest -> newest) ----
export function e1rmSeries(history: Workout[], exerciseId: string): { date: string; e1rm: number }[] {
  const points: { date: string; e1rm: number }[] = [];
  for (const w of [...history].reverse()) {
    const we = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (!we) continue;
    const best = Math.max(0, ...we.sets.filter((s) => s.completed).map((s) => e1rm(s.weightKg, s.reps)));
    if (best > 0) points.push({ date: w.date.slice(5, 10), e1rm: best });
  }
  return points;
}

// ---- Adaptive periodisation engine ----
// Reads recent volume + average RPE and recommends the next block.
export interface PeriodisationRec {
  nextBlock: 'hypertrophy' | 'strength' | 'deload';
  reason: string;
  avgRpe: number;
  weeklyVolume: number;
}

export function recommendBlock(history: Workout[]): PeriodisationRec {
  const recent = history.slice(0, 24);
  let volume = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  for (const w of recent) {
    for (const we of w.exercises) {
      for (const s of we.sets.filter((x) => x.completed)) {
        volume += volumeOf(s.weightKg, s.reps);
        if (s.rpe) {
          rpeSum += s.rpe;
          rpeCount++;
        }
      }
    }
  }
  const weeks = Math.max(1, Math.min(6, Math.ceil(recent.length / 4)));
  const weeklyVolume = Math.round(volume / weeks);
  const avgRpe = rpeCount ? Math.round((rpeSum / rpeCount) * 10) / 10 : 0;

  if (avgRpe >= 8.7 && rpeCount > 8) {
    return { nextBlock: 'deload', reason: 'Average RPE is very high — accumulated fatigue suggests a deload week.', avgRpe, weeklyVolume };
  }
  if (avgRpe >= 7.5) {
    return { nextBlock: 'strength', reason: 'Intensity has been high — shift to lower reps / heavier loads to convert size into strength.', avgRpe, weeklyVolume };
  }
  return { nextBlock: 'hypertrophy', reason: 'Effort has room to grow — add volume in the 8–12 rep range to drive new muscle.', avgRpe, weeklyVolume };
}
