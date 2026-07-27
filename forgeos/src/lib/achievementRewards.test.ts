import { describe, it, expect } from 'vitest';
import {
  claimableSummary,
  claimedTotals,
  evaluateAchievements,
  filterAchievements,
  sortForDisplay,
} from './achievementRewards';
import { ACHIEVEMENTS, TIER_REWARD, rewardFor } from '../data/achievements';
import { EXCLUSIVE_COSMETICS } from '../data/cosmetics';
import type { AchievementStats } from '../data/achievements';

const ZERO: AchievementStats = {
  sessions: 0,
  prs: 0,
  streak: 0,
  totalVolumeKg: 0,
  quotes: 0,
  coins: 0,
  rankIndex: 0,
  heavyLifts: 0,
  cardioKm: 0,
  sleepNights8h: 0,
  totalSteps: 0,
};

const BEGINNER: AchievementStats = { ...ZERO, sessions: 5, prs: 1, streak: 3 };

describe('the achievement catalogue', () => {
  it('gives every achievement a tier', () => {
    expect(ACHIEVEMENTS.every((a) => !!a.tier)).toBe(true);
  });

  it('pays harder tiers strictly better', () => {
    expect(TIER_REWARD.bronze.xp).toBeLessThan(TIER_REWARD.silver.xp);
    expect(TIER_REWARD.silver.xp).toBeLessThan(TIER_REWARD.gold.xp);
    expect(TIER_REWARD.gold.xp).toBeLessThan(TIER_REWARD.legendary.xp);
    expect(TIER_REWARD.bronze.coins).toBeLessThan(TIER_REWARD.legendary.coins);
  });

  it('only hands exclusive cosmetics to legendary achievements', () => {
    const withCosmetic = ACHIEVEMENTS.filter((a) => a.cosmeticId);
    expect(withCosmetic.length).toBeGreaterThan(0);
    expect(withCosmetic.every((a) => a.tier === 'legendary')).toBe(true);
  });

  it('points every cosmetic grant at a real exclusive cosmetic, one each', () => {
    const granted = ACHIEVEMENTS.map((a) => a.cosmeticId).filter(Boolean) as string[];
    const ids = EXCLUSIVE_COSMETICS.map((c) => c.id);
    for (const id of granted) expect(ids).toContain(id);
    expect(new Set(granted).size).toBe(granted.length); // no cosmetic granted twice
  });

  it('never puts an exclusive cosmetic up for sale', () => {
    expect(EXCLUSIVE_COSMETICS.every((c) => c.exclusive === true && c.price === 0)).toBe(true);
  });
});

describe('evaluateAchievements', () => {
  it('unlocks exactly what the stats have earned', () => {
    const list = evaluateAchievements(BEGINNER, []);
    const byId = new Map(list.map((a) => [a.id, a]));

    expect(byId.get('first')?.unlocked).toBe(true);
    expect(byId.get('sess5')?.unlocked).toBe(true);
    expect(byId.get('ten')?.unlocked).toBe(false);
    expect(byId.get('pr1')?.unlocked).toBe(true);
    expect(byId.get('streak3')?.unlocked).toBe(true);
  });

  it('reports progress as a percentage, capped at 100', () => {
    const list = evaluateAchievements({ ...ZERO, sessions: 5 }, []);
    const byId = new Map(list.map((a) => [a.id, a]));

    expect(byId.get('ten')?.pct).toBe(50);
    expect(byId.get('first')?.pct).toBe(100); // 5 sessions vs a goal of 1
  });

  it('marks claimed achievements as claimed and no longer claimable', () => {
    const list = evaluateAchievements(BEGINNER, ['first']);
    const first = list.find((a) => a.id === 'first')!;

    expect(first.claimed).toBe(true);
    expect(first.claimable).toBe(false);
  });

  it('never makes a locked achievement claimable', () => {
    const list = evaluateAchievements(ZERO, []);
    expect(list.some((a) => a.claimable)).toBe(false);
  });
});

describe('claimableSummary', () => {
  it('sums the pending payout and collects cosmetics', () => {
    const list = evaluateAchievements(BEGINNER, []);
    const s = claimableSummary(list);
    const expected = list.filter((a) => a.claimable);

    expect(s.count).toBe(expected.length);
    expect(s.xp).toBe(expected.reduce((a, b) => a + b.reward.xp, 0));
    expect(s.coins).toBe(expected.reduce((a, b) => a + b.reward.coins, 0));
    expect(s.cosmeticIds).toEqual([]); // nothing legendary at 5 sessions
  });

  it('collects the cosmetic when a legendary achievement is claimable', () => {
    const list = evaluateAchievements({ ...ZERO, streak: 120 }, []);
    const s = claimableSummary(list);

    expect(s.cosmeticIds).toContain('x-title-unbreakable');
  });

  it('is empty once everything earned has been claimed', () => {
    const list = evaluateAchievements(BEGINNER, ACHIEVEMENTS.map((a) => a.id));
    expect(claimableSummary(list)).toEqual({ count: 0, xp: 0, coins: 0, cosmeticIds: [] });
  });
});

describe('claimedTotals', () => {
  it('adds up what has already been banked', () => {
    const list = evaluateAchievements(BEGINNER, ['first', 'pr1']);
    const t = claimedTotals(list);
    const first = rewardFor(ACHIEVEMENTS.find((a) => a.id === 'first')!);
    const pr1 = rewardFor(ACHIEVEMENTS.find((a) => a.id === 'pr1')!);

    expect(t.count).toBe(2);
    expect(t.xp).toBe(first.xp + pr1.xp);
  });
});

describe('filterAchievements', () => {
  const list = evaluateAchievements(BEGINNER, ['first']);

  it('filters by state', () => {
    expect(filterAchievements(list, 'all').length).toBe(list.length);
    expect(filterAchievements(list, 'claimable').every((a) => a.claimable)).toBe(true);
    expect(filterAchievements(list, 'unlocked').every((a) => a.unlocked)).toBe(true);
    expect(filterAchievements(list, 'locked').every((a) => !a.unlocked)).toBe(true);
  });

  it('filters by tier', () => {
    expect(filterAchievements(list, 'legendary').every((a) => a.tier === 'legendary')).toBe(true);
    expect(filterAchievements(list, 'bronze').length).toBeGreaterThan(0);
  });
});

describe('sortForDisplay', () => {
  it('puts claimable rewards first and claimed ones last', () => {
    const sorted = sortForDisplay(evaluateAchievements(BEGINNER, ['first']));

    expect(sorted[0].claimable).toBe(true);
    expect(sorted[sorted.length - 1].unlocked).toBe(true); // 'first', already claimed
  });

  it('orders locked achievements by how close they are', () => {
    const locked = sortForDisplay(evaluateAchievements(BEGINNER, [])).filter((a) => !a.unlocked);
    for (let i = 1; i < locked.length; i++) expect(locked[i - 1].pct).toBeGreaterThanOrEqual(locked[i].pct);
  });
});
