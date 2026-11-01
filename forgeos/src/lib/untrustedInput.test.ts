import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { feedRowToPost } from './liveFeed';
import { decodePlan, encodePlan, sanitizePlan } from './planShare';
import { decodeProfile, encodeProfile } from './profileShare';
import { parseInvitePayload, takePendingInvite, sanitizeInvite } from './invite';
import { decodeWorkout, sanitizeSharedWorkout } from './workoutShare';
import { decodeRaceInvite, encodeRaceInvite } from './race';
import { parseAuthRedirect } from './authDeepLink';
import { cleanWorkoutSummary } from './sanitize';
import type { WeekPlan } from '../types';

// Pen-test regression guards (2026-11-01): everything below arrives from a
// stranger (a link, a friend's row, a deep link) and ends up persisted or
// rendered. Each case is an input that used to be accepted verbatim.

const b64url = (o: unknown) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('feed rows from other users', () => {
  const base = { id: 'p1', author_id: 'u1', created_at: '2026-07-19T12:00:00Z' };

  it('realtime path strips bidi overrides and caps the body', () => {
    const post = feedRowToPost({ ...base, author_name: '‮nimda', body: 'x'.repeat(5000) });
    expect(post?.authorName).toBe('nimda');
    expect(post?.body.length).toBeLessThanOrEqual(1000);
  });

  it('a workout_summary holding objects cannot reach the renderer', () => {
    expect(cleanWorkoutSummary({ volumeKg: 1, sets: 2, durationMin: { a: 1 } })?.durationMin).toBe(0);
    expect(cleanWorkoutSummary('x')).toBeUndefined();
    expect(cleanWorkoutSummary([1])).toBeUndefined();
    const post = feedRowToPost({ ...base, workout_summary: { volumeKg: {}, sets: 'NaN', durationMin: [] } });
    expect(post?.workoutSummary).toEqual({ volumeKg: 0, sets: 0, durationMin: 0 });
  });
});

describe('shared week plans', () => {
  const good: WeekPlan = {
    id: 'plan-1',
    blockType: 'strength',
    days: [{ day: 'Mon', label: 'Push', rest: false, exerciseIds: ['bench-press'], targets: { 'bench-press': { sets: 3, reps: 5, weightKg: 80 } } }],
  };

  it('round-trips a normal plan', () => {
    expect(decodePlan(encodePlan(good))).toEqual(good);
  });

  it('rejects days that are not well-formed', () => {
    expect(sanitizePlan({ days: [{}] })).toBeNull();
    expect(sanitizePlan({ days: [{ day: 'Mon', label: 'x', exerciseIds: 5, rest: false }, 7] })).toBeNull();
    expect(sanitizePlan({ days: new Array(50).fill({ day: 'Mon' }) })).toBeNull();
  });

  it('keeps known keys only and bounds everything', () => {
    const plan = sanitizePlan({
      id: 7,
      blockType: 'evil',
      polluted: true,
      days: [{ day: 'Tue', label: '‮' + 'L'.repeat(500), rest: 'yes', exerciseIds: ['ok', { x: 1 }, 'bad id!', ...new Array(100).fill('a')], targets: { ok: { sets: 9999, reps: 'x' } } }],
    });
    expect(plan).not.toBeNull();
    expect(plan).not.toHaveProperty('polluted');
    expect(plan?.blockType).toBe('hypertrophy');
    expect(plan?.days[0].label.length).toBeLessThanOrEqual(40);
    expect(plan?.days[0].label.includes('‮')).toBe(false);
    expect(plan?.days[0].rest).toBe(false);
    expect(plan?.days[0].exerciseIds.length).toBeLessThanOrEqual(40);
    expect(plan?.days[0].exerciseIds).not.toContain('bad id!');
    expect(plan?.days[0].targets?.ok).toEqual({ sets: 20, reps: 8 });
  });

  it('refuses an oversized link', () => {
    expect(decodePlan('A'.repeat(70_000))).toBeNull();
  });
});

describe('profile and invite links', () => {
  it('profile link missing bestLifts or with object stats still yields a safe profile', () => {
    const p = decodeProfile(b64url({ name: 'Mara', xp: { a: 1 }, bestLifts: 'nope' }));
    expect(p).toMatchObject({ name: 'Mara', xp: 0, bestLifts: [] });
    expect(decodeProfile(b64url({ xp: 5 }))).toBeNull();
  });

  it('profile round-trip survives', () => {
    const p = { name: 'Mara', rank: 'Gold I', xp: 4200, streak: 3, sessions: 9, achievements: 4, bestLifts: [{ name: 'Squat', e1rm: 140 }] };
    expect(decodeProfile(encodeProfile(p))).toEqual(p);
  });

  it('invite with an object xp or hostile code is cleaned or refused', () => {
    const tok = b64url({ v: 1, code: 'FORGE-AB23CD', name: 'A‮B', rank: 'Gold', xp: { x: 1 }, seed: 'ZZZZZ' });
    expect(parseInvitePayload(tok)).toMatchObject({ name: 'AB', xp: 0, seed: 'ZZ' });
    expect(parseInvitePayload(b64url({ v: 1, code: "x'; drop table", name: 'A' }))).toBeNull();
    expect(sanitizeInvite({ v: 1, code: 'FORGE-AB23CD', name: '​' })).toBeNull();
  });

  it('a poisoned stashed invite is re-validated when it is taken back out', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    store.set('forge-pending-invite', JSON.stringify({ v: 1, code: '<img>', name: 'A' }));
    expect(takePendingInvite()).toBeNull();
  });
});

describe('shared workouts and race invites', () => {
  it('rejects a workout whose sets are not numbers or that is absurdly large', () => {
    const bad = { name: 'x', exercises: [{ exerciseId: 'bench', sets: [{ weightKg: { a: 1 }, reps: 'lots' }] }] };
    const clean = sanitizeSharedWorkout(bad);
    expect(clean?.exercises[0].sets[0]).toMatchObject({ weightKg: 0, reps: 0 });
    expect(sanitizeSharedWorkout({ name: 'x', exercises: new Array(500).fill({ exerciseId: 'a', sets: [] }) })).toBeNull();
    expect(sanitizeSharedWorkout({ name: 'x', exercises: [{ exerciseId: '../../x', sets: [] }] })).toBeNull();
    expect(decodeWorkout('A'.repeat(130_000))).toBeNull();
  });

  it('race invite ids and host name are validated', () => {
    const cfg = { raceId: 'r-1', hostId: 'h-1', hostName: 'Host', mode: 'volume' as const, targetKg: 5000 };
    expect(decodeRaceInvite(encodeRaceInvite(cfg))).toMatchObject({ raceId: 'r-1', hostName: 'Host' });
    const evil = b64url({ v: 1, raceId: 'a:b/../c', hostId: 'h', hostName: 'H', mode: 'volume', targetKg: 5 });
    expect(decodeRaceInvite(evil)).toBeNull();
    const rlo = b64url({ v: 1, raceId: 'r1', hostId: 'h', hostName: '‮daer', mode: 'volume', targetKg: 5 });
    expect(decodeRaceInvite(rlo)?.hostName).toBe('daer');
  });
});

describe('auth deep link', () => {
  it('caps and cleans an attacker-supplied error message', () => {
    const r = parseAuthRedirect('forgeos://auth?error_description=' + encodeURIComponent('‮' + 'Call +421 '.repeat(100)));
    expect(r?.kind).toBe('error');
    if (r?.kind === 'error') {
      expect(r.message.length).toBeLessThanOrEqual(120);
      expect(r.message.includes('‮')).toBe(false);
    }
  });
});

describe('database policy guards (schema.sql)', () => {
  const sql = readFileSync(join(__dirname, '../../supabase/schema.sql'), 'utf8');
  const active = sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');

  it('clients can never insert or update friendships', () => {
    expect(active).not.toMatch(/create policy "friendships write"/);
    expect(active).toMatch(/revoke insert, update on friendships from anon, authenticated/);
  });

  it('either side may delete a friendship so unfriending revokes access', () => {
    expect(active).toMatch(/create policy "friendships delete" on friendships for delete using \(auth\.uid\(\) = user_id or auth\.uid\(\) = friend_id\)/);
  });

  it('a new duel must start pending with zero progress', () => {
    const m = active.match(/create policy "duel insert"[\s\S]*?\);\n/);
    expect(m?.[0]).toMatch(/state = 'pending'/);
    expect(m?.[0]).toMatch(/challenger_progress = 0/);
    expect(m?.[0]).toMatch(/opponent_progress = 0/);
  });

  it('reactions can only target posts the caller can see', () => {
    expect(active).toMatch(/create policy "reactions self"[\s\S]*?exists \(select 1 from feed_posts/);
  });
});
