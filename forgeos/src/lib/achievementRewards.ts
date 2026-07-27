import {
  ACHIEVEMENTS,
  rewardFor,
  type Achievement,
  type AchievementReward,
  type AchievementStats,
  type AchievementTier,
} from '../data/achievements';

// ---- Achievement evaluation + reward claiming ----
// Achievements were display-only: they lit up and that was it. Now each one pays
// out by tier, and seven legendary ones grant a cosmetic that cannot be bought.
// All of the deciding happens here (pure), so the screen only renders and the
// store only moves numbers.

// `value` on the catalogue entry is the *getter*; here it's the number it
// returned, so the raw function is dropped rather than shadowed.
export interface EvaluatedAchievement extends Omit<Achievement, 'value'> {
  value: number;
  unlocked: boolean;
  pct: number; // 0–100 progress toward the goal
  claimed: boolean;
  claimable: boolean; // unlocked and not yet claimed
  reward: AchievementReward;
}

export function evaluateAchievements(stats: AchievementStats, claimedIds: string[]): EvaluatedAchievement[] {
  const claimed = new Set(claimedIds);
  return ACHIEVEMENTS.map((a) => {
    const value = a.value(stats);
    const unlocked = value >= a.goal;
    return {
      ...a,
      value,
      unlocked,
      pct: a.goal > 0 ? Math.min(100, Math.max(0, (value / a.goal) * 100)) : 0,
      claimed: claimed.has(a.id),
      claimable: unlocked && !claimed.has(a.id),
      reward: rewardFor(a),
    };
  });
}

export interface ClaimSummary {
  count: number;
  xp: number;
  coins: number;
  cosmeticIds: string[];
}

/** What tapping "claim everything" would pay out right now. */
export function claimableSummary(list: EvaluatedAchievement[]): ClaimSummary {
  return list.filter((a) => a.claimable).reduce<ClaimSummary>(
    (acc, a) => ({
      count: acc.count + 1,
      xp: acc.xp + a.reward.xp,
      coins: acc.coins + a.reward.coins,
      cosmeticIds: a.reward.cosmeticId ? [...acc.cosmeticIds, a.reward.cosmeticId] : acc.cosmeticIds,
    }),
    { count: 0, xp: 0, coins: 0, cosmeticIds: [] },
  );
}

/** Rewards already banked — the "you've earned this much" line. */
export function claimedTotals(list: EvaluatedAchievement[]): Omit<ClaimSummary, 'cosmeticIds'> {
  return list.filter((a) => a.claimed).reduce(
    (acc, a) => ({ count: acc.count + 1, xp: acc.xp + a.reward.xp, coins: acc.coins + a.reward.coins }),
    { count: 0, xp: 0, coins: 0 },
  );
}

export type AchievementFilter = 'all' | 'claimable' | 'unlocked' | 'locked' | AchievementTier;

export function filterAchievements(list: EvaluatedAchievement[], filter: AchievementFilter): EvaluatedAchievement[] {
  switch (filter) {
    case 'all':
      return list;
    case 'claimable':
      return list.filter((a) => a.claimable);
    case 'unlocked':
      return list.filter((a) => a.unlocked);
    case 'locked':
      return list.filter((a) => !a.unlocked);
    default:
      return list.filter((a) => a.tier === filter);
  }
}

/**
 * Claimable first (there's a reward waiting), then closest-to-done, then the
 * rest — so the top of the screen is always the part worth looking at.
 */
export function sortForDisplay(list: EvaluatedAchievement[]): EvaluatedAchievement[] {
  return [...list].sort((a, b) => {
    if (a.claimable !== b.claimable) return a.claimable ? -1 : 1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1; // done-and-claimed sinks
    return b.pct - a.pct;
  });
}
