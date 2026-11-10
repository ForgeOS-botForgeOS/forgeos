import { describe, expect, it } from 'vitest';
import type { FeedPost, Friend, FriendRequest } from '../types';
import { buildLeaderboard, purgeDemoSocial, starterRoutines, trainingNowLabel } from './socialSeed';

const friend = (over: Partial<Friend>): Friend => ({ id: 'x', name: 'X', rank: 'Gold I', xp: 1, online: false, avatarSeed: 'X', ...over });
const post = (over: Partial<FeedPost>): FeedPost => ({ id: 'p', authorId: 'a', authorName: 'A', avatarSeed: 'A', body: 'b', createdAt: '2026-01-01', reactions: {}, ...over });

describe('purgeDemoSocial', () => {
  it('removes the seeded demo friends, requests and posts', () => {
    const out = purgeDemoSocial({
      friends: [friend({ id: 'f1', name: 'Lena' }), friend({ id: 'f5', name: 'Amir' })],
      requests: [{ id: 'rq1', name: 'Elena', avatarSeed: 'EL', rank: 'Gold I', xp: 1, direction: 'incoming', createdAt: '' } as FriendRequest],
      feed: [post({ id: 'p1', authorId: 'f2' }), post({ id: 'abc', authorId: 'f3' })],
    });
    expect(out.friends).toEqual([]);
    expect(out.requests).toEqual([]);
    expect(out.feed).toEqual([]);
  });

  it('removes people added through the old simulated suggestions', () => {
    const out = purgeDemoSocial({ friends: [friend({ id: 'k3j2h1g0', name: 'Priya' })], requests: [], feed: [] });
    expect(out.friends).toEqual([]);
  });

  it('keeps real friends, even one who shares a demo name', () => {
    const invited = friend({ id: 'q1w2e3r4', name: 'Lena', friendCode: 'ABCD2345' });
    const synced = friend({ id: '0a1b2c3d-1111-2222-3333-444455556666', name: 'Marcus' });
    const other = friend({ id: 'zzzzzzzz', name: 'Jakub' });
    const out = purgeDemoSocial({ friends: [invited, synced, other], requests: [], feed: [] });
    expect(out.friends).toEqual([invited, synced, other]);
  });

  it('keeps your own posts and posts from real people', () => {
    const mine = post({ id: 'm', authorId: 'me', mine: true });
    const real = post({ id: 'r', authorId: '0a1b2c3d-1111-2222-3333-444455556666' });
    expect(purgeDemoSocial({ friends: [], requests: [], feed: [mine, real] }).feed).toEqual([mine, real]);
  });

  it('survives state with missing lists', () => {
    const out = purgeDemoSocial({} as never) as { friends: Friend[] };
    expect(out.friends).toEqual([]);
  });
});

describe('starterRoutines', () => {
  it('gives every built-in routine a usable plan with the advertised days', () => {
    for (const r of starterRoutines()) {
      expect(r.plan).toBeDefined();
      expect(r.plan!.days.filter((d) => !d.rest && d.exerciseIds.length > 0).length).toBeGreaterThanOrEqual(r.daysPerWeek);
      expect(r.author).toBe('ForgeOS');
    }
  });

  it('keeps the ids of the listings people may already own', () => {
    expect(starterRoutines().map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
});

describe('buildLeaderboard', () => {
  it('ranks you alone when you have no friends', () => {
    expect(buildLeaderboard('Peter', 500, [])).toEqual([{ rank: 1, name: 'Peter', rankTier: '–', xp: 500, you: true }]);
  });
});

describe('trainingNowLabel', () => {
  it('uses the singular for one other person', () => {
    expect(trainingNowLabel(['Lena'])).toBe('Lena is');
    expect(trainingNowLabel(['Lena', 'Amir'])).toBe('Lena & 1 other are');
    expect(trainingNowLabel(['Lena', 'Amir', 'Jo'])).toBe('Lena & 2 others are');
  });
});
