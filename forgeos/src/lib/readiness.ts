import type { HealthDay } from '../types';

// Turns raw wearable numbers into a single daily "how recovered am I?" signal,
// with severity tiers the rest of the app can lean on. Pure & deterministic so
// it can be unit-tested and reused on any screen.

export type ReadinessLevel = 'primed' | 'ready' | 'maintain' | 'rundown' | 'rest';

export interface Readiness {
  date: string;
  score: number; // 0–100
  level: ReadinessLevel;
  label: string;
  emoji: string;
  color: string; // a theme var, e.g. 'rgb(var(--success))'
  advice: string;
  factors: string[]; // short human breakdown of what drove the score
}

interface Tier {
  level: ReadinessLevel; min: number; label: string; emoji: string; color: string; advice: string;
}

// Highest threshold first; first match wins.
const TIERS: Tier[] = [
  { level: 'primed', min: 85, label: 'Primed', emoji: '🔥', color: 'rgb(var(--success))', advice: 'Green light — go for a PR or your hardest session.' },
  { level: 'ready', min: 70, label: 'Ready', emoji: '✅', color: 'rgb(var(--success))', advice: 'Well recovered — train as planned.' },
  { level: 'maintain', min: 50, label: 'Maintain', emoji: '🟡', color: 'rgb(var(--warn))', advice: 'A bit under — keep volume moderate, nail technique.' },
  { level: 'rundown', min: 30, label: 'Run-down', emoji: '🟠', color: 'rgb(var(--warn))', advice: 'Fatigued — drop the load or make today a deload.' },
  { level: 'rest', min: 0, label: 'Rest', emoji: '🔴', color: 'rgb(var(--danger))', advice: 'Run on empty — prioritise sleep and active recovery.' },
];

function tierFor(score: number): Tier {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

function fmtSleep(min: number): string {
  return `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;
}

/** Median of a numeric list (used for a robust resting-HR baseline). */
export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Each contributing signal returns a 0–100 sub-score plus its weight; we take a
// weighted average over whatever signals are actually present that day.
export function computeReadiness(day: HealthDay, baselineRhr?: number): Readiness | null {
  const parts: { score: number; weight: number; note: string }[] = [];

  // Sleep — prefer the device's own sleep score, else judge duration vs ~8h.
  if (typeof day.sleepScore === 'number') {
    parts.push({ score: clamp(day.sleepScore), weight: 3, note: `Sleep score ${day.sleepScore}` });
  } else if (typeof day.sleepMinutes === 'number') {
    const s = clamp((day.sleepMinutes / 480) * 100);
    parts.push({ score: s, weight: 3, note: `Slept ${fmtSleep(day.sleepMinutes)}` });
  }

  // Resting HR vs personal baseline — elevated RHR is a classic fatigue flag.
  if (typeof day.restingHr === 'number' && typeof baselineRhr === 'number' && baselineRhr > 0) {
    const delta = day.restingHr - baselineRhr;
    // 0 delta → 90; each bpm over baseline ≈ −7; under baseline a small bonus.
    const s = clamp(90 - Math.max(0, delta) * 7 + Math.max(-10, Math.min(0, delta)) * -2);
    const sign = delta === 0 ? 'on baseline' : delta > 0 ? `+${delta} vs usual` : `${delta} vs usual`;
    parts.push({ score: s, weight: 2, note: `Resting HR ${day.restingHr} (${sign})` });
  } else if (typeof day.restingHr === 'number') {
    parts.push({ score: 70, weight: 0.5, note: `Resting HR ${day.restingHr}` });
  }

  // Body Battery / stress — already a 0–100 recovery gauge from Garmin.
  if (typeof day.bodyBattery === 'number') {
    parts.push({ score: clamp(day.bodyBattery), weight: 2, note: `Body Battery ${day.bodyBattery}` });
  }
  if (typeof day.stress === 'number') {
    parts.push({ score: clamp(100 - day.stress), weight: 1, note: `Stress ${day.stress}` });
  }

  if (!parts.length) return null;

  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round(parts.reduce((a, p) => a + p.score * p.weight, 0) / totalW);
  const tier = tierFor(score);
  return {
    date: day.date,
    score,
    level: tier.level,
    label: tier.label,
    emoji: tier.emoji,
    color: tier.color,
    advice: tier.advice,
    factors: parts.map((p) => p.note),
  };
}

/** Convenience: readiness for the most recent day, using prior days for the RHR baseline. */
export function readinessFromDays(days: HealthDay[]): Readiness | null {
  if (!days.length) return null;
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];
  const priorRhr = sorted.slice(1, 21).map((d) => d.restingHr).filter((v): v is number => typeof v === 'number');
  const baseline = priorRhr.length >= 3 ? median(priorRhr) : undefined;
  return computeReadiness(latest, baseline);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}
