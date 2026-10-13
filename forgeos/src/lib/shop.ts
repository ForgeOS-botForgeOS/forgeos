import type { Quest, UserQuest } from '../types';
import type { Cosmetic } from '../data/cosmetics';

// Pure rules behind quest claiming and the shop's power-ups. The stores and
// screens only wire these up, so everything that decides coins is tested here.

export const CHEST_PRICE = 150;
export const REROLL_PRICE = 30;
export const FREEZE_PRICE = 20;

export interface ClaimResult {
  quests: UserQuest[];
  count: number;
  xp: number;
  coins: number;
}

/** Marks every completed-but-unclaimed quest claimed and sums the rewards. */
export function claimCompleted(quests: UserQuest[], defs: Quest[]): ClaimResult {
  let xp = 0;
  let coins = 0;
  let count = 0;
  const next = quests.map((q) => {
    if (!q.completed || q.claimed) return q;
    const def = defs.find((d) => d.id === q.questId);
    if (!def) return q;
    xp += def.xp;
    coins += def.coins;
    count++;
    return { ...q, claimed: true };
  });
  return { quests: next, count, xp, coins };
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export function rarityOf(price: number): Rarity {
  if (price >= 450) return 'legendary';
  if (price >= 250) return 'epic';
  if (price >= 140) return 'rare';
  return 'common';
}

/** What the mystery chest can still give: buyable items you do not own yet. */
export function chestPool(all: Cosmetic[], owned: string[]): Cosmetic[] {
  return all.filter((c) => !c.exclusive && c.price > 0 && !owned.includes(c.id));
}

/**
 * Draws one item, weighted by 1/price so pricey items are the rare pulls.
 * Never a duplicate and never empty-handed (the caller disables the chest when
 * the pool is empty). `rand` is injectable so tests are deterministic.
 */
export function pickChestItem(pool: Cosmetic[], rand: () => number = Math.random): Cosmetic | null {
  if (!pool.length) return null;
  const weights = pool.map((c) => 1 / c.price);
  const total = weights.reduce((a, w) => a + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Daily quests that could replace one on today's board (not already on it). */
export function rerollCandidates(board: UserQuest[], dailyPool: Quest[]): Quest[] {
  const onBoard = new Set(board.map((q) => q.questId));
  return dailyPool.filter((q) => !onBoard.has(q.id));
}

/** A quest can be rerolled while it is a daily quest you have not finished. */
export function canReroll(uq: UserQuest | undefined, def: Quest | undefined): boolean {
  return !!uq && !!def && def.scope === 'daily' && !uq.completed && !uq.claimed;
}
