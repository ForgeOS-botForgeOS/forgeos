import { describe, it, expect, beforeEach } from 'vitest';
import { canReroll, chestPool, claimCompleted, pickChestItem, rarityOf, rerollCandidates } from './shop';
import { ALL_COSMETICS, COSMETICS, type Cosmetic } from '../data/cosmetics';
import { QUESTS } from '../data/quests';
import { useGami } from '../state/gamificationStore';
import type { Quest, UserQuest } from '../types';

const q = (questId: string, over: Partial<UserQuest> = {}): UserQuest => ({
  questId, progress: 0, completed: false, claimed: false, assignedAt: '2026-10-12T08:00:00.000Z', ...over,
});
const def = (id: string, over: Partial<Quest> = {}): Quest => ({
  id, title: id, description: '', scope: 'daily', xp: 100, coins: 5, target: 1, metric: 'sets', ...over,
});

describe('claimCompleted', () => {
  it('claims only finished, unclaimed quests and sums their rewards', () => {
    const defs = [def('a', { xp: 100, coins: 5 }), def('b', { xp: 50, coins: 2 }), def('c')];
    const r = claimCompleted([q('a', { completed: true }), q('b', { completed: true, claimed: true }), q('c')], defs);
    expect(r).toMatchObject({ count: 1, xp: 100, coins: 5 });
    expect(r.quests.map((x) => x.claimed)).toEqual([true, true, false]);
  });

  it('skips quests whose definition no longer exists', () => {
    expect(claimCompleted([q('gone', { completed: true })], []).count).toBe(0);
  });
});

describe('mystery chest', () => {
  it('only offers buyable items you do not own', () => {
    const pool = chestPool(ALL_COSMETICS, ['t-forged']);
    expect(pool.some((c) => c.id === 't-forged')).toBe(false);
    expect(pool.some((c) => c.exclusive)).toBe(false);
    expect(pool.length).toBe(COSMETICS.length - 1);
  });

  it('is empty once you own everything', () => {
    expect(chestPool(ALL_COSMETICS, COSMETICS.map((c) => c.id))).toEqual([]);
    expect(pickChestItem([])).toBeNull();
  });

  it('makes expensive items the rare pulls', () => {
    const cheap = { id: 'cheap', price: 50 } as Cosmetic;
    const pricey = { id: 'pricey', price: 500 } as Cosmetic;
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const counts = { cheap: 0, pricey: 0 };
    for (let i = 0; i < 5000; i++) counts[pickChestItem([cheap, pricey], rand)!.id as 'cheap' | 'pricey']++;
    expect(counts.cheap / counts.pricey).toBeGreaterThan(7); // 10:1 by weight
    expect(counts.pricey).toBeGreaterThan(0); // but it can happen
  });

  it('covers the edges of the roll', () => {
    const pool = COSMETICS.slice(0, 3);
    expect(pickChestItem(pool, () => 0)).toBe(pool[0]);
    expect(pickChestItem(pool, () => 0.999999)).toBe(pool[2]);
  });

  it('labels rarity by price', () => {
    expect([rarityOf(40), rarityOf(150), rarityOf(300), rarityOf(900)]).toEqual(['common', 'rare', 'epic', 'legendary']);
  });
});

describe('quest reroll rules', () => {
  it('only unfinished daily quests can be rerolled', () => {
    expect(canReroll(q('a'), def('a'))).toBe(true);
    expect(canReroll(q('a', { completed: true }), def('a'))).toBe(false);
    expect(canReroll(q('w'), def('w', { scope: 'weekly' }))).toBe(false);
    expect(canReroll(undefined, def('a'))).toBe(false);
  });

  it('never deals a quest already on the board', () => {
    const pool = [def('a'), def('b'), def('c')];
    expect(rerollCandidates([q('a'), q('b')], pool).map((d) => d.id)).toEqual(['c']);
  });
});

describe('end of day in the real store', () => {
  const daily = QUESTS.filter((d) => d.scope === 'daily');
  beforeEach(() => {
    useGami.setState({ xp: 0, coins: 0, rerolls: 0, quests: [] });
  });

  it('claims yesterday’s finished quests before dealing a new board', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    useGami.setState({
      quests: [
        q(daily[0].id, { completed: true, progress: daily[0].target, assignedAt: yesterday }),
        q(daily[1].id, { assignedAt: yesterday }),
      ],
    });
    const r = useGami.getState().ensureDailyQuests();
    expect(r).toEqual({ count: 1, xp: daily[0].xp, coins: daily[0].coins });
    const s = useGami.getState();
    expect(s.xp).toBe(daily[0].xp);
    expect(s.coins).toBe(daily[0].coins);
    // Today's board is fresh: nothing finished, nothing from yesterday.
    expect(s.quests.filter((x) => QUESTS.find((d) => d.id === x.questId)?.scope === 'daily').every((x) => !x.completed && x.assignedAt.slice(0, 10) === new Date().toISOString().slice(0, 10))).toBe(true);
  });

  it('does nothing mid-day', () => {
    useGami.getState().ensureDailyQuests();
    const first = useGami.getState().quests.find((x) => QUESTS.find((d) => d.id === x.questId)?.scope === 'daily')!;
    useGami.setState({ quests: useGami.getState().quests.map((x) => (x === first ? { ...x, completed: true } : x)) });
    expect(useGami.getState().ensureDailyQuests()).toBeNull();
    expect(useGami.getState().quests.find((x) => x.questId === first.questId)?.claimed).toBe(false); // still yours to claim
  });

  it('a reroll costs coins once and swaps the quest for a new one', () => {
    useGami.getState().ensureDailyQuests();
    useGami.setState({ coins: 100 });
    expect(useGami.getState().buyReroll()).toBe(true);
    expect(useGami.getState().coins).toBe(70);
    const target = useGami.getState().quests.find((x) => QUESTS.find((d) => d.id === x.questId)?.scope === 'daily')!;
    expect(useGami.getState().rerollDailyQuest(target.questId)).toBe(true);
    const ids = useGami.getState().quests.map((x) => x.questId);
    expect(ids).not.toContain(target.questId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(useGami.getState().rerolls).toBe(0);
    expect(useGami.getState().rerollDailyQuest(ids[0])).toBe(false); // none left
  });
});
