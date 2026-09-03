import type { Workout } from '../types';
import { toSharedWorkout, decodeWorkout, type SharedWorkout } from './workoutShare';
import { randomId } from './rand';

// Three ways to win a live race — the host picks one when creating it:
//  - workout: everyone does the identical shared workout; first to complete
//    every set wins.
//  - volume:  everyone does their own workout; first to move targetKg wins.
//  - timed:   everyone does their own workout; most kg when the clock hits 0.
export type RaceMode = 'workout' | 'volume' | 'timed';

export interface RaceConfig {
  raceId: string;
  mode: RaceMode;
  hostId: string;
  hostName: string;
  targetKg?: number; // volume mode
  durationMin?: number; // timed mode
  workout?: SharedWorkout; // workout mode
  totalSets?: number; // workout mode, derived from workout
}

// What each athlete broadcasts (and tracks via presence) on the race channel.
// startAt rides along on every update so late joiners self-heal into a race
// that already started without needing a separate handshake.
export interface RaceBroadcast {
  userId: string;
  name: string;
  volumeKg: number;
  completedSets: number;
  finishedAt?: number; // epoch ms when this racer crossed the finish line
  startAt?: number; // epoch ms the host started the race
}

export const VOLUME_TARGETS_KG = [4000, 6000, 8000, 12000];
export const TIMED_DURATIONS_MIN = [20, 30, 45, 60];
// Sanity caps for numbers arriving in invite links (they're untrusted URLs —
// e.g. JSON happily parses 1e1000 as Infinity, which would make a race unwinnable).
export const MAX_TARGET_KG = 100_000;
export const MAX_DURATION_MIN = 240;

const isSaneNumber = (n: unknown, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= max;

export function countSets(w: SharedWorkout): number {
  return w.exercises.reduce((a, e) => a + e.sets.length, 0);
}

export function newRaceConfig(
  mode: RaceMode,
  host: { id: string; name: string },
  // A rematch passes the previous race's already-shared workout back in.
  opts: { targetKg?: number; durationMin?: number; workout?: Workout | SharedWorkout } = {},
): RaceConfig | null {
  // The race id IS the channel name and the invite link, so a guessable id is a
  // public race: anyone who predicted it could read every racer's live progress.
  const raceId = randomId();
  const base = { raceId, hostId: host.id, hostName: host.name };
  if (mode === 'volume') {
    const targetKg = opts.targetKg ?? 8000;
    if (!isSaneNumber(targetKg, MAX_TARGET_KG)) return null;
    return { ...base, mode, targetKg };
  }
  if (mode === 'timed') {
    const durationMin = opts.durationMin ?? 30;
    if (!isSaneNumber(durationMin, MAX_DURATION_MIN)) return null;
    return { ...base, mode, durationMin };
  }
  if (!opts.workout || opts.workout.exercises.length === 0) return null;
  const shared = 'id' in opts.workout ? toSharedWorkout(opts.workout) : opts.workout;
  if (countSets(shared) === 0) return null;
  return { ...base, mode, workout: shared, totalSets: countSets(shared) };
}

// ---- invite links (same base64url scheme as workoutShare/planShare) ----

function toBase64Url(json: string): string {
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function atobUrl(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

interface InviteWire {
  v: 1;
  raceId: string;
  mode: RaceMode;
  hostId: string;
  hostName: string;
  targetKg?: number;
  durationMin?: number;
  w?: string; // encoded workout (workout mode)
}

export function encodeRaceInvite(config: RaceConfig): string {
  const wire: InviteWire = {
    v: 1,
    raceId: config.raceId,
    mode: config.mode,
    hostId: config.hostId,
    hostName: config.hostName,
    targetKg: config.targetKg,
    durationMin: config.durationMin,
    w: config.workout ? toBase64Url(JSON.stringify(config.workout)) : undefined,
  };
  return toBase64Url(JSON.stringify(wire));
}

export function decodeRaceInvite(code: string): RaceConfig | null {
  try {
    const wire = JSON.parse(atobUrl(code)) as InviteWire;
    if (!wire || wire.v !== 1 || typeof wire.raceId !== 'string' || typeof wire.hostId !== 'string' || typeof wire.hostName !== 'string') return null;
    const base = { raceId: wire.raceId, hostId: wire.hostId, hostName: wire.hostName };
    if (wire.mode === 'volume') {
      if (!isSaneNumber(wire.targetKg, MAX_TARGET_KG)) return null;
      return { ...base, mode: 'volume', targetKg: wire.targetKg };
    }
    if (wire.mode === 'timed') {
      if (!isSaneNumber(wire.durationMin, MAX_DURATION_MIN)) return null;
      return { ...base, mode: 'timed', durationMin: wire.durationMin };
    }
    if (wire.mode !== 'workout' || typeof wire.w !== 'string') return null;
    const workout = decodeWorkout(wire.w);
    if (!workout || workout.exercises.length === 0) return null;
    return { ...base, mode: 'workout', workout, totalSets: countSets(workout) };
  } catch {
    return null;
  }
}

export function raceInviteUrl(config: RaceConfig): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/race-join?d=${encodeRaceInvite(config)}`;
}

export async function shareRaceInvite(config: RaceConfig): Promise<'shared' | 'copied'> {
  const url = raceInviteUrl(config);
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: 'ForgeOS live race', text: `Race me live on ForgeOS 🏁 ${raceRuleText(config)}`, url });
      return 'shared';
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

// ---- race rules (pure — unit tested) ----

export function raceEndsAt(config: RaceConfig, startAt: number): number | null {
  return config.mode === 'timed' && config.durationMin ? startAt + config.durationMin * 60_000 : null;
}

// Has this racer personally crossed the finish line? (timed mode has no
// personal finish line — the clock decides.)
export function hasFinished(config: RaceConfig, r: { volumeKg: number; completedSets: number }): boolean {
  if (config.mode === 'workout') return r.completedSets >= (config.totalSets ?? Infinity);
  if (config.mode === 'volume') return r.volumeKg >= (config.targetKg ?? Infinity);
  return false;
}

// 0..1 towards the finish line. Timed mode is relative to the current leader
// so the bars still mean something while the clock runs.
export function progressFraction(config: RaceConfig, r: RaceBroadcast, leaderVolumeKg = 0): number {
  let frac = 0;
  if (config.mode === 'workout') frac = (config.totalSets ?? 0) > 0 ? r.completedSets / (config.totalSets ?? 1) : 0;
  else if (config.mode === 'volume') frac = (config.targetKg ?? 0) > 0 ? r.volumeKg / (config.targetKg ?? 1) : 0;
  else frac = leaderVolumeKg > 0 ? r.volumeKg / leaderVolumeKg : 0;
  return Math.max(0, Math.min(1, frac));
}

// The winner, or null while the race is still open.
//  - workout/volume: earliest finishedAt wins (broadcast timestamps tie-break).
//  - timed: once the clock is up, highest volume wins; deterministic tie-break
//    by userId so every client agrees without another round-trip.
export function resolveWinner(
  config: RaceConfig,
  racers: RaceBroadcast[],
  startAt: number | undefined,
  now: number,
): RaceBroadcast | null {
  if (racers.length === 0) return null;
  if (config.mode === 'timed') {
    if (startAt == null) return null;
    const endsAt = raceEndsAt(config, startAt);
    if (!endsAt || now < endsAt) return null;
    return [...racers].sort((a, b) => b.volumeKg - a.volumeKg || a.userId.localeCompare(b.userId))[0];
  }
  const done = racers.filter((r) => r.finishedAt != null && hasFinished(config, r));
  if (done.length === 0) return null;
  return done.sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0) || a.userId.localeCompare(b.userId))[0];
}

// One-line human description of the rules, used on invites and in the lobby.
export function raceRuleText(config: RaceConfig): string {
  if (config.mode === 'workout') return `Same workout · first to finish all ${config.totalSets ?? '?'} sets wins`;
  if (config.mode === 'volume') return `First to move ${(config.targetKg ?? 0).toLocaleString()} kg wins`;
  return `Most kg lifted in ${config.durationMin} min wins`;
}
