import type { HealthDay, Workout } from '../types';
import { computeReadiness, median } from './readiness';

// Forge Coach: small, honest insights computed 100% locally by correlating the
// user's own workouts with their own recovery data. No AI, no uploads — just
// arithmetic over the stores, so it can never hallucinate.

export interface CoachInsight {
  icon: string;
  text: string;
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function avg(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function fmtH(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** How many distinct days of health data exist (insights unlock at 14). */
export function coachDataDays(days: HealthDay[]): number {
  return days.length;
}

/**
 * Up to 3 insights, strongest-signal first. Empty when there isn't enough
 * overlapping data yet — callers show the "keep syncing" hint instead.
 */
export function coachInsights(history: Workout[], days: HealthDay[]): CoachInsight[] {
  const out: CoachInsight[] = [];
  if (days.length < 14) return out;

  const byDate = new Map<string, HealthDay>(days.map((d) => [d.date, d]));
  const trainedDates = new Set(history.filter((w) => w.completed).map((w) => dateKey(w.date)));

  // 1) Sleep before training days vs other days. "Sleep on date D" is the
  //    night leading into D (we bucket sleep by the morning it ended).
  const sleepTrain: number[] = [];
  const sleepRest: number[] = [];
  for (const d of days) {
    if (typeof d.sleepMinutes !== 'number') continue;
    (trainedDates.has(d.date) ? sleepTrain : sleepRest).push(d.sleepMinutes);
  }
  const aTrain = avg(sleepTrain);
  const aRest = avg(sleepRest);
  if (aTrain != null && aRest != null && sleepTrain.length >= 3 && sleepRest.length >= 3) {
    const diff = Math.round(aTrain - aRest);
    if (Math.abs(diff) >= 20) {
      out.push({
        icon: '😴',
        text:
          diff > 0
            ? `You sleep ${fmtH(diff)} more before training days — your body preps for work. Keep it up.`
            : `You sleep ${fmtH(-diff)} less before training days. An earlier night before sessions could unlock more.`,
      });
    }
  }

  // 2) Session volume when well-recovered vs run down.
  const baselineRhr = (() => {
    const rhrs = days.map((d) => d.restingHr).filter((v): v is number => typeof v === 'number');
    return rhrs.length >= 3 ? median(rhrs) : undefined;
  })();
  const volReady: number[] = [];
  const volTired: number[] = [];
  for (const w of history) {
    if (!w.completed || !w.totalVolumeKg) continue;
    const d = byDate.get(dateKey(w.date));
    if (!d) continue;
    const r = computeReadiness(d, baselineRhr);
    if (!r) continue;
    (r.score >= 70 ? volReady : volTired).push(w.totalVolumeKg);
  }
  const aReady = avg(volReady);
  const aTired = avg(volTired);
  if (aReady != null && aTired != null && volReady.length >= 3 && volTired.length >= 3 && aTired > 0) {
    const pct = Math.round((aReady / aTired - 1) * 100);
    if (Math.abs(pct) >= 10) {
      out.push({
        icon: '📊',
        text:
          pct > 0
            ? `You move ${pct}% more volume on days you wake up Ready (70+) — recovery is literally strength.`
            : `Oddly, you push ${-pct}% harder on tired days — watch that; it's how overtraining sneaks in.`,
      });
    }
  }

  // 3) Weekday with the best sleep (a nudge to copy what already works).
  const byWeekday: number[][] = Array.from({ length: 7 }, () => []);
  for (const d of days) {
    if (typeof d.sleepMinutes !== 'number') continue;
    byWeekday[new Date(d.date + 'T12:00:00').getDay()].push(d.sleepMinutes);
  }
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let best = -1;
  let bestAvg = -1;
  let worst = -1;
  let worstAvg = Infinity;
  byWeekday.forEach((xs, i) => {
    if (xs.length < 2) return;
    const a = avg(xs)!;
    if (a > bestAvg) { bestAvg = a; best = i; }
    if (a < worstAvg) { worstAvg = a; worst = i; }
  });
  if (best >= 0 && worst >= 0 && best !== worst && bestAvg - worstAvg >= 30) {
    out.push({
      icon: '🗓️',
      text: `${names[best]} nights are your best sleep (${fmtH(Math.round(bestAvg))}); ${names[worst]}s are the weak spot (${fmtH(Math.round(worstAvg))}).`,
    });
  }

  // 4) Steps on rest days (active recovery check) — fills the third slot if free.
  if (out.length < 3) {
    const stepsRest: number[] = [];
    for (const d of days) {
      if (typeof d.steps === 'number' && !trainedDates.has(d.date)) stepsRest.push(d.steps);
    }
    const a = avg(stepsRest);
    if (a != null && stepsRest.length >= 3) {
      out.push(
        a >= 7000
          ? { icon: '🚶', text: `Rest days average ${Math.round(a / 100) * 100} steps — great active recovery.` }
          : { icon: '🚶', text: `Rest days average only ${Math.round(a / 100) * 100} steps. A short walk speeds up recovery more than the sofa.` },
      );
    }
  }

  return out.slice(0, 3);
}

/** Days since the first health day — used for "insights unlock in N days". */
export function daysUntilInsights(days: HealthDay[]): number {
  return Math.max(0, 14 - days.length);
}
