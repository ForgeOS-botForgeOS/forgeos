import type { MuscleGroup, PR, Workout } from '../types';
import { exerciseById } from '../data/exercises';
import { e1rm } from './fitness';
import { localDateKey } from './dateKey';

// One workout as a story, Spotify-Wrapped style. Pure: everything the Wrap
// screen shows is decided here, so each archetype and edge case is testable.
// Two workouts never wrap the same way: the archetype (what kind of session it
// was) picks the colours, headline and an extra slide, and a seed from the
// workout id picks among that archetype's lines and fun comparisons.

export type WrapArchetype =
  | 'firstEver' // the very first session in the app
  | 'pr' // at least one personal record that day
  | 'comeback' // first session after 10+ days off
  | 'heavy' // low reps, heavy sets
  | 'volume' // well above your recent sessions
  | 'marathon' // 75+ minutes
  | 'quick' // 30 minutes or less
  | 'balanced' // a solid, ordinary day
  | 'cardioFar' // farther than last time on this machine
  | 'cardioFast' // faster than last time on this machine
  | 'cardioSteady'
  | 'watch'; // recorded on a watch: only a duration

export type TimeOfDay = 'dawn' | 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
export type WrapSlide = 'intro' | 'number' | 'hero' | 'prs' | 'muscles' | 'versus' | 'cardio' | 'comeback' | 'outro';

export interface WorkoutWrap {
  workoutId: string;
  kind: 'strength' | 'cardio' | 'watch';
  archetype: WrapArchetype;
  variant: number; // 0..2, which line of the archetype's copy to use
  name: string;
  dateISO: string;
  timeOfDay: TimeOfDay;
  sessionNumber: number; // nth completed session ever
  daysSincePrevious: number | null;
  volumeKg: number;
  sets: number;
  reps: number;
  durationMin: number;
  exerciseCount: number;
  topSet?: { name: string; weightKg: number; reps: number; e1rm: number };
  prs: { name: string; weightKg: number; reps: number }[];
  muscles: { muscle: MuscleGroup; sets: number; pct: number }[];
  versus?: { deltaPct: number; history: number[] }; // oldest → this session
  equivalent?: { key: EquivalentKey; count: number };
  cardio?: { machine: string; distanceKm: number; durationMin: number; calories?: number; paceSecPerKm?: number; speedKmh?: number; deltaPct?: number };
  palette: { from: string; via: string; to: string; glow: string };
  slides: WrapSlide[];
}

export type EquivalentKey = 'piano' | 'bear' | 'car' | 'hippo' | 'elephant' | 'trex' | 'bus' | 'whale';
const EQUIVALENTS: { key: EquivalentKey; kg: number }[] = [
  { key: 'piano', kg: 450 },
  { key: 'bear', kg: 600 },
  { key: 'car', kg: 1500 },
  { key: 'hippo', kg: 2500 },
  { key: 'elephant', kg: 6000 },
  { key: 'trex', kg: 8000 },
  { key: 'bus', kg: 12000 },
  { key: 'whale', kg: 150000 },
];

// Hues per archetype: the identity of each kind of day. Rendered as a
// full-bleed story (its own canvas, white type), so it sits outside the theme.
const HUES: Record<WrapArchetype, [number, number]> = {
  firstEver: [190, 280],
  pr: [38, 330],
  comeback: [150, 200],
  heavy: [0, 25],
  volume: [265, 320],
  marathon: [220, 260],
  quick: [175, 55],
  balanced: [200, 240],
  cardioFar: [160, 210],
  cardioFast: [5, 45],
  cardioSteady: [190, 230],
  watch: [240, 290],
};

const DAY_MS = 86_400_000;
const COMEBACK_DAYS = 10;

export function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h < 7) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 14) return 'lunch';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

function paletteFor(arch: WrapArchetype, seed: number): WorkoutWrap['palette'] {
  const shift = (seed % 21) - 10; // ±10° so two PR days are not identical
  const [a, b] = HUES[arch];
  const h1 = (a + shift + 360) % 360;
  const h2 = (b + shift + 360) % 360;
  return {
    from: `hsl(${h1} 85% 52%)`,
    // Through the second hue, not their average: gold and magenta must not meet in teal.
    via: `hsl(${h2} 70% 30%)`,
    to: `hsl(${h2} 75% 12%)`,
    glow: `hsl(${h1} 95% 65%)`,
  };
}

/** The best comparison the volume can carry at least once; the seed picks among the top few. */
export function pickEquivalent(volumeKg: number, seed: number): WorkoutWrap['equivalent'] {
  const fits = EQUIVALENTS.filter((e) => volumeKg >= e.kg);
  if (fits.length === 0) return undefined;
  const top = fits.slice(-3);
  const e = top[seed % top.length];
  return { key: e.key, count: Math.round((volumeKg / e.kg) * 10) / 10 };
}

const completedSets = (w: Workout) => w.exercises.flatMap((e) => e.sets.filter((s) => s.completed).map((s) => ({ e, s })));
const volumeOfWorkout = (w: Workout) => w.totalVolumeKg ?? completedSets(w).reduce((a, { s }) => a + s.weightKg * s.reps, 0);
const byDate = (a: Workout, b: Workout) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

export function buildWorkoutWrap(w: Workout, history: Workout[], prs: PR[]): WorkoutWrap {
  const seed = hashSeed(w.id);
  const done = history.filter((h) => h.completed).sort(byDate);
  const before = done.filter((h) => h.id !== w.id && byDate(h, w) < 0);
  const prev = before[before.length - 1];
  const daysSincePrevious = prev ? Math.floor((new Date(w.date).getTime() - new Date(prev.date).getTime()) / DAY_MS) : null;
  const sessionNumber = before.length + 1;
  const date = new Date(w.date);
  const durationMin = Math.round((w.durationSec ?? 0) / 60);
  const base = {
    workoutId: w.id,
    variant: seed % 3,
    name: w.name,
    dateISO: w.date,
    timeOfDay: timeOfDay(date),
    sessionNumber,
    daysSincePrevious,
  };

  if (w.cardio) return cardioWrap(w, before, base, seed);

  const sets = completedSets(w);
  if (w.exercises.length === 0 || sets.length === 0) {
    const archetype: WrapArchetype = sessionNumber === 1 ? 'firstEver' : 'watch';
    return {
      ...base, kind: 'watch', archetype, volumeKg: 0, sets: 0, reps: 0, durationMin, exerciseCount: 0,
      prs: [], muscles: [], palette: paletteFor(archetype, seed),
      slides: ['intro', ...(archetype === 'firstEver' ? [] : (daysSincePrevious ?? 0) >= COMEBACK_DAYS ? ['comeback' as const] : []), 'outro'],
    };
  }

  const volumeKg = Math.round(volumeOfWorkout(w));
  const reps = sets.reduce((a, { s }) => a + s.reps, 0);
  const nameOf = (id: string) => exerciseById(id)?.name ?? 'Exercise';

  // The hero lift is the heaviest weight moved (more reps breaks a tie): the
  // number people remember, with its one-rep estimate underneath.
  let topSet: WorkoutWrap['topSet'];
  for (const { e, s } of sets) {
    if (s.weightKg <= 0) continue;
    if (!topSet || s.weightKg > topSet.weightKg || (s.weightKg === topSet.weightKg && s.reps > topSet.reps)) {
      topSet = { name: nameOf(e.exerciseId), weightKg: s.weightKg, reps: s.reps, e1rm: Math.round(e1rm(s.weightKg, s.reps)) };
    }
  }

  const day = localDateKey(date);
  const ids = new Set(w.exercises.map((e) => e.exerciseId));
  const prsHit = prs
    .filter((p) => ids.has(p.exerciseId) && localDateKey(new Date(p.date)) === day)
    .map((p) => ({ name: p.exerciseName, weightKg: p.weightKg, reps: p.reps }));

  const perMuscle = new Map<MuscleGroup, number>();
  for (const { e } of sets) {
    const m = exerciseById(e.exerciseId)?.primary;
    if (m) perMuscle.set(m, (perMuscle.get(m) ?? 0) + 1);
  }
  const muscles = [...perMuscle.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([muscle, n]) => ({ muscle, sets: n, pct: Math.round((n / sets.length) * 100) }));

  const sameName = before.filter((h) => !h.cardio && h.name.trim().toLowerCase() === w.name.trim().toLowerCase()).slice(-4);
  const lastSame = sameName[sameName.length - 1];
  const versus = lastSame && volumeOfWorkout(lastSame) > 0
    ? {
      deltaPct: Math.round(((volumeKg - volumeOfWorkout(lastSame)) / volumeOfWorkout(lastSame)) * 100),
      history: [...sameName.map((h) => Math.round(volumeOfWorkout(h))), volumeKg],
    }
    : undefined;

  const recent = before.filter((h) => !h.cardio).slice(-5).map(volumeOfWorkout).filter((v) => v > 0);
  const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const avgReps = reps / sets.length;

  let archetype: WrapArchetype = 'balanced';
  if (sessionNumber === 1) archetype = 'firstEver';
  else if (prsHit.length > 0) archetype = 'pr';
  else if ((daysSincePrevious ?? 0) >= COMEBACK_DAYS) archetype = 'comeback';
  else if (recentAvg > 0 && volumeKg >= recentAvg * 1.15) archetype = 'volume';
  else if (avgReps <= 6) archetype = 'heavy';
  else if (durationMin >= 75) archetype = 'marathon';
  else if (durationMin > 0 && durationMin <= 30) archetype = 'quick';

  const slides: WrapSlide[] = ['intro', 'number'];
  if (archetype === 'comeback') slides.push('comeback');
  if (topSet) slides.push('hero');
  if (prsHit.length) slides.push('prs');
  if (muscles.length > 1) slides.push('muscles');
  if (versus) slides.push('versus');
  slides.push('outro');

  return {
    ...base,
    kind: 'strength',
    archetype,
    volumeKg,
    sets: sets.length,
    reps,
    durationMin,
    exerciseCount: w.exercises.length,
    topSet,
    prs: prsHit,
    muscles,
    versus,
    equivalent: pickEquivalent(volumeKg, seed),
    palette: paletteFor(archetype, seed),
    slides,
  };
}

function cardioWrap(
  w: Workout,
  before: Workout[],
  base: Pick<WorkoutWrap, 'workoutId' | 'variant' | 'name' | 'dateISO' | 'timeOfDay' | 'sessionNumber' | 'daysSincePrevious'>,
  seed: number,
): WorkoutWrap {
  const c = w.cardio!;
  const hasPace = c.distanceKm > 0 && c.durationMin > 0;
  const speed = hasPace ? c.distanceKm / (c.durationMin / 60) : undefined;
  const last = [...before].reverse().find((h) => h.cardio && h.cardio.machine.toLowerCase() === c.machine.toLowerCase())?.cardio;
  const lastSpeed = last && last.distanceKm > 0 && last.durationMin > 0 ? last.distanceKm / (last.durationMin / 60) : undefined;

  let archetype: WrapArchetype = 'cardioSteady';
  if (base.sessionNumber === 1) archetype = 'firstEver';
  else if (last && c.distanceKm > 0 && c.distanceKm >= last.distanceKm * 1.1) archetype = 'cardioFar';
  else if (speed && lastSpeed && speed >= lastSpeed * 1.05) archetype = 'cardioFast';
  else if ((base.daysSincePrevious ?? 0) >= COMEBACK_DAYS) archetype = 'comeback';

  const deltaPct = last && last.distanceKm > 0 && c.distanceKm > 0
    ? Math.round(((c.distanceKm - last.distanceKm) / last.distanceKm) * 100)
    : undefined;

  return {
    ...base,
    kind: 'cardio',
    archetype,
    volumeKg: 0,
    sets: 0,
    reps: 0,
    durationMin: Math.round(c.durationMin),
    exerciseCount: 0,
    prs: [],
    muscles: [],
    cardio: {
      machine: c.machine,
      distanceKm: c.distanceKm,
      durationMin: c.durationMin,
      calories: c.calories,
      paceSecPerKm: hasPace ? Math.round((c.durationMin * 60) / c.distanceKm) : undefined,
      speedKmh: speed ? Math.round(speed * 10) / 10 : undefined,
      deltaPct,
    },
    palette: paletteFor(archetype, seed),
    slides: ['intro', 'cardio', ...(archetype === 'comeback' ? ['comeback' as const] : []), 'outro'],
  };
}
