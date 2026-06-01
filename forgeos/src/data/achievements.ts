export interface AchievementStats {
  sessions: number;
  prs: number;
  streak: number;
  totalVolumeKg: number;
  quotes: number;
  coins: number;
  rankIndex: number; // index into RANKS
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  goal: number;
  value: (s: AchievementStats) => number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'First Steps', desc: 'Complete your first workout', icon: '👣', goal: 1, value: (s) => s.sessions },
  { id: 'ten', title: 'Getting Serious', desc: 'Complete 10 workouts', icon: '🔟', goal: 10, value: (s) => s.sessions },
  { id: 'fifty', title: 'Regular', desc: 'Complete 50 workouts', icon: '📅', goal: 50, value: (s) => s.sessions },
  { id: 'century', title: 'Centurion', desc: 'Complete 100 workouts', icon: '💯', goal: 100, value: (s) => s.sessions },
  { id: 'pr1', title: 'Record Setter', desc: 'Set your first PR', icon: '🥇', goal: 1, value: (s) => s.prs },
  { id: 'pr10', title: 'Breaking Limits', desc: 'Set 10 PRs', icon: '🏅', goal: 10, value: (s) => s.prs },
  { id: 'streak7', title: 'One Week Strong', desc: '7-day streak', icon: '🔥', goal: 7, value: (s) => s.streak },
  { id: 'streak30', title: 'Iron Habit', desc: '30-day streak', icon: '🗓️', goal: 30, value: (s) => s.streak },
  { id: 'streak100', title: 'Unbreakable', desc: '100-day streak', icon: '⛓️', goal: 100, value: (s) => s.streak },
  { id: 'ton', title: 'Tonnage', desc: 'Lift 100,000 kg total', icon: '🏗️', goal: 100000, value: (s) => s.totalVolumeKg },
  { id: 'megaton', title: 'Iron Mountain', desc: 'Lift 1,000,000 kg total', icon: '⛰️', goal: 1000000, value: (s) => s.totalVolumeKg },
  { id: 'q50', title: 'Bookworm', desc: 'Collect 50 quotes', icon: '📖', goal: 50, value: (s) => s.quotes },
  { id: 'q200', title: 'Sage', desc: 'Collect all 200 quotes', icon: '🦉', goal: 200, value: (s) => s.quotes },
  { id: 'rich', title: 'Coin Hoarder', desc: 'Hold 500 Forge Coins', icon: '🪙', goal: 500, value: (s) => s.coins },
  { id: 'gold', title: 'Struck Gold', desc: 'Reach Gold rank', icon: '🏆', goal: 6, value: (s) => s.rankIndex },
  { id: 'legend', title: 'Living Legend', desc: 'Reach Legend rank', icon: '👑', goal: 12, value: (s) => s.rankIndex },
];
