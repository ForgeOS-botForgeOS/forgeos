import type { CardioMetric } from '../types';

export const CARDIO_MACHINES = ['Run', 'Treadmill', 'Rower', 'Bike', 'Ski-erg', 'Elliptical', 'Stairmaster', 'Swim', 'Walk', 'Parkour', 'Karate'];

// Karate is scored by intensity, not distance — the form swaps the distance
// field for an intensity dial (1–10) and hides the speed/pace readouts.
export const INTENSITY_ACTIVITIES = ['Karate'];

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
