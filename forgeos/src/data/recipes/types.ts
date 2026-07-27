import type { Goal } from '../../types';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Shake';

/** Filters that answer a real question ("what can I cook in 10 minutes with no meat?"). */
export type RecipeTag =
  | 'high-protein'
  | 'vegetarian'
  | 'vegan'
  | 'quick'
  | 'budget'
  | 'meal-prep'
  | 'no-cook'
  | 'low-carb'
  | 'high-carb'
  | 'one-pan'
  | 'post-workout';

export interface Recipe {
  id: string;
  name: string;
  meal: MealType;
  goals: Goal[];
  /** Per serving, metric. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Total hands-on + cooking time, minutes. */
  minutes: number;
  servings: number;
  ingredients: string[];
  /** Ordered, do-this-then-that steps — the actual tutorial. */
  steps: string[];
  tags: RecipeTag[];
  /** One coach's note: why it's here, or how not to ruin it. */
  tip?: string;
}

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Shake'];

export const RECIPE_TAGS: RecipeTag[] = [
  'high-protein',
  'quick',
  'vegetarian',
  'vegan',
  'low-carb',
  'high-carb',
  'meal-prep',
  'budget',
  'no-cook',
  'one-pan',
  'post-workout',
];
