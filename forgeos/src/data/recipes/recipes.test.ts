import { describe, it, expect } from 'vitest';
import { RECIPES, cookbookStats, filterRecipes, recipeById, recipesForGoal, scaleRecipe, shoppingListFor } from './index';
import { RECIPES_SK } from '../recipes.sk';
import type { Goal } from '../../types';

const GOALS: Goal[] = ['lose', 'maintain', 'gain', 'recomp', 'strength'];

describe('the cookbook', () => {
  it('has more than 100 recipes', () => {
    expect(RECIPES.length).toBeGreaterThan(100);
  });

  it('gives every recipe a unique id', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every recipe a real step-by-step method', () => {
    for (const r of RECIPES) {
      expect(r.steps.length, `${r.name} has no steps`).toBeGreaterThanOrEqual(2);
      expect(r.steps.every((s) => s.trim().length > 15), `${r.name} has a stub step`).toBe(true);
    }
  });

  it('gives every recipe ingredients, servings, timing and at least one tag', () => {
    for (const r of RECIPES) {
      expect(r.ingredients.length, r.name).toBeGreaterThanOrEqual(2);
      expect(r.servings, r.name).toBeGreaterThan(0);
      expect(r.minutes, r.name).toBeGreaterThan(0);
      expect(r.tags.length, r.name).toBeGreaterThan(0);
      expect(r.goals.length, r.name).toBeGreaterThan(0);
    }
  });

  it('keeps macros roughly consistent with the calorie count', () => {
    // 4/4/9 kcal per gram, allowing a generous ±25% for rounding and fibre.
    for (const r of RECIPES) {
      const fromMacros = r.protein * 4 + r.carbs * 4 + r.fat * 9;
      expect(Math.abs(fromMacros - r.kcal) / r.kcal, `${r.name} macros vs kcal`).toBeLessThan(0.25);
    }
  });

  it('covers every fitness goal in every meal slot', () => {
    for (const goal of GOALS) {
      const list = recipesForGoal(goal);
      expect(list.length, goal).toBeGreaterThan(15);
      for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const) {
        expect(list.some((r) => r.meal === meal), `${goal} has no ${meal}`).toBe(true);
      }
    }
  });

  it('never labels a vegan dish with meat or dairy in the name', () => {
    const banned = /chicken|beef|tuna|salmon|pork|turkey|prawn|jerky|cod|ham|whey|yoghurt|cheese|quark|skyr/i;
    for (const r of RECIPES.filter((x) => x.tags.includes('vegan'))) {
      expect(banned.test(r.name), `${r.name} is tagged vegan`).toBe(false);
    }
  });

  it('keeps the Slovak overlay pointed at recipes that still exist', () => {
    for (const id of Object.keys(RECIPES_SK)) expect(recipeById(id), id).toBeDefined();
  });
});

describe('filterRecipes', () => {
  it('returns everything for an empty query', () => {
    expect(filterRecipes({}).length).toBe(RECIPES.length);
  });

  it('filters by meal, goal and tag together', () => {
    const list = filterRecipes({ meal: 'Breakfast', goal: 'lose', tags: ['high-protein'] });

    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.meal === 'Breakfast' && r.goals.includes('lose') && r.tags.includes('high-protein'))).toBe(true);
  });

  it('requires ALL requested tags, not any', () => {
    const list = filterRecipes({ tags: ['vegan', 'quick'] });
    expect(list.every((r) => r.tags.includes('vegan') && r.tags.includes('quick'))).toBe(true);
  });

  it('respects a time limit', () => {
    expect(filterRecipes({ maxMinutes: 10 }).every((r) => r.minutes <= 10)).toBe(true);
  });

  it('respects a protein floor', () => {
    expect(filterRecipes({ minProtein: 30 }).every((r) => r.protein >= 30)).toBe(true);
  });

  it('searches names and ingredients', () => {
    expect(filterRecipes({ search: 'oats' }).length).toBeGreaterThan(2);
    expect(filterRecipes({ search: 'chickpea' }).some((r) => /chickpea/i.test(r.name) || r.ingredients.join(' ').includes('chickpea'))).toBe(true);
    expect(filterRecipes({ search: 'zzzzz' })).toEqual([]);
  });

  it('is case-insensitive and ignores stray spaces', () => {
    expect(filterRecipes({ search: '  QUARK ' }).length).toBe(filterRecipes({ search: 'quark' }).length);
  });

  it('can show only favourites', () => {
    const list = filterRecipes({ favouritesOnly: true, favourites: ['rec-1', 'rec-53'] });
    expect(list.map((r) => r.id).sort()).toEqual(['rec-1', 'rec-53']);
  });
});

describe('scaleRecipe', () => {
  it('doubles macros for double the servings', () => {
    const r = recipeById('rec-1')!;
    const scaled = scaleRecipe(r, r.servings * 2);

    expect(scaled.kcal).toBe(r.kcal * 2);
    expect(scaled.protein).toBe(r.protein * 2);
  });

  it('halves cleanly for a multi-serving recipe', () => {
    const r = RECIPES.find((x) => x.servings === 4)!;
    expect(scaleRecipe(r, 2).kcal).toBe(Math.round(r.kcal * 0.5));
  });

  it('falls back to the original on a nonsense serving count', () => {
    const r = recipeById('rec-1')!;
    expect(scaleRecipe(r, 0).kcal).toBe(r.kcal);
  });
});

describe('shoppingListFor', () => {
  it('merges the same ingredient across recipes and counts it', () => {
    const a = recipeById('rec-1')!; // oats, whey, berries, milk, salt
    const list = shoppingListFor([a, a]);

    expect(list.every((i) => i.count === 2)).toBe(true);
    expect(list.length).toBe(a.ingredients.length);
  });

  it('is alphabetical and case-insensitive when merging', () => {
    const list = shoppingListFor(RECIPES.slice(0, 6));
    const texts = list.map((i) => i.text);

    expect([...texts].sort((x, y) => x.localeCompare(y))).toEqual(texts);
    expect(new Set(texts.map((t) => t.toLowerCase())).size).toBe(texts.length);
  });

  it('is empty for no recipes', () => {
    expect(shoppingListFor([])).toEqual([]);
  });
});

describe('cookbookStats', () => {
  it('counts the buckets the browse header shows', () => {
    const s = cookbookStats();

    expect(s.total).toBe(RECIPES.length);
    expect(s.quick).toBeGreaterThan(10);
    expect(s.highProtein).toBeGreaterThan(40);
    expect(s.vegetarian).toBeGreaterThan(10);
  });
});
