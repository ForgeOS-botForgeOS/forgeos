// One canonical shape that ANY source app's progress is normalized into, before
// it's mapped into ForgeOS's stores. Lanes (API / file / screenshot) all produce
// this; everything downstream (validate, verify, map, merge) speaks only this.

export type TrustLevel = 'high' | 'medium' | 'low';
export type LaneId = 'api' | 'file' | 'screenshot';

export const LANE_TRUST: Record<LaneId, TrustLevel> = {
  api: 'high', // structured data straight from the source app
  file: 'medium', // a user-provided export (JSON/CSV/XML)
  screenshot: 'low', // vision/OCR extraction from an image
};

export interface CanonicalStreak {
  current?: number;
  longest?: number;
  lastActive?: string; // ISO date/datetime in the source
  startedAt?: string;
  freezes?: number;
}

export interface CanonicalPB {
  name: string;
  weightKg?: number;
  reps?: number;
  e1rm?: number;
  distanceKm?: number;
  durationMin?: number;
  date?: string;
}

export interface CanonicalDay {
  date: string; // yyyy-mm-dd
  volumeKg?: number;
  distanceKm?: number;
  durationMin?: number;
  sessions?: number;
}

export interface CanonicalBody {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  hipCm?: number;
}

export interface CanonicalProgress {
  source: string; // e.g. "Strava", "Hevy", "unknown"
  trust: TrustLevel;
  timezone?: string; // IANA, e.g. "Europe/Bratislava"
  memberSince?: string; // ISO — original join date (tenure)
  streak?: CanonicalStreak;
  totals?: {
    xp?: number;
    sessions?: number;
    timeMinutes?: number;
    heavyLifts?: number; // 100kg+ sets
  };
  level?: { rank?: string; value?: number };
  currency?: { coins?: number };
  achievements?: { id?: string; name: string }[];
  personalBests?: CanonicalPB[];
  history?: CanonicalDay[];
  bodyStats?: CanonicalBody[];
  settings?: { weeklyGoal?: number; units?: string; reminderTime?: string };
  /** Per-field 0..1 confidence — drives light verification on the screenshot lane. */
  confidence: Record<string, number>;
}

export const emptyCanonical = (source: string, trust: TrustLevel): CanonicalProgress => ({
  source,
  trust,
  confidence: {},
});
