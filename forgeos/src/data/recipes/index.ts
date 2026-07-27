import { CORE_RECIPES } from './core';
import { EXTRA_MEALS } from './extra-meals';
import { EXTRA_FUEL } from './extra-fuel';
import type { Goal } from '../../types';
import type { MealType, Recipe, RecipeTag } from './types';

export * from './types';

/** The whole cookbook — 100+ dishes, every one with a real method. */
export const RECIPES: Recipe[] = [...CORE_RECIPES, ...EXTRA_MEALS, ...EXTRA_FUEL];

export const recipeById = (id: string): Recipe | undefined => RECIPES.find((r) => r.id === id);

export function recipesForGoal(goal: Goal): Recipe[] {
  return RECIPES.filter((r) => r.goals.includes(goal));
}

export interface RecipeQuery {
  search?: string;
  meal?: MealType | 'All';
  goal?: Goal | null; // null/undefined = every goal
  tags?: RecipeTag[]; // must match ALL given tags
  maxMinutes?: number;
  minProtein?: number;
  favouritesOnly?: boolean;
  favourites?: string[];
}

/**
 * One filter for the whole cookbook. Kept pure (and unit-tested) because a
 * browse screen with six controls is exactly where "why is this dish missing?"
 * bugs live.
 */
export function filterRecipes(query: RecipeQuery, list: Recipe[] = RECIPES): Recipe[] {
  const needle = query.search?.trim().toLowerCase() ?? '';
  const favs = new Set(query.favourites ?? []);
  return list.filter((r) => {
    if (query.meal && query.meal !== 'All' && r.meal !== query.meal) return false;
    if (query.goal && !r.goals.includes(query.goal)) return false;
    if (query.tags?.length && !query.tags.every((t) => r.tags.includes(t))) return false;
    if (query.maxMinutes != null && r.minutes > query.maxMinutes) return false;
    if (query.minProtein != null && r.protein < query.minProtein) return false;
    if (query.favouritesOnly && !favs.has(r.id)) return false;
    if (needle) {
      const haystack = `${r.name} ${r.meal} ${r.ingredients.join(' ')} ${r.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Macros for a different number of servings than the recipe was written for. */
export function scaleRecipe(r: Recipe, servings: number): { kcal: number; protein: number; carbs: number; fat: number } {
  const factor = servings > 0 && r.servings > 0 ? servings / r.servings : 1;
  return {
    kcal: Math.round(r.kcal * factor),
    protein: Math.round(r.protein * factor),
    carbs: Math.round(r.carbs * factor),
    fat: Math.round(r.fat * factor),
  };
}

/**
 * A shopping list from any set of recipes: same ingredient named the same way
 * collapses into one line with a count, so "chicken breast ×3" is one thing to
 * buy instead of three lines to miss.
 */
export function shoppingListFor(recipes: Recipe[]): { text: string; count: number }[] {
  const tally = new Map<string, { text: string; count: number }>();
  for (const r of recipes) {
    for (const raw of r.ingredients) {
      const key = raw.trim().toLowerCase();
      const cur = tally.get(key);
      if (cur) cur.count += 1;
      else tally.set(key, { text: raw.trim(), count: 1 });
    }
  }
  return [...tally.values()].sort((a, b) => a.text.localeCompare(b.text));
}

/** Cookbook stats for the browse header. */
export function cookbookStats(list: Recipe[] = RECIPES) {
  return {
    total: list.length,
    quick: list.filter((r) => r.minutes <= 10).length,
    highProtein: list.filter((r) => r.tags.includes('high-protein')).length,
    vegetarian: list.filter((r) => r.tags.includes('vegetarian') || r.tags.includes('vegan')).length,
  };
}
