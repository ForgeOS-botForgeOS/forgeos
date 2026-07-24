import type { PR, Workout } from '../types';

export interface PrPoint { t: number; e1rm: number; exercise: string; label: string }

// Every PR as a point in time (x = date, y = e1RM), for a coloured scatter.
export function prTimelineData(prs: PR[]): PrPoint[] {
  return prs
    .map((p) => ({ t: new Date(p.date).getTime(), e1rm: Math.round(p.e1rm), exercise: p.exerciseName, label: `${p.weightKg}kg × ${p.reps}` }))
    .sort((a, b) => a.t - b.t);
}

// Group PR points by lift so each lift is its own coloured series.
export function prSeriesByLift(points: PrPoint[]): { exercise: string; points: PrPoint[] }[] {
  const map = new Map<string, PrPoint[]>();
  for (const p of points) {
    const arr = map.get(p.exercise) ?? [];
    arr.push(p);
    map.set(p.exercise, arr);
  }
  return [...map.entries()].map(([exercise, pts]) => ({ exercise, points: pts }));
}

export interface XpPoint { t: number; xp: number }

// A cumulative XP-over-time curve. There's no logged XP history, so we estimate
// each session's contribution from its volume, accumulate, then scale the whole
// curve so the final point equals the real current XP — an honest approximation
// of the shape that always ends at your true total.
export function xpCurveData(history: Workout[], currentXp: number): XpPoint[] {
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length === 0) return currentXp > 0 ? [{ t: Date.now(), xp: currentXp }] : [];
  let cum = 0;
  const raw = sorted.map((w) => {
    cum += (w.totalVolumeKg ?? 0) + 500; // per-session base + volume weight
    return { t: new Date(w.date).getTime(), cum };
  });
  const total = raw[raw.length - 1].cum || 1;
  return raw.map((r) => ({ t: r.t, xp: Math.round((r.cum / total) * currentXp) }));
}
