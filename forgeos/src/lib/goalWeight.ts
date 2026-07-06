import type { WeighIn } from '../types';

// Weight-trend maths for the goal-weight feature: how fast is the (smoothed)
// scale moving, and when does it reach the target at that pace? Pure — the
// WeighInTracker card renders the result.

const WINDOW_DAYS = 42; // trend window: recent enough to reflect the current diet phase
const MIN_SPAN_DAYS = 7; // don't extrapolate from a couple of same-week points
const FLAT_KG_PER_WEEK = 0.05; // below this the scale counts as flat
const MAX_ETA_WEEKS = 104; // beyond ~2 years a projection is noise, not a date

export interface WeightTrend {
  /** kg per week, negative when losing. Rounded to 2 decimals. */
  ratePerWeek: number;
  /** Latest 3-point rolling average — the "real" current weight. */
  currentKg: number;
  /** ISO date the goal is reached at the current rate, or null when the
   *  scale is flat / moving away from the goal / more than 2 years out. */
  etaDate: string | null;
  etaWeeks: number | null;
}

/** Rolling 3-point average at the end of a series. */
function smoothedEnd(list: WeighIn[]): number {
  const tail = list.slice(-3);
  return tail.reduce((a, w) => a + w.weightKg, 0) / tail.length;
}

/**
 * Trend from the recent weigh-ins (last 6 weeks), plus the projected date the
 * goal weight is reached. Returns null while there isn't enough data to say
 * anything honest (fewer than 2 recent points, or all within the same week).
 */
export function weightTrend(weighIns: WeighIn[], goalKg?: number, now = new Date()): WeightTrend | null {
  const cutoff = new Date(now.getTime() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const recent = weighIns
    .filter((w) => w.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (recent.length < 2) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const spanDays = (Date.parse(last.date) - Date.parse(first.date)) / 86400000;
  if (spanDays < MIN_SPAN_DAYS) return null;

  // Least-squares slope over every recent point — robust to daily noise
  // without the span-shrinking bias of comparing smoothed endpoints.
  const t0 = Date.parse(first.date);
  const pts = recent.map((w) => ({ x: (Date.parse(w.date) - t0) / 86400000, y: w.weightKg }));
  const n = pts.length;
  const meanX = pts.reduce((a, p) => a + p.x, 0) / n;
  const meanY = pts.reduce((a, p) => a + p.y, 0) / n;
  const slope =
    pts.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0) /
    pts.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  const currentKg = smoothedEnd(recent);
  const ratePerWeek = Math.round(slope * 7 * 100) / 100;

  let etaDate: string | null = null;
  let etaWeeks: number | null = null;
  if (goalKg !== undefined && goalKg > 0) {
    const deltaKg = goalKg - currentKg;
    const converging = Math.abs(ratePerWeek) >= FLAT_KG_PER_WEEK && Math.sign(deltaKg) === Math.sign(ratePerWeek);
    if (Math.abs(deltaKg) < 0.5) {
      // Already there — no projection needed.
      etaWeeks = 0;
      etaDate = now.toISOString().slice(0, 10);
    } else if (converging) {
      const weeks = deltaKg / ratePerWeek;
      if (weeks <= MAX_ETA_WEEKS) {
        etaWeeks = Math.round(weeks * 10) / 10;
        etaDate = new Date(now.getTime() + weeks * 7 * 86400000).toISOString().slice(0, 10);
      }
    }
  }
  return { ratePerWeek, currentKg: Math.round(currentKg * 10) / 10, etaDate, etaWeeks };
}

/** Whole days since the most recent weigh-in, or null when there is none. */
export function daysSinceWeighIn(weighIns: WeighIn[], now = new Date()): number | null {
  if (weighIns.length === 0) return null;
  const latest = weighIns.reduce((a, w) => (w.date > a ? w.date : a), weighIns[0].date);
  return Math.floor((now.getTime() - Date.parse(latest)) / 86400000);
}
