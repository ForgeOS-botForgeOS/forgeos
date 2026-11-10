import type { WeekPlan, Workout } from '../types';

const DAY = 86400000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface DayVolume {
  /** Weekday key ("Mon"…"Sun") — also the i18n suffix for its short label. */
  day: string;
  volume: number;
  today: boolean;
}

/**
 * Training volume for the last seven days, oldest first, ending today.
 *
 * Home used to chart Monday-to-Sunday of the calendar week, so every Monday
 * it was empty and its total disagreed with the muscle-volume card beside it,
 * which already counted a rolling seven days. Both now share this window.
 */
export function last7DaysVolume(history: Pick<Workout, 'date' | 'totalVolumeKg'>[], now = new Date()): DayVolume[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const buckets: DayVolume[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    return { day: WEEKDAYS[d.getDay()], volume: 0, today: i === 6 };
  });
  for (const w of history) {
    const t = new Date(w.date);
    if (Number.isNaN(t.getTime())) continue;
    t.setHours(0, 0, 0, 0);
    const idx = Math.round((t.getTime() - start.getTime()) / DAY);
    if (idx >= 0 && idx < 7) buckets[idx].volume += Math.round(w.totalVolumeKg ?? 0);
  }
  return buckets;
}

export type TodayFocus =
  | { kind: 'done' }
  | { kind: 'session'; label: string; exercises: number }
  | { kind: 'rest' }
  | { kind: 'open' };

/** What the Home hero should say about today: the planned session by name, a rest day, or nothing planned. */
export function todayFocus(plan: WeekPlan | null | undefined, trainedToday: boolean, now = new Date()): TodayFocus {
  if (trainedToday) return { kind: 'done' };
  const day = plan?.days.find((d) => d.day === WEEKDAYS[now.getDay()]);
  if (!day) return { kind: 'open' };
  if (day.rest || day.exerciseIds.length === 0) return { kind: 'rest' };
  return { kind: 'session', label: day.label, exercises: day.exerciseIds.length };
}
