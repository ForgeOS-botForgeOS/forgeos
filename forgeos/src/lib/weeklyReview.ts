import type { HealthDay, PR, Workout } from '../types';
import { computeReadiness } from './readiness';

// Monday-morning coach recap: what last week actually looked like and one
// thing to focus on. Same philosophy as coach.ts — 100% local arithmetic over
// the user's own data, so it can never hallucinate.

export interface WeeklyReview {
  weekLabel: string; // e.g. "13 – 19 Jul"
  weekStartISO: string; // Monday of the reviewed week (dismissal key)
  sessions: number;
  volumeKg: number;
  prCount: number;
  bestSet: { exerciseName: string; weightKg: number } | null;
  volumeDeltaPct: number | null; // vs the week before that
  readinessTrend: 'up' | 'down' | null;
  focusKey: string; // i18n key, e.g. 'wr.focus.keepRhythm' — resolved in the UI
}

const WEEK_MS = 7 * 86_400_000;
const VOLUME_DROP_PCT = -20;
const READINESS_TREND_MIN_DELTA = 5;

/** Monday 00:00 (local) of the week `now` falls in. */
export function weekStart(now: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // Sun=0 … Sat=6
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d;
}

function within(iso: string, from: number, to: number): boolean {
  const t = new Date(iso).getTime();
  return t >= from && t < to;
}

function label(from: Date, to: Date, locale: string): string {
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function pickFocus(r: Omit<WeeklyReview, 'focusKey'>): string {
  if (r.readinessTrend === 'down') return 'wr.focus.recoveryDown';
  if (r.volumeDeltaPct != null && r.volumeDeltaPct <= VOLUME_DROP_PCT) return 'wr.focus.volumeDip';
  if (r.prCount === 0 && (r.volumeDeltaPct ?? 0) > 0) return 'wr.focus.chasePR';
  if (r.prCount > 0) return 'wr.focus.ridePRs';
  return 'wr.focus.keepRhythm';
}

/**
 * Review of the last *completed* week (Mon–Sun before the current one).
 * Null when that week had no finished workouts — nothing to review.
 */
export function buildWeeklyReview(history: Workout[], prs: PR[], days: HealthDay[], now: number, locale = 'en-GB'): WeeklyReview | null {
  const thisMonday = weekStart(now).getTime();
  const from = thisMonday - WEEK_MS;
  const week = history.filter((w) => w.completed && within(w.date, from, thisMonday));
  if (week.length === 0) return null;

  const volumeKg = week.reduce((sum, w) => sum + (w.totalVolumeKg ?? 0), 0);
  const prevWeek = history.filter((w) => w.completed && within(w.date, from - WEEK_MS, from));
  const prevVolume = prevWeek.reduce((sum, w) => sum + (w.totalVolumeKg ?? 0), 0);
  const volumeDeltaPct = prevVolume > 0 ? Math.round(((volumeKg - prevVolume) / prevVolume) * 100) : null;

  let bestSet: WeeklyReview['bestSet'] = null;
  const weekPrs = prs.filter((p) => within(p.date, from, thisMonday));
  for (const p of weekPrs) {
    if (!bestSet || p.weightKg > bestSet.weightKg) bestSet = { exerciseName: p.exerciseName, weightKg: p.weightKg };
  }

  // Readiness trend: average of the week's first half vs second half.
  const weekDays = days
    .filter((d) => within(`${d.date}T12:00:00`, from, thisMonday))
    .sort((a, b) => a.date.localeCompare(b.date));
  let readinessTrend: WeeklyReview['readinessTrend'] = null;
  const scores = weekDays
    .map((d) => computeReadiness(d)?.score)
    .filter((s): s is number => typeof s === 'number');
  if (scores.length >= 4) {
    const half = Math.floor(scores.length / 2);
    const first = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const second = scores.slice(-half).reduce((a, b) => a + b, 0) / half;
    if (second - first >= READINESS_TREND_MIN_DELTA) readinessTrend = 'up';
    else if (first - second >= READINESS_TREND_MIN_DELTA) readinessTrend = 'down';
  }

  const base = {
    weekLabel: label(new Date(from), new Date(thisMonday - 86_400_000), locale),
    weekStartISO: new Date(from).toISOString().slice(0, 10),
    sessions: week.length,
    volumeKg: Math.round(volumeKg),
    prCount: weekPrs.length,
    bestSet,
    volumeDeltaPct,
    readinessTrend,
  };
  return { ...base, focusKey: pickFocus(base) };
}
