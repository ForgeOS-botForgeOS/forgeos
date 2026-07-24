import type { UserProfile, WeighIn } from '../types';

export const GOAL_LABEL: Record<UserProfile['goal'], { label: string; emoji: string }> = {
  lose: { label: 'Cut', emoji: '🔥' },
  gain: { label: 'Bulk', emoji: '📈' },
  recomp: { label: 'Recomp', emoji: '⚖️' },
  maintain: { label: 'Maintain', emoji: '🧭' },
  strength: { label: 'Strength', emoji: '🏋️' },
};

export interface GoalPhase { goal: UserProfile['goal']; startISO: string }
export interface PhaseSpan { goal: UserProfile['goal']; startISO: string; weeks: number; current: boolean }

// Turn the raw phase log into spans with a length in weeks (last one is ongoing).
export function phaseSpans(history: GoalPhase[], now = Date.now()): PhaseSpan[] {
  return history.map((p, i) => {
    const end = i < history.length - 1 ? new Date(history[i + 1].startISO).getTime() : now;
    const weeks = Math.max(0, Math.round((end - new Date(p.startISO).getTime()) / (7 * 86_400_000)));
    return { goal: p.goal, startISO: p.startISO, weeks, current: i === history.length - 1 };
  });
}

// Weight trend in kg: average of the newer half of weigh-ins minus the older half
// (positive = gaining). Null until there's enough data to be meaningful.
function recentTrendKg(weighIns: WeighIn[]): number | null {
  if (weighIns.length < 4) return null;
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const half = Math.floor(sorted.length / 2);
  const older = sorted.slice(Math.max(0, half - 6), half);
  const newer = sorted.slice(half, half + 6);
  if (!older.length || !newer.length) return null;
  const avg = (a: WeighIn[]) => a.reduce((s, w) => s + w.weightKg, 0) / a.length;
  return Math.round((avg(newer) - avg(older)) * 10) / 10;
}

// Suggest a goal switch when the weight trend no longer matches the chosen goal.
export function goalNudge(goal: UserProfile['goal'], weighIns: WeighIn[]): string | null {
  const trend = recentTrendKg(weighIns);
  if (trend === null) return null;
  const flat = Math.abs(trend) < 0.4;
  if (goal === 'lose' && trend >= -0.2) {
    return flat
      ? 'Your weight’s been flat on a cut — a short maintenance break or a slightly bigger deficit can restart the loss.'
      : 'You’re gaining while cutting — tighten the deficit, or switch to Maintain for a bit.';
  }
  if (goal === 'gain' && trend <= 0.2) {
    return flat
      ? 'Not much scale movement on a bulk — nudge calories up ~10% to keep gaining.'
      : 'You’re losing weight on a bulk — you likely need to eat more.';
  }
  if (goal === 'recomp' && Math.abs(trend) > 1) {
    return 'Your weight’s moving fast for a recomp — ease toward maintenance to keep it a true recomp.';
  }
  return null;
}
