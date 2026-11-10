import type { FeedPost, Friend, FriendRequest, Goal, MarketplaceRoutine } from '../types';
import { buildWeekPlan } from '../screens/onboarding/planGenerator';

/**
 * ForgeOS used to fill Social with invented people (five "friends", two friend
 * requests, four posts, four suggestions) and present them as real. They are
 * gone; these ids and names exist only so `purgeDemoSocial` can clean them out
 * of state that was persisted while they were still seeded.
 */
const DEMO_FRIEND_IDS = new Set(['f1', 'f2', 'f3', 'f4', 'f5']);
const DEMO_REQUEST_IDS = new Set(['rq1', 'rq2']);
/** People who could only ever be added through the old simulated requests. */
const DEMO_NAMES = new Set(['Lena', 'Marcus', 'Sofia', 'Jonas', 'Amir', 'Priya', 'Diego', 'Yuki', 'Tomas', 'Elena', 'Kwame']);

export interface SocialPeople {
  feed: FeedPost[];
  friends: Friend[];
  requests: FriendRequest[];
}

/**
 * Remove the old demo people and their posts. A friend is kept when they came
 * from a real invite link (`friendCode`) even if they share a demo name, and
 * your own posts are always kept.
 */
export function purgeDemoSocial<T extends SocialPeople>(state: T): T {
  const isDemoFriend = (f: Friend) => DEMO_FRIEND_IDS.has(f.id) || (!f.friendCode && DEMO_NAMES.has(f.name) && !isRemoteId(f.id));
  return {
    ...state,
    friends: (state.friends ?? []).filter((f) => !isDemoFriend(f)),
    requests: (state.requests ?? []).filter((r) => !DEMO_REQUEST_IDS.has(r.id) && !DEMO_NAMES.has(r.name)),
    feed: (state.feed ?? [])
      .filter((p) => p.mine || !DEMO_FRIEND_IDS.has(p.authorId))
      .map((p) => (p.comments?.length ? { ...p, comments: p.comments.filter((c) => !/^c[123]$/.test(c.id)) } : p)),
  };
}

/** Friends synced from the backend carry a UUID; the simulated ones had 8-char ids. */
function isRemoteId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);
}

/**
 * Built-in programs for the routine shop. They keep the ids of the old
 * placeholder listings, which had no plan attached — buying one spent coins
 * and unlocked nothing. Anyone who bought one now owns a real plan.
 */
const STARTERS: { id: string; title: string; priceCoins: number; weeks: number; days: number; focus: string; goal: Goal }[] = [
  { id: 'r1', title: 'Forge Foundations', priceCoins: 800, weeks: 8, days: 4, focus: 'Strength', goal: 'strength' },
  { id: 'r2', title: 'Hypertrophy Engine', priceCoins: 650, weeks: 6, days: 5, focus: 'Muscle', goal: 'gain' },
  { id: 'r3', title: 'Three-Day Builder', priceCoins: 400, weeks: 10, days: 3, focus: 'Full body', goal: 'recomp' },
  { id: 'r4', title: 'Lean Cut Block', priceCoins: 1200, weeks: 4, days: 4, focus: 'Fat loss', goal: 'lose' },
];

export const BUILT_IN_AUTHOR = 'ForgeOS';

export function starterRoutines(): MarketplaceRoutine[] {
  return STARTERS.map((s) => ({
    id: s.id,
    title: s.title,
    author: BUILT_IN_AUTHOR,
    authorRank: '',
    priceCoins: s.priceCoins,
    weeks: s.weeks,
    daysPerWeek: s.days,
    focus: s.focus,
    rating: 0,
    plan: buildWeekPlan(s.days, 'auto', s.goal),
  }));
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  rankTier: string;
  xp: number;
  you?: boolean;
}

export function buildLeaderboard(youName: string, youXp: number, friends: Friend[]): LeaderboardRow[] {
  const rows = [
    ...friends.map((f) => ({ name: f.name, rankTier: f.rank, xp: f.xp })),
    { name: youName || 'You', rankTier: '–', xp: youXp, you: true },
  ];
  rows.sort((a, b) => b.xp - a.xp);
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/** "Lena is", "Lena & 1 other are", "Lena & 3 others are". */
export function trainingNowLabel(names: string[]): string {
  if (names.length === 0) return '';
  const rest = names.length - 1;
  if (rest === 0) return `${names[0]} is`;
  return `${names[0]} & ${rest} ${rest === 1 ? 'other' : 'others'} are`;
}
