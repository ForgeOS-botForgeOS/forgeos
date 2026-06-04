import type { Friend, FeedPost, FriendRequest, MarketplaceRoutine } from '../types';

const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

export const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Lena', rank: 'Gold II', xp: 7400, online: true, avatarSeed: 'LN', trainingNow: true, streak: 12, lastActiveISO: ago(2) },
  { id: 'f2', name: 'Marcus', rank: 'Platinum I', xp: 12800, online: true, avatarSeed: 'MA', streak: 41, lastActiveISO: ago(8) },
  { id: 'f3', name: 'Sofia', rank: 'Silver III', xp: 3100, online: false, avatarSeed: 'SO', streak: 4, lastActiveISO: ago(180) },
  { id: 'f4', name: 'Jonas', rank: 'Legend I', xp: 24500, online: false, avatarSeed: 'JO', streak: 88, lastActiveISO: ago(420) },
  { id: 'f5', name: 'Amir', rank: 'Gold I', xp: 6200, online: true, avatarSeed: 'AM', trainingNow: true, streak: 19, lastActiveISO: ago(1) },
];

// People you might know — shown as suggestions you can send a request to.
export const MOCK_SUGGESTED: Friend[] = [
  { id: 's1', name: 'Priya', rank: 'Silver I', xp: 2200, online: true, avatarSeed: 'PR', streak: 6 },
  { id: 's2', name: 'Diego', rank: 'Gold III', xp: 8800, online: false, avatarSeed: 'DI', streak: 23 },
  { id: 's3', name: 'Yuki', rank: 'Platinum II', xp: 15400, online: true, avatarSeed: 'YU', streak: 51 },
  { id: 's4', name: 'Tomas', rank: 'Bronze II', xp: 900, online: false, avatarSeed: 'TO', streak: 2 },
];

// Incoming friend requests waiting for you to accept/decline.
export const MOCK_REQUESTS: FriendRequest[] = [
  { id: 'rq1', name: 'Elena', avatarSeed: 'EL', rank: 'Gold I', xp: 6700, direction: 'incoming', createdAt: ago(35), mutuals: 2 },
  { id: 'rq2', name: 'Kwame', avatarSeed: 'KW', rank: 'Platinum III', xp: 18900, direction: 'incoming', createdAt: ago(140), mutuals: 1 },
];

export const MOCK_FEED: FeedPost[] = [
  {
    id: 'p1',
    authorId: 'f2',
    authorName: 'Marcus',
    avatarSeed: 'MA',
    body: 'New squat PR — 180 kg x 3. Knees were shaking but it moved 🦵',
    flex: { icon: '🏆', label: 'New PR · Squat 180kg' },
    workoutSummary: { volumeKg: 9800, sets: 22, durationMin: 64 },
    createdAt: ago(42),
    reactions: { '🔥': 12, '💪': 8, '🐐': 3 },
    comments: [
      { id: 'c1', authorName: 'Lena', avatarSeed: 'LN', body: 'Monster. Those knees earned it 🔥', createdAt: ago(38) },
      { id: 'c2', authorName: 'Amir', avatarSeed: 'AM', body: 'Form looked crisp too', createdAt: ago(30) },
    ],
  },
  {
    id: 'p2',
    authorId: 'f1',
    authorName: 'Lena',
    avatarSeed: 'LN',
    body: 'Day 30 of the streak. The habit finally feels automatic.',
    flex: { icon: '🔥', label: '30-day streak' },
    createdAt: ago(180),
    reactions: { '🔥': 21, '👏': 9 },
    comments: [{ id: 'c3', authorName: 'Sofia', avatarSeed: 'SO', body: 'Inspiring, ngl', createdAt: ago(160) }],
  },
  {
    id: 'p3',
    authorId: 'f4',
    authorName: 'Jonas',
    avatarSeed: 'JO',
    body: 'Published a new 5-week strength block in the marketplace. Built it around the Plateau Breaker logic.',
    workoutSummary: { volumeKg: 14200, sets: 28, durationMin: 78 },
    createdAt: ago(540),
    reactions: { '🔥': 31, '💰': 14, '🧠': 6 },
  },
  {
    id: 'p4',
    authorId: 'f5',
    authorName: 'Amir',
    avatarSeed: 'AM',
    body: 'First muscle-up today. Five years of trying. Don’t quit 🤸',
    flex: { icon: '🎖️', label: 'Skill unlocked · Muscle-up' },
    createdAt: ago(900),
    reactions: { '🔥': 44, '👏': 27, '🐐': 11 },
  },
];

// A pool of believable posts to drip into the feed when you refresh it.
export const MOCK_FEED_DRIP: Omit<FeedPost, 'id' | 'createdAt'>[] = [
  { authorId: 'f3', authorName: 'Sofia', avatarSeed: 'SO', body: 'Hit 100kg deadlift for the first time! 🎉', flex: { icon: '🏆', label: 'New PR · Deadlift 100kg' }, reactions: { '🔥': 3 } },
  { authorId: 'f1', authorName: 'Lena', avatarSeed: 'LN', body: 'Sunrise run done before work. Feeling unstoppable.', workoutSummary: { volumeKg: 0, sets: 0, durationMin: 32 }, reactions: {} },
  { authorId: 'f2', authorName: 'Marcus', avatarSeed: 'MA', body: 'Deload week — ego left at the door. Recovery is training too.', reactions: { '💪': 5 } },
  { authorId: 'f5', authorName: 'Amir', avatarSeed: 'AM', body: 'Ranked up to Gold I 🥇 Onward.', flex: { icon: '⭐', label: 'Rank up · Gold I' }, reactions: { '🔥': 7 } },
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
