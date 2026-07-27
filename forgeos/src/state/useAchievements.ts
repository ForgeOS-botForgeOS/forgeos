import { useMemo } from 'react';
import type { AchievementStats } from '../data/achievements';
import { rankForXp } from '../data/ranks';
import {
  claimableSummary,
  claimedTotals,
  evaluateAchievements,
  type ClaimSummary,
  type EvaluatedAchievement,
} from '../lib/achievementRewards';
import { useWorkout } from './workoutStore';
import { useGami } from './gamificationStore';
import { useQuotes } from './quoteStore';
import { useHealth } from './healthStore';

export interface AchievementSnapshot {
  stats: AchievementStats;
  evaluated: EvaluatedAchievement[];
  pending: ClaimSummary;
  banked: Omit<ClaimSummary, 'cosmeticIds'>;
  unlockedCount: number;
}

/**
 * The achievement picture, assembled from every store that feeds it. Lives here
 * (not in a screen) because two places need it: the Achievements screen and the
 * "N rewards waiting" badge on Profile.
 */
export function useAchievements(): AchievementSnapshot {
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const xp = useGami((s) => s.xp);
  const coins = useGami((s) => s.coins);
  const streak = useGami((s) => s.streakDays);
  const heavyLifts = useGami((s) => s.heavyLifts);
  const claimedIds = useGami((s) => s.claimedAchievements);
  const quotes = useQuotes((s) => s.collected);
  const healthDays = useHealth((s) => s.days);

  const stats = useMemo<AchievementStats>(() => {
    const healthList = Object.values(healthDays);
    return {
      sessions: history.length,
      prs: prs.length,
      streak,
      totalVolumeKg: history.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0),
      quotes: quotes.length,
      coins,
      rankIndex: rankForXp(xp).index,
      heavyLifts,
      cardioKm: history.reduce((a, w) => a + (w.cardio?.distanceKm ?? 0), 0),
      sleepNights8h: healthList.filter((d) => (d.sleepMinutes ?? 0) >= 480).length,
      totalSteps: healthList.reduce((a, d) => a + (d.steps ?? 0), 0),
    };
  }, [history, prs, streak, quotes, coins, xp, heavyLifts, healthDays]);

  const evaluated = useMemo(() => evaluateAchievements(stats, claimedIds), [stats, claimedIds]);

  return useMemo(
    () => ({
      stats,
      evaluated,
      pending: claimableSummary(evaluated),
      banked: claimedTotals(evaluated),
      unlockedCount: evaluated.filter((a) => a.unlocked).length,
    }),
    [stats, evaluated],
  );
}
