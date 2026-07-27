import { describe, it, expect } from 'vitest';
import { buildNutritionPlan, suggestDay, type PlanInput } from './nutritionPlan';
import type { Goal } from '../types';

const GOALS: Goal[] = ['lose', 'maintain', 'gain', 'recomp', 'strength'];
const BASE: PlanInput = { goal: 'recomp', weightKg: 75, tdee: 2600, trainingDay: true };

describe('buildNutritionPlan', () => {
  it('cuts for fat loss and adds for gaining', () => {
    expect(buildNutritionPlan({ ...BASE, goal: 'lose' }).kcal).toBeLessThan(BASE.tdee);
    expect(buildNutritionPlan({ ...BASE, goal: 'gain' }).kcal).toBeGreaterThan(BASE.tdee);
  });

  it('keeps maintenance within a few percent of TDEE', () => {
    const p = buildNutritionPlan({ ...BASE, goal: 'maintain' });
    expect(Math.abs(p.kcal - BASE.tdee) / BASE.tdee).toBeLessThan(0.05);
  });

  it('cycles calories for recomp: training day above the rest day', () => {
    const train = buildNutritionPlan({ ...BASE, goal: 'recomp', trainingDay: true });
    const rest = buildNutritionPlan({ ...BASE, goal: 'recomp', trainingDay: false });

    expect(train.kcal).toBeGreaterThan(rest.kcal);
    expect(train.proteinG).toBe(rest.proteinG); // protein never moves
  });

  it('never prescribes an aggressive deficit', () => {
    for (const trainingDay of [true, false]) {
      const p = buildNutritionPlan({ ...BASE, goal: 'lose', trainingDay });
      expect(p.deltaPct).toBeGreaterThanOrEqual(-25);
    }
  });

  it('scales protein with body weight, per goal', () => {
    const light = buildNutritionPlan({ ...BASE, weightKg: 60 });
    const heavy = buildNutritionPlan({ ...BASE, weightKg: 90 });

    expect(heavy.proteinG).toBeGreaterThan(light.proteinG);
    expect(light.proteinG).toBe(Math.round(60 * light.proteinPerKg));
  });

  it('makes the macros add up to the calorie target', () => {
    for (const goal of GOALS) {
      const p = buildNutritionPlan({ ...BASE, goal });
      const fromMacros = p.proteinG * 4 + p.carbsG * 4 + p.fatG * 9;
      expect(Math.abs(fromMacros - p.kcal), goal).toBeLessThan(30); // rounding only
    }
  });

  it('never returns negative carbs, even on a low TDEE with high protein', () => {
    const p = buildNutritionPlan({ goal: 'lose', weightKg: 95, tdee: 1200, trainingDay: false });
    expect(p.carbsG).toBeGreaterThanOrEqual(0);
  });

  it('splits the day into four meals that sum to the target', () => {
    const p = buildNutritionPlan(BASE);
    const sum = p.meals.reduce((a, m) => a + m.kcal, 0);

    expect(p.meals.map((m) => m.slot)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    expect(Math.abs(sum - p.kcal) / p.kcal).toBeLessThan(0.03);
  });

  it('spreads protein evenly across the meals', () => {
    const p = buildNutritionPlan(BASE);
    const perMeal = p.meals.map((m) => m.proteinG);

    expect(new Set(perMeal).size).toBe(1);
    expect(perMeal[0] * 4).toBeCloseTo(p.proteinG, -1);
  });

  it('asks for more water on training days', () => {
    const train = buildNutritionPlan({ ...BASE, trainingDay: true });
    const rest = buildNutritionPlan({ ...BASE, trainingDay: false });

    expect(train.hydrationMl).toBeGreaterThan(rest.hydrationMl);
    expect(rest.hydrationMl).toBeGreaterThan(1500);
  });

  it('gives every goal a headline and real timing guidance', () => {
    for (const goal of GOALS) {
      const p = buildNutritionPlan({ ...BASE, goal });
      expect(p.headline.length, goal).toBeGreaterThan(30);
      expect(p.timing.length, goal).toBeGreaterThanOrEqual(3);
    }
  });

  it('survives nonsense input without producing nonsense', () => {
    const p = buildNutritionPlan({ goal: 'gain', weightKg: 0, tdee: 0, trainingDay: true });
    expect(p.kcal).toBeGreaterThan(1000);
    expect(p.proteinG).toBeGreaterThan(0);
  });
});

describe('suggestDay', () => {
  const plan = buildNutritionPlan(BASE);

  it('fills every meal slot with a dish that suits the goal', () => {
    const day = suggestDay(plan);

    expect(day.meals).toHaveLength(4);
    for (const m of day.meals) {
      expect(m.recipe, m.slot).not.toBeNull();
      expect(m.recipe!.meal).toBe(m.slot);
      expect(m.recipe!.goals).toContain(plan.goal);
    }
  });

  it('never repeats a dish inside one day', () => {
    const ids = suggestDay(plan).meals.map((m) => m.recipe?.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('portions each dish to its slot and lands close to the day\'s target', () => {
    const day = suggestDay(plan);

    for (const m of day.meals) {
      expect(m.portions, m.slot).toBeGreaterThanOrEqual(0.5);
      expect(m.portions, m.slot).toBeLessThanOrEqual(3);
      expect(m.portions * 2 % 1, 'half-serving steps only').toBe(0);
    }
    expect(Math.abs(day.kcalOffPct)).toBeLessThan(15);
  });

  it('gets protein within reach of the target', () => {
    const day = suggestDay(plan);
    expect(day.totals.protein).toBeGreaterThan(plan.proteinG * 0.8);
  });

  it('reports scaled macros, not per-serving ones', () => {
    const day = suggestDay(plan);
    const doubled = day.meals.find((m) => m.portions >= 2 && m.recipe);
    if (doubled) expect(doubled.macros.kcal).toBeGreaterThan(doubled.recipe!.kcal);
  });

  it('returns a different menu for a different variant', () => {
    const a = suggestDay(plan, { variant: 0 }).meals.map((m) => m.recipe?.id).join();
    const b = suggestDay(plan, { variant: 1 }).meals.map((m) => m.recipe?.id).join();

    expect(a).not.toBe(b);
  });

  it('is deterministic for the same variant', () => {
    const a = suggestDay(plan, { variant: 2 }).meals.map((m) => m.recipe?.id).join();
    const b = suggestDay(plan, { variant: 2 }).meals.map((m) => m.recipe?.id).join();

    expect(a).toBe(b);
  });

  it('respects a vegan diet in every slot', () => {
    const day = suggestDay(plan, { diet: 'vegan' });
    for (const m of day.meals) {
      if (m.recipe) expect(m.recipe.tags, `${m.slot}: ${m.recipe.name}`).toContain('vegan');
    }
  });

  it('accepts vegan dishes for a vegetarian, not the other way round', () => {
    const day = suggestDay(plan, { diet: 'vegetarian' });
    for (const m of day.meals) {
      if (m.recipe) {
        const ok = m.recipe.tags.includes('vegetarian') || m.recipe.tags.includes('vegan');
        expect(ok, `${m.slot}: ${m.recipe.name}`).toBe(true);
      }
    }
  });

  it('works for every goal', () => {
    for (const goal of GOALS) {
      const day = suggestDay(buildNutritionPlan({ ...BASE, goal }));
      expect(day.meals.filter((m) => m.recipe).length, goal).toBe(4);
    }
  });
});
