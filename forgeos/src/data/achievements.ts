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
  // Recovery (0 until health data is synced)
  sleepNights8h: number; // nights with 8h+ sleep, all time
  totalSteps: number; // steps across all synced days
}

// How hard an achievement is to earn — drives what claiming it pays out.
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legendary';

export interface AchievementReward {
  xp: number;
  coins: number;
  /** An achievement-only cosmetic (see data/cosmetics.ts) — never purchasable. */
  cosmeticId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  goal: number;
  tier: AchievementTier;
  /** Set only on the few achievements that grant something you cannot buy. */
  cosmeticId?: string;
  value: (s: AchievementStats) => number;
}

// One payout table instead of 55 hand-written numbers: the tier *is* the reward,
// so a new achievement can never accidentally pay out more than a harder one.
export const TIER_REWARD: Record<AchievementTier, { xp: number; coins: number }> = {
  bronze: { xp: 100, coins: 25 },
  silver: { xp: 300, coins: 75 },
  gold: { xp: 800, coins: 200 },
  legendary: { xp: 2000, coins: 600 },
};

export const TIER_COLOR: Record<AchievementTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c8d4',
  gold: '#ffd24a',
  legendary: 'rgb(var(--accent-2))',
};

export function rewardFor(a: Achievement): AchievementReward {
  const base = TIER_REWARD[a.tier];
  return a.cosmeticId ? { ...base, cosmeticId: a.cosmeticId } : { ...base };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---- Sessions ----
  { id: 'first', title: 'First Steps', desc: 'Complete your first workout', icon: '👣', goal: 1, tier: 'bronze', value: (s) => s.sessions },
  { id: 'sess5', title: 'Warming Up', desc: 'Complete 5 workouts', icon: '🌱', goal: 5, tier: 'bronze', value: (s) => s.sessions },
  { id: 'ten', title: 'Getting Serious', desc: 'Complete 10 workouts', icon: '🔟', goal: 10, tier: 'bronze', value: (s) => s.sessions },
  { id: 'sess25', title: 'Committed', desc: 'Complete 25 workouts', icon: '📌', goal: 25, tier: 'silver', value: (s) => s.sessions },
  { id: 'fifty', title: 'Regular', desc: 'Complete 50 workouts', icon: '📅', goal: 50, tier: 'silver', value: (s) => s.sessions },
  { id: 'sess75', title: 'Devoted', desc: 'Complete 75 workouts', icon: '🧱', goal: 75, tier: 'gold', value: (s) => s.sessions },
  { id: 'century', title: 'Centurion', desc: 'Complete 100 workouts', icon: '💯', goal: 100, tier: 'gold', value: (s) => s.sessions },
  { id: 'sess200', title: 'Iron Veteran', desc: 'Complete 200 workouts', icon: '🎖️', goal: 200, tier: 'legendary', value: (s) => s.sessions },
  { id: 'sess365', title: 'A Year of Iron', desc: 'Complete 365 workouts', icon: '🗓️', goal: 365, tier: 'legendary', cosmeticId: 'x-title-yearofiron', value: (s) => s.sessions },

  // ---- PRs ----
  { id: 'pr1', title: 'Record Setter', desc: 'Set your first PR', icon: '🥇', goal: 1, tier: 'bronze', value: (s) => s.prs },
  { id: 'pr5', title: 'On a Roll', desc: 'Set 5 PRs', icon: '📈', goal: 5, tier: 'silver', value: (s) => s.prs },
  { id: 'pr10', title: 'Breaking Limits', desc: 'Set 10 PRs', icon: '🏅', goal: 10, tier: 'silver', value: (s) => s.prs },
  { id: 'pr25', title: 'Ceiling Smasher', desc: 'Set 25 PRs', icon: '🚀', goal: 25, tier: 'gold', value: (s) => s.prs },
  { id: 'pr50', title: 'Limitless', desc: 'Set 50 PRs', icon: '🌟', goal: 50, tier: 'legendary', value: (s) => s.prs },

  // ---- Streak ----
  { id: 'streak3', title: 'Momentum', desc: '3-day streak', icon: '✨', goal: 3, tier: 'bronze', value: (s) => s.streak },
  { id: 'streak7', title: 'One Week Strong', desc: '7-day streak', icon: '🔥', goal: 7, tier: 'silver', value: (s) => s.streak },
  { id: 'streak14', title: 'Fortnight Fire', desc: '14-day streak', icon: '🔆', goal: 14, tier: 'silver', value: (s) => s.streak },
  { id: 'streak30', title: 'Iron Habit', desc: '30-day streak', icon: '🗓️', goal: 30, tier: 'gold', value: (s) => s.streak },
  { id: 'streak60', title: 'Relentless', desc: '60-day streak', icon: '⚡', goal: 60, tier: 'gold', value: (s) => s.streak },
  { id: 'streak100', title: 'Unbreakable', desc: '100-day streak', icon: '⛓️', goal: 100, tier: 'legendary', cosmeticId: 'x-title-unbreakable', value: (s) => s.streak },

  // ---- Volume ----
  { id: 'vol10k', title: 'Mover', desc: 'Lift 10,000 kg total', icon: '📦', goal: 10000, tier: 'bronze', value: (s) => s.totalVolumeKg },
  { id: 'vol50k', title: 'Workhorse', desc: 'Lift 50,000 kg total', icon: '🐴', goal: 50000, tier: 'silver', value: (s) => s.totalVolumeKg },
  { id: 'ton', title: 'Tonnage', desc: 'Lift 100,000 kg total', icon: '🏗️', goal: 100000, tier: 'gold', value: (s) => s.totalVolumeKg },
  { id: 'vol250k', title: 'Quarter Million', desc: 'Lift 250,000 kg total', icon: '🏭', goal: 250000, tier: 'gold', value: (s) => s.totalVolumeKg },
  { id: 'vol500k', title: 'Half a Mountain', desc: 'Lift 500,000 kg total', icon: '🏔️', goal: 500000, tier: 'legendary', value: (s) => s.totalVolumeKg },
  { id: 'megaton', title: 'Iron Mountain', desc: 'Lift 1,000,000 kg total', icon: '⛰️', goal: 1000000, tier: 'legendary', cosmeticId: 'x-frame-ironmountain', value: (s) => s.totalVolumeKg },
  { id: 'vol2_5m', title: 'Tectonic', desc: 'Lift 2,500,000 kg total', icon: '🌋', goal: 2500000, tier: 'legendary', cosmeticId: 'x-title-tectonic', value: (s) => s.totalVolumeKg },

  // ---- Heavy sets (100kg+) ----
  { id: 'heavy1', title: '100 Club', desc: 'Complete a set at 100 kg+', icon: '💪', goal: 1, tier: 'bronze', value: (s) => s.heavyLifts },
  { id: 'heavy10', title: 'Triple Plates', desc: '10 sets at 100 kg+', icon: '🔟', goal: 10, tier: 'silver', value: (s) => s.heavyLifts },
  { id: 'heavy25', title: 'Plate Mover', desc: '25 sets at 100 kg+', icon: '🔩', goal: 25, tier: 'silver', value: (s) => s.heavyLifts },
  { id: 'heavy50', title: 'Iron Forged', desc: '50 sets at 100 kg+', icon: '⚒️', goal: 50, tier: 'gold', value: (s) => s.heavyLifts },
  { id: 'heavy100', title: 'Heavy Hitter', desc: '100 sets at 100 kg+', icon: '🦏', goal: 100, tier: 'legendary', value: (s) => s.heavyLifts },
  { id: 'heavy250', title: 'Titan', desc: '250 sets at 100 kg+', icon: '🗿', goal: 250, tier: 'legendary', cosmeticId: 'x-frame-titan', value: (s) => s.heavyLifts },

  // ---- Cardio ----
  { id: 'cardio1', title: 'First Mile', desc: 'Log your first cardio km', icon: '🏃', goal: 1, tier: 'bronze', value: (s) => s.cardioKm },
  { id: 'cardio25', title: 'Pavement Pounder', desc: 'Cover 25 km of cardio', icon: '👟', goal: 25, tier: 'silver', value: (s) => s.cardioKm },
  { id: 'cardio100', title: 'Century Rider', desc: 'Cover 100 km of cardio', icon: '🚴', goal: 100, tier: 'gold', value: (s) => s.cardioKm },
  { id: 'cardio500', title: 'Endurance Engine', desc: 'Cover 500 km of cardio', icon: '🛣️', goal: 500, tier: 'legendary', value: (s) => s.cardioKm },

  // ---- Quotes ----
  { id: 'q10', title: 'Curious Mind', desc: 'Collect 10 quotes', icon: '📝', goal: 10, tier: 'bronze', value: (s) => s.quotes },
  { id: 'q50', title: 'Bookworm', desc: 'Collect 50 quotes', icon: '📖', goal: 50, tier: 'silver', value: (s) => s.quotes },
  { id: 'q100', title: 'Philosopher', desc: 'Collect 100 quotes', icon: '🧠', goal: 100, tier: 'gold', value: (s) => s.quotes },
  { id: 'q200', title: 'Sage', desc: 'Collect 200 quotes', icon: '🦉', goal: 200, tier: 'legendary', value: (s) => s.quotes },

  // ---- Coins ----
  { id: 'coin100', title: 'Pocket Change', desc: 'Hold 100 Forge Coins', icon: '🪙', goal: 100, tier: 'bronze', value: (s) => s.coins },
  { id: 'rich', title: 'Coin Hoarder', desc: 'Hold 500 Forge Coins', icon: '💰', goal: 500, tier: 'silver', value: (s) => s.coins },
  { id: 'coin1k', title: 'Forge Banker', desc: 'Hold 1,000 Forge Coins', icon: '🏦', goal: 1000, tier: 'gold', value: (s) => s.coins },
  { id: 'coin2_5k', title: 'Iron Tycoon', desc: 'Hold 2,500 Forge Coins', icon: '💎', goal: 2500, tier: 'legendary', value: (s) => s.coins },

  // ---- Rank ----
  { id: 'silver', title: 'Tempered', desc: 'Reach Silver rank', icon: '🥈', goal: 3, tier: 'silver', value: (s) => s.rankIndex },
  { id: 'gold', title: 'Struck Gold', desc: 'Reach Gold rank', icon: '🏆', goal: 6, tier: 'gold', value: (s) => s.rankIndex },
  { id: 'platinum', title: 'Forged in Platinum', desc: 'Reach Platinum rank', icon: '🔱', goal: 9, tier: 'gold', value: (s) => s.rankIndex },
  { id: 'legend', title: 'Living Legend', desc: 'Reach Legend rank', icon: '👑', goal: 12, tier: 'legendary', value: (s) => s.rankIndex },
  { id: 'apex', title: 'Apex Forged', desc: 'Reach the highest rank', icon: '🔝', goal: 17, tier: 'legendary', cosmeticId: 'x-theme-champions-forge', value: (s) => s.rankIndex },

  // ---- Milestone flavour ----
  { id: 'pr_and_heavy', title: 'Strong All Round', desc: '10 PRs and 25 heavy sets', icon: '🧨', goal: 2, tier: 'gold', value: (s) => (s.prs >= 10 ? 1 : 0) + (s.heavyLifts >= 25 ? 1 : 0) },
  { id: 'wellrounded', title: 'Complete Athlete', desc: '50 sessions, 50 km cardio, 50 PRs', icon: '🏵️', goal: 3, tier: 'legendary', cosmeticId: 'x-frame-laurel', value: (s) => (s.sessions >= 50 ? 1 : 0) + (s.cardioKm >= 50 ? 1 : 0) + (s.prs >= 50 ? 1 : 0) },

  // ---- Recovery (Garmin/health sync) ----
  { id: 'sleep8x7', title: 'Well Rested', desc: '7 nights of 8h+ sleep', icon: '😴', goal: 7, tier: 'silver', value: (s) => s.sleepNights8h },
  { id: 'sleep8x30', title: 'Sleep Athlete', desc: '30 nights of 8h+ sleep', icon: '🛌', goal: 30, tier: 'gold', value: (s) => s.sleepNights8h },
  { id: 'sleep8x100', title: 'Recovery Master', desc: '100 nights of 8h+ sleep', icon: '🌙', goal: 100, tier: 'legendary', value: (s) => s.sleepNights8h },
  { id: 'steps100k', title: 'Wanderer', desc: 'Walk 100,000 steps (synced)', icon: '🚶', goal: 100000, tier: 'gold', value: (s) => s.totalSteps },
  { id: 'steps1m', title: 'Million Stepper', desc: 'Walk 1,000,000 steps (synced)', icon: '🌍', goal: 1000000, tier: 'legendary', value: (s) => s.totalSteps },
];
