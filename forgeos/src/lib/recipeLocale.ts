import type { Recipe } from '../data/recipes';
import { RECIPES_SK, MEAL_TYPE_SK } from '../data/recipes.sk';

/**
 * Slovak overlay for a recipe, where one exists. Names and ingredient lines are
 * the parts that matter most in your own language — that is what you read in a
 * shop — so those are translated for the classics; a dish without an overlay
 * keeps its English text rather than showing half a translation.
 */
export function localiseRecipe(r: Recipe, lang: string): Recipe {
  const sk = RECIPES_SK[r.id];
  if (lang !== 'sk' || !sk) return r;
  return { ...r, name: sk.name, ingredients: sk.ingredients, steps: sk.steps ?? r.steps };
}

export function localiseMeal(meal: string, lang: string): string {
  return lang === 'sk' ? MEAL_TYPE_SK[meal] ?? meal : meal;
}
