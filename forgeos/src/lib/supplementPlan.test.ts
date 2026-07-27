import { describe, it, expect } from 'vitest';
import { flagsFor, supplementPlan, supplementSummary, type SupplementContext } from './supplementPlan';
import { SUPPLEMENTS, SUPPLEMENT_DISCLAIMER } from '../data/supplements';

const BASE: SupplementContext = {
  goal: 'recomp',
  diet: 'omnivore',
  avgSleepH: 8,
  sessionsPerWeek: 3,
  month: 5, // June — plenty of sun
};

describe('the supplement catalogue', () => {
  it('gives every entry food sources, a dose, timing and a caution', () => {
    for (const s of SUPPLEMENTS) {
      expect(s.foodFirst.length, s.name).toBeGreaterThan(20);
      expect(s.typical.length, s.name).toBeGreaterThan(10);
      expect(s.timing.length, s.name).toBeGreaterThan(10);
      expect(s.caution.length, s.name).toBeGreaterThan(20);
      expect(s.recovery.length, s.name).toBeGreaterThan(30);
    }
  });

  it('never states a dose in grams for a micronutrient', () => {
    // Guards against a copy-paste that turns 25 µg of vitamin D into 25 mg.
    const micro = ['vitamin-d', 'b12', 'zinc', 'vitamin-c'];
    for (const id of micro) {
      const s = SUPPLEMENTS.find((x) => x.id === id)!;
      expect(/\d\s?g\b/.test(s.typical), `${s.name}: ${s.typical}`).toBe(false);
    }
  });

  it('tells you to get a blood test before taking iron', () => {
    const iron = SUPPLEMENTS.find((s) => s.id === 'iron')!;
    expect(iron.typical.toLowerCase()).toContain('blood test');
    expect(iron.basePriority).toBe('situational');
  });

  it('carries an explicit under-18 warning on creatine and caffeine', () => {
    expect(SUPPLEMENTS.find((s) => s.id === 'creatine')!.caution.toLowerCase()).toContain('under 18');
    expect(SUPPLEMENTS.find((s) => s.id === 'caffeine')!.typical.toLowerCase()).toContain('teen');
  });

  it('says food first and not-medical-advice in the disclaimer', () => {
    expect(SUPPLEMENT_DISCLAIMER.toLowerCase()).toContain('food first');
    expect(SUPPLEMENT_DISCLAIMER.toLowerCase()).toMatch(/(not|nothing here is) medical advice/);
    expect(SUPPLEMENT_DISCLAIMER.toLowerCase()).toContain('under 18');
  });
});

describe('flagsFor', () => {
  it('finds nothing on a well-slept summer week with moderate training', () => {
    expect(flagsFor(BASE)).toEqual([]);
  });

  it('flags short sleep', () => {
    expect(flagsFor({ ...BASE, avgSleepH: 6.2 })).toContain('lowSleep');
  });

  it('ignores sleep when there is no health data', () => {
    expect(flagsFor({ ...BASE, avgSleepH: 0 })).not.toContain('lowSleep');
  });

  it('flags hard training at 4 sessions a week', () => {
    expect(flagsFor({ ...BASE, sessionsPerWeek: 4 })).toContain('hardTraining');
    expect(flagsFor({ ...BASE, sessionsPerWeek: 3 })).not.toContain('hardTraining');
  });

  it('flags the dark months and not the bright ones', () => {
    for (const month of [0, 1, 2, 9, 10, 11]) expect(flagsFor({ ...BASE, month }), String(month)).toContain('darkMonths');
    for (const month of [3, 4, 5, 6, 7, 8]) expect(flagsFor({ ...BASE, month }), String(month)).not.toContain('darkMonths');
  });

  it('flags the diet', () => {
    expect(flagsFor({ ...BASE, diet: 'vegan' })).toContain('vegan');
    expect(flagsFor({ ...BASE, diet: 'vegetarian' })).toContain('vegetarian');
  });
});

describe('supplementPlan', () => {
  it('hides vegan-only nutrients from an omnivore', () => {
    const ids = supplementPlan(BASE).map((s) => s.id);
    expect(ids).not.toContain('b12');
  });

  it('makes B12 unmissable for a vegan', () => {
    const list = supplementPlan({ ...BASE, diet: 'vegan' });
    const b12 = list.find((s) => s.id === 'b12');

    expect(b12).toBeDefined();
    expect(b12!.priority).not.toBe('situational');
    expect(b12!.reasons.join(' ')).toContain('vegan');
  });

  it('raises vitamin D in winter and not in summer', () => {
    const winter = supplementPlan({ ...BASE, month: 11 }).find((s) => s.id === 'vitamin-d')!;
    const summer = supplementPlan({ ...BASE, month: 6 }).find((s) => s.id === 'vitamin-d')!;

    expect(winter.priority).toBe('core');
    expect(summer.priority).toBe('consider');
    expect(winter.reasons.length).toBeGreaterThan(0);
    expect(summer.reasons).toEqual([]);
  });

  it('raises magnesium when sleep is short', () => {
    const mg = supplementPlan({ ...BASE, avgSleepH: 6 }).find((s) => s.id === 'magnesium')!;
    expect(mg.priority).toBe('core');
    expect(mg.reasons.join(' ')).toContain('sleep');
  });

  it('only offers creatine for the goals it suits', () => {
    expect(supplementPlan({ ...BASE, goal: 'strength' }).some((s) => s.id === 'creatine')).toBe(true);
    expect(supplementPlan({ ...BASE, goal: 'lose' }).some((s) => s.id === 'creatine')).toBe(false);
  });

  it('sorts core first, then consider, then situational', () => {
    const order = { core: 0, consider: 1, situational: 2 } as const;
    const list = supplementPlan({ ...BASE, diet: 'vegan', avgSleepH: 6, sessionsPerWeek: 5, month: 0 });

    for (let i = 1; i < list.length; i++) {
      expect(order[list[i - 1].priority]).toBeLessThanOrEqual(order[list[i].priority]);
    }
  });

  it('explains every raised entry', () => {
    const list = supplementPlan({ ...BASE, avgSleepH: 6, sessionsPerWeek: 5, month: 0 });
    for (const s of list.filter((x) => x.priority === 'core')) {
      expect(s.reasons.length, s.name).toBeGreaterThan(0);
    }
  });
});

describe('supplementSummary', () => {
  it('says the quiet part when nothing is flagged', () => {
    expect(supplementSummary(supplementPlan(BASE)).toLowerCase()).toContain('food');
  });

  it('names what needs attention when something is', () => {
    const summary = supplementSummary(supplementPlan({ ...BASE, month: 11, avgSleepH: 6 }));
    expect(summary).toContain('Vitamin D3');
    expect(summary).toContain('Magnesium');
  });
});
