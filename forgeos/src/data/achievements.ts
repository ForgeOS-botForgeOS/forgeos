export interface AchievementStats {
  sessions: number;
  prs: number;
  streak: number;
  totalVolumeKg: number;
  quotes: number;
  coins: number;
  rankIndex: number; // index into RANKS
  heavyLifts: number;
  cardioKm: number;
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
  // ---- Sessions ----
  { id: 'first', title: 'First Steps', desc: 'Complete your first workout', icon: '👣', goal: 1, value: (s) => s.sessions },
  { id: 'sess5', title: 'Warming Up', desc: 'Complete 5 workouts', icon: '🌱', goal: 5, value: (s) => s.sessions },
  { id: 'ten', title: 'Getting Serious', desc: 'Complete 10 workouts', icon: '🔟', goal: 10, value: (s) => s.sessions },
  { id: 'sess25', title: 'Committed', desc: 'Complete 25 workouts', icon: '📌', goal: 25, value: (s) => s.sessions },
  { id: 'fifty', title: 'Regular', desc: 'Complete 50 workouts', icon: '📅', goal: 50, value: (s) => s.sessions },
  { id: 'sess75', title: 'Devoted', desc: 'Complete 75 workouts', icon: '🧱', goal: 75, value: (s) => s.sessions },
  { id: 'century', title: 'Centurion', desc: 'Complete 100 workouts', icon: '💯', goal: 100, value: (s) => s.sessions },
  { id: 'sess200', title: 'Iron Veteran', desc: 'Complete 200 workouts', icon: '🎖️', goal: 200, value: (s) => s.sessions },
  { id: 'sess365', title: 'A Year of Iron', desc: 'Complete 365 workouts', icon: '🗓️', goal: 365, value: (s) => s.sessions },

  // ---- PRs ----
  { id: 'pr1', title: 'Record Setter', desc: 'Set your first PR', icon: '🥇', goal: 1, value: (s) => s.prs },
  { id: 'pr5', title: 'On a Roll', desc: 'Set 5 PRs', icon: '📈', goal: 5, value: (s) => s.prs },
  { id: 'pr10', title: 'Breaking Limits', desc: 'Set 10 PRs', icon: '🏅', goal: 10, value: (s) => s.prs },
  { id: 'pr25', title: 'Ceiling Smasher', desc: 'Set 25 PRs', icon: '🚀', goal: 25, value: (s) => s.prs },
  { id: 'pr50', title: 'Limitless', desc: 'Set 50 PRs', icon: '🌟', goal: 50, value: (s) => s.prs },

  // ---- Streak ----
  { id: 'streak3', title: 'Momentum', desc: '3-day streak', icon: '✨', goal: 3, value: (s) => s.streak },
  { id: 'streak7', title: 'One Week Strong', desc: '7-day streak', icon: '🔥', goal: 7, value: (s) => s.streak },
  { id: 'streak14', title: 'Fortnight Fire', desc: '14-day streak', icon: '🔆', goal: 14, value: (s) => s.streak },
  { id: 'streak30', title: 'Iron Habit', desc: '30-day streak', icon: '🗓️', goal: 30, value: (s) => s.streak },
  { id: 'streak60', title: 'Relentless', desc: '60-day streak', icon: '⚡', goal: 60, value: (s) => s.streak },
  { id: 'streak100', title: 'Unbreakable', desc: '100-day streak', icon: '⛓️', goal: 100, value: (s) => s.streak },

  // ---- Volume ----
  { id: 'vol10k', title: 'Mover', desc: 'Lift 10,000 kg total', icon: '📦', goal: 10000, value: (s) => s.totalVolumeKg },
  { id: 'vol50k', title: 'Workhorse', desc: 'Lift 50,000 kg total', icon: '🐴', goal: 50000, value: (s) => s.totalVolumeKg },
  { id: 'ton', title: 'Tonnage', desc: 'Lift 100,000 kg total', icon: '🏗️', goal: 100000, value: (s) => s.totalVolumeKg },
  { id: 'vol250k', title: 'Quarter Million', desc: 'Lift 250,000 kg total', icon: '🏭', goal: 250000, value: (s) => s.totalVolumeKg },
  { id: 'vol500k', title: 'Half a Mountain', desc: 'Lift 500,000 kg total', icon: '🏔️', goal: 500000, value: (s) => s.totalVolumeKg },
  { id: 'megaton', title: 'Iron Mountain', desc: 'Lift 1,000,000 kg total', icon: '⛰️', goal: 1000000, value: (s) => s.totalVolumeKg },
  { id: 'vol2_5m', title: 'Tectonic', desc: 'Lift 2,500,000 kg total', icon: '🌋', goal: 2500000, value: (s) => s.totalVolumeKg },

  // ---- Heavy sets (100kg+) ----
  { id: 'heavy1', title: '100 Club', desc: 'Complete a set at 100 kg+', icon: '💪', goal: 1, value: (s) => s.heavyLifts },
  { id: 'heavy10', title: 'Triple Plates', desc: '10 sets at 100 kg+', icon: '🔟', goal: 10, value: (s) => s.heavyLifts },
  { id: 'heavy25', title: 'Plate Mover', desc: '25 sets at 100 kg+', icon: '🔩', goal: 25, value: (s) => s.heavyLifts },
  { id: 'heavy50', title: 'Iron Forged', desc: '50 sets at 100 kg+', icon: '⚒️', goal: 50, value: (s) => s.heavyLifts },
  { id: 'heavy100', title: 'Heavy Hitter', desc: '100 sets at 100 kg+', icon: '🦏', goal: 100, value: (s) => s.heavyLifts },
  { id: 'heavy250', title: 'Titan', desc: '250 sets at 100 kg+', icon: '🗿', goal: 250, value: (s) => s.heavyLifts },

  // ---- Cardio ----
  { id: 'cardio1', title: 'First Mile', desc: 'Log your first cardio km', icon: '🏃', goal: 1, value: (s) => s.cardioKm },
  { id: 'cardio25', title: 'Pavement Pounder', desc: 'Cover 25 km of cardio', icon: '👟', goal: 25, value: (s) => s.cardioKm },
  { id: 'cardio100', title: 'Century Rider', desc: 'Cover 100 km of cardio', icon: '🚴', goal: 100, value: (s) => s.cardioKm },
  { id: 'cardio500', title: 'Endurance Engine', desc: 'Cover 500 km of cardio', icon: '🛣️', goal: 500, value: (s) => s.cardioKm },

  // ---- Quotes ----
  { id: 'q10', title: 'Curious Mind', desc: 'Collect 10 quotes', icon: '📝', goal: 10, value: (s) => s.quotes },
  { id: 'q50', title: 'Bookworm', desc: 'Collect 50 quotes', icon: '📖', goal: 50, value: (s) => s.quotes },
  { id: 'q100', title: 'Philosopher', desc: 'Collect 100 quotes', icon: '🧠', goal: 100, value: (s) => s.quotes },
  { id: 'q200', title: 'Sage', desc: 'Collect 200 quotes', icon: '🦉', goal: 200, value: (s) => s.quotes },

  // ---- Coins ----
  { id: 'coin100', title: 'Pocket Change', desc: 'Hold 100 Forge Coins', icon: '🪙', goal: 100, value: (s) => s.coins },
  { id: 'rich', title: 'Coin Hoarder', desc: 'Hold 500 Forge Coins', icon: '💰', goal: 500, value: (s) => s.coins },
  { id: 'coin1k', title: 'Forge Banker', desc: 'Hold 1,000 Forge Coins', icon: '🏦', goal: 1000, value: (s) => s.coins },
  { id: 'coin2_5k', title: 'Iron Tycoon', desc: 'Hold 2,500 Forge Coins', icon: '💎', goal: 2500, value: (s) => s.coins },

  // ---- Rank ----
  { id: 'silver', title: 'Tempered', desc: 'Reach Silver rank', icon: '🥈', goal: 3, value: (s) => s.rankIndex },
  { id: 'gold', title: 'Struck Gold', desc: 'Reach Gold rank', icon: '🏆', goal: 6, value: (s) => s.rankIndex },
  { id: 'platinum', title: 'Forged in Platinum', desc: 'Reach Platinum rank', icon: '🔱', goal: 9, value: (s) => s.rankIndex },
  { id: 'legend', title: 'Living Legend', desc: 'Reach Legend rank', icon: '👑', goal: 12, value: (s) => s.rankIndex },
  { id: 'apex', title: 'Apex Forged', desc: 'Reach the highest rank', icon: '🔝', goal: 17, value: (s) => s.rankIndex },

  // ---- Milestone flavour ----
  { id: 'pr_and_heavy', title: 'Strong All Round', desc: '10 PRs and 25 heavy sets', icon: '🧨', goal: 2, value: (s) => (s.prs >= 10 ? 1 : 0) + (s.heavyLifts >= 25 ? 1 : 0) },
  { id: 'wellrounded', title: 'Complete Athlete', desc: '50 sessions, 50 km cardio, 50 PRs', icon: '🏵️', goal: 3, value: (s) => (s.sessions >= 50 ? 1 : 0) + (s.cardioKm >= 50 ? 1 : 0) + (s.prs >= 50 ? 1 : 0) },
];
