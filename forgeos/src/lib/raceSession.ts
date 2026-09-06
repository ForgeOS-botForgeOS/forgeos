import type { Workout } from '../types';
import { displayName } from './sanitize';
import { joinRaceChannel, type RaceChannel } from './supabase';
import {
  hasFinished, newRaceConfig, raceEndsAt, resolveWinner,
  type RaceBroadcast, type RaceConfig, type RaceMode,
} from './race';
import { sharedToExercises, type SharedWorkout } from './workoutShare';
import { useRace } from '../state/raceStore';
import { useWorkout, computeVolume } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { useSocial } from '../state/socialStore';
import { useSettings } from '../state/settingsStore';
import { toast, celebrate } from './toast';
import { askConfirm } from './dialog';
import { haptic } from './haptics';

// Owns the live realtime channel for the current race. All serializable race
// state lives in raceStore (persisted); this module re-attaches the channel
// after a refresh via ensureRaceSession(). Train.tsx reports progress here.

export const WINNER_XP = 200;
export const WINNER_COINS = 100;
export const FINISHER_XP = 50;
// When a finish is detected, wait this long before locking the result so a
// rival's near-simultaneous finish broadcast can still arrive. resolveWinner
// is deterministic, so once both clients hold both finishes they agree.
const OUTCOME_GRACE_MS = 2000;

let channel: RaceChannel | null = null;
let timedEndTimer: ReturnType<typeof setTimeout> | null = null;
let outcomeTimer: ReturnType<typeof setTimeout> | null = null;

function myIdentity(): { userId: string; name: string } {
  const p = useUser.getState().profile;
  return { userId: p?.id ?? 'me', name: p?.name ?? 'You' };
}

function myRacer(): RaceBroadcast {
  const me = myIdentity();
  const a = useRace.getState().active;
  const known = a?.racers[me.userId];
  return { ...me, volumeKg: known?.volumeKg ?? 0, completedSets: known?.completedSets ?? 0, finishedAt: known?.finishedAt, startAt: a?.startAt };
}

function attachChannel(config: RaceConfig, me: RaceBroadcast): boolean {
  channel = joinRaceChannel(config.raceId, me, {
    onProgress: (u) => {
      // A racer's name arrives over a channel anyone who knows its id can join,
      // so it is cleaned before it reaches the leaderboard on screen.
      useRace.getState().applyUpdate({ ...u, name: displayName(u.name) });
      armTimedEnd();
      checkOutcome();
    },
    onRoster: (racers, onlineIds) => useRace.getState().setRoster(racers, onlineIds),
    // Only the host starts the race. Without this check any joiner — or anyone
    // who guessed the channel name — could start everyone else's race.
    // Invites minted before races carried a hostId are trusted as before.
    onStart: (startAt, hostId) => {
      if (hostId && config.hostId && hostId !== config.hostId) return;
      void handleStart(startAt);
    },
  });
  return channel != null;
}

/** Same rules, fresh race, me as host — back to the lobby for another round. */
export function rematchRace(): RaceConfig | null {
  const a = useRace.getState().active;
  if (!a) return null;
  const { mode, targetKg, durationMin, workout } = a.config;
  return createRace(mode, { targetKg, durationMin, workout });
}

export function createRace(
  mode: RaceMode,
  opts: { targetKg?: number; durationMin?: number; workout?: Workout | SharedWorkout } = {},
): RaceConfig | null {
  const me = myIdentity();
  const config = newRaceConfig(mode, { id: me.userId, name: me.name }, opts);
  if (!config) return null;
  leaveRace(); // drop any stale previous race first
  const racer: RaceBroadcast = { ...me, volumeKg: 0, completedSets: 0 };
  if (!attachChannel(config, racer)) return null;
  useRace.getState().begin(config, 'host', racer);
  return config;
}

export function joinRaceFromInvite(config: RaceConfig): boolean {
  const me = myIdentity();
  leaveRace();
  const racer: RaceBroadcast = { ...me, volumeKg: 0, completedSets: 0 };
  if (!attachChannel(config, racer)) return false;
  useRace.getState().begin(config, 'guest', racer);
  return true;
}

// Re-attach the channel after a page refresh mid-race. Safe to call often.
export function ensureRaceSession(): void {
  const a = useRace.getState().active;
  if (!a || channel) return;
  if (a.status === 'done') return;
  attachChannel(a.config, myRacer());
  armTimedEnd();
}

// Host presses Start. Everyone (including the host, locally) runs handleStart.
export function startRace(): void {
  const a = useRace.getState().active;
  if (!a || a.role !== 'host' || a.status !== 'lobby') return;
  const startAt = Date.now();
  channel?.sendStart(startAt);
  void handleStart(startAt);
  // Ride startAt on a progress update too, for anyone who missed the event.
  channel?.sendProgress({ ...myRacer(), startAt });
}

async function handleStart(startAt: number): Promise<void> {
  const a = useRace.getState().active;
  if (!a || a.status !== 'lobby') return;
  const { config } = a;
  let baseline = 0;
  if (config.mode === 'workout' && config.workout) {
    // The start can arrive minutes after joining — never silently overwrite a
    // workout the racer started in the meantime (same guard as ImportWorkout).
    const existing = useWorkout.getState().active;
    if (existing) {
      const race = await askConfirm({
        title: 'Race anyway?',
        body: `Starting the race replaces your current workout "${existing.name}".`,
        confirmLabel: 'Race',
      });
      if (!race) {
        toast('You sat this race out 🏳️', 'info');
        leaveRace();
        return;
      }
      // Asking is no longer instant (it used to block the thread), so the race
      // may have been started, left or ended while the question was on screen.
      if (useRace.getState().active?.status !== 'lobby') return;
    }
    // Everyone starts the identical shared workout, fresh.
    useWorkout.getState().startSharedWorkout(config.workout.name, sharedToExercises(config.workout));
  } else {
    // Own-workout modes: only kg moved from this moment on count.
    const active = useWorkout.getState().active;
    baseline = active ? computeVolume(active) : 0;
  }
  useRace.getState().markStarted(startAt, baseline);
  haptic('success');
  toast('🏁 The race is on!', 'success');
  armTimedEnd();
}

// Called from Train after every completed set (and on workout finish).
export function reportRaceProgress(): void {
  const a = useRace.getState().active;
  if (!a || a.status !== 'racing') return;
  const workout = useWorkout.getState().active;
  if (!workout) return;
  const volumeKg = Math.max(0, computeVolume(workout) - a.myBaselineVolumeKg);
  const completedSets = workout.exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);
  const me = myRacer();
  const finishedAt = me.finishedAt ?? (hasFinished(a.config, { volumeKg, completedSets }) ? Date.now() : undefined);
  const update: RaceBroadcast = { ...me, volumeKg, completedSets, finishedAt, startAt: a.startAt };
  useRace.getState().applyUpdate(update);
  channel?.sendProgress(update);
  checkOutcome();
}

// Timed races end on the clock, not on anyone's action — arm a local timer so
// the outcome resolves even if nobody logs another set.
function armTimedEnd(): void {
  const a = useRace.getState().active;
  if (!a || a.config.mode !== 'timed' || a.status !== 'racing' || a.startAt == null) return;
  const endsAt = raceEndsAt(a.config, a.startAt);
  if (endsAt == null || timedEndTimer) return;
  timedEndTimer = setTimeout(() => {
    timedEndTimer = null;
    checkOutcome();
  }, Math.max(0, endsAt - Date.now()) + 500);
}

// A winner candidate exists — but don't lock the result yet. Wait a short
// grace window for rival broadcasts still in flight, then re-resolve; every
// client ends up judging the same set of finishes with the same tie-breaks.
function checkOutcome(): void {
  const a = useRace.getState().active;
  if (!a || a.status !== 'racing' || outcomeTimer) return;
  const candidate = resolveWinner(a.config, Object.values(a.racers), a.startAt, Date.now());
  if (!candidate) return;
  outcomeTimer = setTimeout(() => {
    outcomeTimer = null;
    finalizeOutcome();
  }, OUTCOME_GRACE_MS);
}

function finalizeOutcome(): void {
  const s = useRace.getState();
  const a = s.active;
  if (!a || a.status !== 'racing') return;
  const winner = resolveWinner(a.config, Object.values(a.racers), a.startAt, Date.now());
  if (!winner) return;
  s.setWinner(winner.userId);
  if (a.rewarded) return;
  s.markRewarded();
  const me = myIdentity();
  const iWon = winner.userId === me.userId;
  const gami = useGami.getState();
  // All-time rivalry record: a win counts against every rival in the race,
  // a loss only against whoever beat you.
  const social = useSocial.getState();
  if (iWon) {
    Object.values(a.racers).forEach((r) => { if (r.userId !== me.userId) social.recordRivalry(r.name, 'win'); });
  } else {
    social.recordRivalry(winner.name, 'loss');
  }
  if (iWon) {
    gami.addXp(WINNER_XP);
    gami.addCoins(WINNER_COINS);
    celebrate();
    toast(`🏁 You won the race! +${WINNER_XP} XP · +${WINNER_COINS} 🪙`, 'success');
    if (useSettings.getState().shareActivity) {
      useSocial.getState().publishPost(`🏁 Won a live ${a.config.mode} race against ${Object.keys(a.racers).length - 1} rival(s)! 💪`);
    }
  } else {
    const mine = a.racers[me.userId];
    if (mine?.finishedAt != null) gami.addXp(FINISHER_XP);
    toast(`🏁 ${winner.name} won the race${mine?.finishedAt != null ? ` — you still banked +${FINISHER_XP} XP` : ''}.`, 'info');
  }
}

// Finishing/discarding your workout while the race is undecided = you leave it
// — unless you crossed the finish line, in which case the outcome (still inside
// its grace window) is left to resolve and reward on its own timers.
export function raceWorkoutEnded(): void {
  const a = useRace.getState().active;
  if (!a) return;
  if (a.status === 'racing') {
    reportRaceProgress();
    const mine = useRace.getState().active?.racers[myIdentity().userId];
    if (mine?.finishedAt != null) return;
    toast('You left the race 🏳️', 'info');
  }
  leaveRace();
}

export function leaveRace(): void {
  if (timedEndTimer) {
    clearTimeout(timedEndTimer);
    timedEndTimer = null;
  }
  if (outcomeTimer) {
    clearTimeout(outcomeTimer);
    outcomeTimer = null;
  }
  channel?.leave();
  channel = null;
  useRace.getState().clear();
}
