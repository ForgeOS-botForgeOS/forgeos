import { describe, expect, test } from 'vitest';
import {
  decodeRaceInvite, encodeRaceInvite, hasFinished, newRaceConfig,
  progressFraction, raceEndsAt, resolveWinner, type RaceBroadcast, type RaceConfig,
} from './race';
import type { Workout } from '../types';

const workout: Workout = {
  id: 'w1',
  name: 'Push Day A',
  date: '2026-07-17T10:00:00.000Z',
  completed: false,
  exercises: [
    { id: 'e1', exerciseId: 'bench', sets: [
      { id: 's1', weightKg: 80, reps: 8, completed: true },
      { id: 's2', weightKg: 80, reps: 8, completed: false },
    ] },
    { id: 'e2', exerciseId: 'ohp', sets: [{ id: 's3', weightKg: 40, reps: 10, completed: false }] },
  ],
};

const racer = (userId: string, over: Partial<RaceBroadcast> = {}): RaceBroadcast => ({
  userId, name: userId, volumeKg: 0, completedSets: 0, ...over,
});

const HOST = { id: 'host-1', name: 'Peter' };

describe('race invites', () => {
  test('workout-mode invite round-trips with the workout and set count', () => {
    const config = newRaceConfig('workout', HOST, { workout });
    expect(config).not.toBeNull();
    const decoded = decodeRaceInvite(encodeRaceInvite(config!));
    expect(decoded).not.toBeNull();
    expect(decoded!.mode).toBe('workout');
    expect(decoded!.raceId).toBe(config!.raceId);
    expect(decoded!.hostName).toBe('Peter');
    expect(decoded!.hostId).toBe('host-1');
    expect(decoded!.totalSets).toBe(3);
    expect(decoded!.workout!.exercises.map((e) => e.exerciseId)).toEqual(['bench', 'ohp']);
    // no local ids or completion flags leak into the invite
    expect(JSON.stringify(decoded!.workout)).not.toContain('"completed"');
  });

  test('volume and timed invites round-trip their rule numbers', () => {
    const vol = newRaceConfig('volume', HOST, { targetKg: 6000 })!;
    expect(decodeRaceInvite(encodeRaceInvite(vol))).toMatchObject({ mode: 'volume', targetKg: 6000 });
    const timed = newRaceConfig('timed', HOST, { durationMin: 45 })!;
    expect(decodeRaceInvite(encodeRaceInvite(timed))).toMatchObject({ mode: 'timed', durationMin: 45 });
  });

  test('garbage, truncated and wrong-shape codes decode to null', () => {
    expect(decodeRaceInvite('not-base64!!!')).toBeNull();
    expect(decodeRaceInvite(encodeRaceInvite(newRaceConfig('volume', HOST, { targetKg: 6000 })!).slice(0, 10))).toBeNull();
    expect(decodeRaceInvite(btoa(JSON.stringify({ v: 1, raceId: 'x', mode: 'volume', hostId: 'h', hostName: 'P' })))).toBeNull(); // missing targetKg
    expect(decodeRaceInvite(btoa(JSON.stringify({ v: 2, raceId: 'x', mode: 'timed', hostId: 'h', hostName: 'P', durationMin: 30 })))).toBeNull(); // future version
    expect(decodeRaceInvite(btoa(JSON.stringify({ v: 1, raceId: 'x', mode: 'volume', hostName: 'P', targetKg: 6000 })))).toBeNull(); // missing hostId
  });

  test('hand-crafted invites with absurd numbers are rejected (Infinity, huge, negative)', () => {
    const wire = (patch: object) => btoa(JSON.stringify({ v: 1, raceId: 'x', hostId: 'h', hostName: 'P', ...patch }));
    // Raw JSON so "1e1000" really goes through JSON.parse (→ Infinity at runtime).
    const rawWire = (mode: string, field: string, raw: string) =>
      btoa(`{"v":1,"raceId":"x","hostId":"h","hostName":"P","mode":"${mode}","${field}":${raw}}`);
    expect(decodeRaceInvite(rawWire('volume', 'targetKg', '1e1000'))).toBeNull();
    expect(decodeRaceInvite(rawWire('timed', 'durationMin', '1e1000'))).toBeNull();
    expect(decodeRaceInvite(wire({ mode: 'volume', targetKg: 100_001 }))).toBeNull();
    expect(decodeRaceInvite(wire({ mode: 'volume', targetKg: -5 }))).toBeNull();
    expect(decodeRaceInvite(wire({ mode: 'timed', durationMin: 100000 }))).toBeNull();
    expect(decodeRaceInvite(wire({ mode: 'timed', durationMin: 240 }))).not.toBeNull(); // at the cap is fine
  });

  test('workout mode refuses an empty workout', () => {
    expect(newRaceConfig('workout', HOST, {})).toBeNull();
    expect(newRaceConfig('workout', HOST, { workout: { ...workout, exercises: [] } })).toBeNull();
  });
});

describe('finish line', () => {
  const wc = newRaceConfig('workout', HOST, { workout })!;
  const vc = newRaceConfig('volume', HOST, { targetKg: 6000 })!;
  const tc = newRaceConfig('timed', HOST, { durationMin: 30 })!;

  test('workout mode finishes on completing every set', () => {
    expect(hasFinished(wc, { volumeKg: 0, completedSets: 2 })).toBe(false);
    expect(hasFinished(wc, { volumeKg: 0, completedSets: 3 })).toBe(true);
  });

  test('volume mode finishes at the target', () => {
    expect(hasFinished(vc, { volumeKg: 5999, completedSets: 99 })).toBe(false);
    expect(hasFinished(vc, { volumeKg: 6000, completedSets: 0 })).toBe(true);
  });

  test('timed mode has no personal finish line', () => {
    expect(hasFinished(tc, { volumeKg: 999999, completedSets: 999 })).toBe(false);
  });

  test('progress fractions are clamped 0..1 and mode-aware', () => {
    expect(progressFraction(wc, racer('a', { completedSets: 2 }))).toBeCloseTo(2 / 3);
    expect(progressFraction(vc, racer('a', { volumeKg: 3000 }))).toBeCloseTo(0.5);
    expect(progressFraction(vc, racer('a', { volumeKg: 99999 }))).toBe(1);
    expect(progressFraction(tc, racer('a', { volumeKg: 500 }), 1000)).toBeCloseTo(0.5);
    expect(progressFraction(tc, racer('a', { volumeKg: 500 }), 0)).toBe(0);
  });
});

describe('winner resolution', () => {
  const wc: RaceConfig = { raceId: 'r', mode: 'workout', hostId: 'h', hostName: 'P', workout: undefined, totalSets: 3 };
  const tc = newRaceConfig('timed', HOST, { durationMin: 30 })!;

  test('nobody finished → race still open', () => {
    expect(resolveWinner(wc, [racer('a', { completedSets: 2 })], 1000, 2000)).toBeNull();
    expect(resolveWinner(wc, [], 1000, 2000)).toBeNull();
  });

  test('earliest finishedAt wins workout/volume races', () => {
    const a = racer('a', { completedSets: 3, finishedAt: 5000 });
    const b = racer('b', { completedSets: 3, finishedAt: 4000 });
    expect(resolveWinner(wc, [a, b], 1000, 9000)?.userId).toBe('b');
  });

  test('a finishedAt claim without actually finishing is ignored', () => {
    const cheat = racer('a', { completedSets: 1, finishedAt: 10 });
    const honest = racer('b', { completedSets: 3, finishedAt: 5000 });
    expect(resolveWinner(wc, [cheat, honest], 1000, 9000)?.userId).toBe('b');
  });

  test('timed race stays open until the clock runs out, then most volume wins', () => {
    const startAt = 1_000_000;
    const endsAt = raceEndsAt(tc, startAt)!;
    const a = racer('a', { volumeKg: 4000 });
    const b = racer('b', { volumeKg: 5000 });
    expect(resolveWinner(tc, [a, b], startAt, endsAt - 1)).toBeNull();
    expect(resolveWinner(tc, [a, b], undefined, endsAt + 1)).toBeNull(); // never started
    expect(resolveWinner(tc, [a, b], startAt, endsAt + 1)?.userId).toBe('b');
  });

  test('ties resolve deterministically for every client', () => {
    const a = racer('b-user', { completedSets: 3, finishedAt: 5000 });
    const b = racer('a-user', { completedSets: 3, finishedAt: 5000 });
    expect(resolveWinner(wc, [a, b], 1000, 9000)?.userId).toBe('a-user');
    const t1 = racer('b-user', { volumeKg: 5000 });
    const t2 = racer('a-user', { volumeKg: 5000 });
    expect(resolveWinner(tc, [t1, t2], 0, raceEndsAt(tc, 0)! + 1)?.userId).toBe('a-user');
  });
});
