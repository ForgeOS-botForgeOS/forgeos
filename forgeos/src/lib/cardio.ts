import type { CardioMetric } from '../types';

export const CARDIO_MACHINES = ['Run', 'Treadmill', 'Rower', 'Bike', 'Ski-erg', 'Elliptical', 'Stairmaster', 'Swim', 'Walk', 'Parkour', 'Karate', 'Boxing', 'HIIT', 'Yoga', 'Climbing'];

// Not every activity is measured in kilometres. Each one has a "primary metric"
// that the form and scoring adapt to — distance for machines/runs, an intensity
// dial for combat/HIIT/yoga, laps for swimming, a climbing grade for climbing.
// The value is stored in CardioData.distanceKm (kept for back-compat) and just
// interpreted differently per type.
export type CardioMetricType = 'distance' | 'intensity' | 'grade' | 'laps';

const ACTIVITY_METRIC: Record<string, CardioMetricType> = {
  Karate: 'intensity',
  Boxing: 'intensity',
  HIIT: 'intensity',
  Yoga: 'intensity',
  Swim: 'laps',
  Climbing: 'grade',
};

export function metricTypeFor(activity: string): CardioMetricType {
  return ACTIVITY_METRIC[activity] ?? 'distance';
}

// Field config for each primary metric: the label, stepper bounds, whether the
// speed/pace readouts apply, and an optional display formatter.
export const METRIC_FIELD: Record<CardioMetricType, { label: string; step: number; min: number; max: number; showSpeed: boolean; format?: (v: number) => string }> = {
  distance: { label: 'Distance (km)', step: 0.1, min: 0, max: 1000, showSpeed: true },
  intensity: { label: 'Intensity (1–10)', step: 1, min: 0, max: 10, showSpeed: false },
  laps: { label: 'Laps', step: 1, min: 0, max: 400, showSpeed: false },
  grade: { label: 'Top grade (V-scale)', step: 1, min: 0, max: 17, showSpeed: false, format: (v) => `V${Math.round(v)}` },
};

// Human label for the primary value of an activity (used in toasts).
export function primaryValueLabel(activity: string, value: number): string {
  const type = metricTypeFor(activity);
  const f = METRIC_FIELD[type];
  if (f.format) return f.format(value);
  if (type === 'distance') return `${value}km`;
  if (type === 'laps') return `${Math.round(value)} laps`;
  return `intensity ${Math.round(value)}`;
}

// One editable cardio session: the core numbers plus any metrics you define.
export interface CardioData {
  machine: string;
  distanceKm: number;
  durationMin: number;
  calories: number;
  metrics: CardioMetric[];
}

export function newCardioData(partial: Partial<CardioData> = {}): CardioData {
  return { machine: 'Run', distanceKm: 5, durationMin: 30, calories: 0, metrics: [], ...partial };
}

// Pure conversions between the three things a watch/console shows: distance,
// time and speed. Distance + time are the source of truth; speed and pace are
// always derived so they stay consistent no matter which fields a photo read.

// Average speed in km/h from distance (km) and duration (minutes).
export function speedKmh(distanceKm: number, durationMin: number): number {
  if (distanceKm <= 0 || durationMin <= 0) return 0;
  return Math.round((distanceKm / (durationMin / 60)) * 10) / 10;
}

// Pace as "m:ss /km" from distance (km) and duration (minutes).
export function paceLabel(distanceKm: number, durationMin: number): string {
  if (distanceKm <= 0 || durationMin <= 0) return '—';
  const pace = durationMin / distanceKm; // minutes per km
  let m = Math.floor(pace);
  let s = Math.round((pace - m) * 60);
  if (s === 60) { m += 1; s = 0; } // carry rounding (e.g. 5:59.6 → 6:00)
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

// Duration (minutes) implied by a distance and a target speed — used when a
// photo only yields distance + speed and time has to be back-filled.
export function durationFromSpeed(distanceKm: number, kmh: number): number {
  if (distanceKm <= 0 || kmh <= 0) return 0;
  return Math.round((distanceKm / kmh) * 60 * 10) / 10;
}
