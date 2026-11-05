import { shareBase } from './publicUrl';
import type { ExerciseTarget, PlannedDay, Weekday, WeekPlan } from '../types';
import { cleanNumber, displayTitle } from './sanitize';

// Encode a week plan into a compact URL-safe string and back, so it can be
// shared via a link or code with friends (no backend needed).
export function encodePlan(plan: WeekPlan): string {
  const json = JSON.stringify(plan);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const WEEKDAYS: readonly Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Rebuild a plan from an untrusted object, keeping only fields we understand.
 *
 * A plan link is written by a stranger and, once imported, is persisted and read
 * by every screen on every launch. The old code kept whatever JSON arrived, so
 * a link with `days:[{}]` or `exerciseIds:5` was saved verbatim and crashed the
 * plan, Home and Train screens on each start until storage was cleared. This
 * copies known keys only (so `__proto__`/extra keys are dropped), bounds every
 * array and cleans every string. Null means "not a usable plan".
 */
export function sanitizePlan(raw: unknown): WeekPlan | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.days) || r.days.length === 0 || r.days.length > 7) return null;
  const days: PlannedDay[] = [];
  for (const d of r.days) {
    if (typeof d !== 'object' || d === null) return null;
    const x = d as Record<string, unknown>;
    if (!WEEKDAYS.includes(x.day as Weekday)) return null;
    const exerciseIds = (Array.isArray(x.exerciseIds) ? x.exerciseIds : [])
      .filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(id))
      .slice(0, 40);
    const targets: Record<string, ExerciseTarget> = {};
    if (typeof x.targets === 'object' && x.targets !== null && !Array.isArray(x.targets)) {
      for (const id of exerciseIds) {
        const t = Object.prototype.hasOwnProperty.call(x.targets, id) ? (x.targets as Record<string, unknown>)[id] : undefined;
        if (typeof t !== 'object' || t === null) continue;
        const tt = t as Record<string, unknown>;
        const weight = cleanNumber(tt.weightKg, 0, 1000, 0);
        targets[id] = {
          sets: Math.round(cleanNumber(tt.sets, 1, 20, 3)),
          reps: Math.round(cleanNumber(tt.reps, 1, 100, 8)),
          ...(weight > 0 ? { weightKg: weight } : {}),
        };
      }
    }
    days.push({
      day: x.day as Weekday,
      label: displayTitle(x.label, 'Day').slice(0, 40),
      rest: x.rest === true,
      exerciseIds,
      ...(Object.keys(targets).length ? { targets } : {}),
    });
  }
  return {
    id: displayTitle(r.id, 'imported').slice(0, 64),
    blockType: r.blockType === 'strength' ? 'strength' : 'hypertrophy',
    days,
  };
}

export function decodePlan(code: string): WeekPlan | null {
  try {
    // A plan for a week is a few KB; refuse anything a link has no business carrying.
    if (code.length > 60_000) return null;
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    return sanitizePlan(JSON.parse(json));
  } catch {
    return null;
  }
}

// Full shareable link that opens the in-app import screen.
export function planShareUrl(plan: WeekPlan): string {
  const base = shareBase();
  return `${base}#/import?p=${encodePlan(plan)}`;
}

export async function sharePlan(plan: WeekPlan, name: string): Promise<'shared' | 'copied'> {
  const url = planShareUrl(plan);
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: 'My ForgeOS plan', text: `Check out my "${name}" training week on ForgeOS 💪`, url });
      return 'shared';
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
