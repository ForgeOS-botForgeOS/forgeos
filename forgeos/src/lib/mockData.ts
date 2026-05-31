import type { Friend, FeedPost, MarketplaceRoutine } from '../types';

export const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Lena', rank: 'Gold II', xp: 7400, online: true, avatarSeed: 'LN' },
  { id: 'f2', name: 'Marcus', rank: 'Platinum I', xp: 12800, online: true, avatarSeed: 'MA' },
  { id: 'f3', name: 'Sofia', rank: 'Silver III', xp: 3100, online: false, avatarSeed: 'SO' },
  { id: 'f4', name: 'Jonas', rank: 'Legend I', xp: 24500, online: false, avatarSeed: 'JO' },
  { id: 'f5', name: 'Amir', rank: 'Gold I', xp: 6200, online: true, avatarSeed: 'AM' },
];

export const MOCK_FEED: FeedPost[] = [
  {
    id: 'p1',
    authorId: 'f2',
    authorName: 'Marcus',
    avatarSeed: 'MA',
    body: 'New squat PR — 180 kg x 3. Knees were shaking but it moved 🦵',
    workoutSummary: { volumeKg: 9800, sets: 22, durationMin: 64 },
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    reactions: { '🔥': 12, '💪': 8, '🐐': 3 },
  },
  {
    id: 'p2',
    authorId: 'f1',
    authorName: 'Lena',
    avatarSeed: 'LN',
    body: 'Day 30 of the streak. The habit finally feels automatic.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    reactions: { '🔥': 21, '👏': 9 },
  },
  {
    id: 'p3',
    authorId: 'f4',
    authorName: 'Jonas',
    avatarSeed: 'JO',
    body: 'Published a new 5-week strength block in the marketplace. Built it around the Plateau Breaker logic.',
    workoutSummary: { volumeKg: 14200, sets: 28, durationMin: 78 },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    reactions: { '🔥': 31, '💰': 14, '🧠': 6 },
  },
];

export const MOCK_MARKETPLACE: MarketplaceRoutine[] = [
  { id: 'r1', title: 'Forge Foundations', author: 'Jonas', authorRank: 'Legend I', priceCoins: 800, weeks: 8, daysPerWeek: 4, focus: 'Strength', rating: 4.8 },
  { id: 'r2', title: 'Hypertrophy Engine', author: 'Marcus', authorRank: 'Platinum I', priceCoins: 650, weeks: 6, daysPerWeek: 5, focus: 'Bodybuilding', rating: 4.6 },
  { id: 'r3', title: 'Calisthenics Ladder', author: 'Lena', authorRank: 'Gold II', priceCoins: 400, weeks: 10, daysPerWeek: 3, focus: 'Calisthenics', rating: 4.9 },
  { id: 'r4', title: 'Peak Week Protocol', author: 'Jonas', authorRank: 'Legend I', priceCoins: 1200, weeks: 4, daysPerWeek: 4, focus: 'Powerlifting', rating: 4.7 },
];

export interface LeaderboardRow {
  rank: number;
  name: string;
  rankTier: string;
  xp: number;
  you?: boolean;
}

export function buildLeaderboard(youName: string, youXp: number, friends: Friend[] = MOCK_FRIENDS): LeaderboardRow[] {
  const rows = [
    ...friends.map((f) => ({ name: f.name, rankTier: f.rank, xp: f.xp })),
    { name: youName || 'You', rankTier: '—', xp: youXp, you: true },
  ];
  rows.sort((a, b) => b.xp - a.xp);
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}
