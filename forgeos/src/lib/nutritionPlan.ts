import type { Diet, Goal } from '../types';
import { filterRecipes, scaleRecipe, type MealType, type Recipe, type RecipeTag } from '../data/recipes';

// ---- Goal-driven nutrition plan ----
// Every fitness goal gets its own calorie offset, protein target and meal split,
// and then the cookbook is asked to fill that day with real dishes. All pure so
// the numbers can be tested instead of trusted.

export interface PlanInput {
  goal: Goal;
  weightKg: number;
  /** Maintenance calories (Mifflin-St Jeor via lib/fitness). */
  tdee: number;
  trainingDay: boolean;
  diet?: Diet;
}

export interface MealTarget {
  slot: MealType;
  kcal: number;
  proteinG: number;
  /** Share of the day's calories, 0–1. */
  share: number;
}

export interface NutritionPlan {
  goal: Goal;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPerKg: number;
  /** Calorie offset from maintenance, as a percentage (−18 … +12). */
  deltaPct: number;
  meals: MealTarget[];
  hydrationMl: number;
  timing: string[];
  headline: string;
}

interface GoalRule {
  /** Calorie offset on a training day / a rest day, as a fraction of TDEE. */
  trainingDelta: number;
  restDelta: number;
  proteinPerKg: number;
  fatPerKg: number;
  headline: string;
}

// Offsets stay deliberately moderate: this app is used by a teenager who trains,
// so nothing here prescribes an aggressive cut.
const RULES: Record<Goal, GoalRule> = {
  lose: {
    trainingDelta: -0.15,
    restDelta: -0.2,
    proteinPerKg: 2.2,
    fatPerKg: 0.8,
    headline: 'A moderate deficit with protein held high, so what you lose is fat and not the muscle you built.',
  },
  maintain: {
    trainingDelta: 0.02,
    restDelta: -0.02,
    proteinPerKg: 1.8,
    fatPerKg: 0.9,
    headline: 'Eat at maintenance, keep protein steady, and let training do the changing.',
  },
  gain: {
    trainingDelta: 0.15,
    restDelta: 0.08,
    proteinPerKg: 1.9,
    fatPerKg: 0.9,
    headline: 'A controlled surplus — enough to build, small enough that most of it is muscle.',
  },
  recomp: {
    trainingDelta: 0.08,
    restDelta: -0.12,
    proteinPerKg: 2.2,
    fatPerKg: 0.8,
    headline: 'Calories follow your training: carbs up on session days, down on rest days, protein never moves.',
  },
  strength: {
    trainingDelta: 0.08,
    restDelta: 0.0,
    proteinPerKg: 2.0,
    fatPerKg: 0.9,
    headline: 'Fuel the session first: carbs around training, protein at every meal, no deficit while chasing PRs.',
  },
};

/** Breakfast / Lunch / Dinner / Snack — the split most people actually eat. */
const SPLIT: { slot: MealType; share: number }[] = [
  { slot: 'Breakfast', share: 0.25 },
  { slot: 'Lunch', share: 0.3 },
  { slot: 'Dinner', share: 0.3 },
  { slot: 'Snack', share: 0.15 },
];

const round5 = (n: number) => Math.round(n / 5) * 5;

export function buildNutritionPlan(input: PlanInput): NutritionPlan {
  const rule = RULES[input.goal];
  const weight = Math.max(30, input.weightKg);
  const tdee = Math.max(1200, input.tdee);
  const delta = input.trainingDay ? rule.trainingDelta : rule.restDelta;
  const kcal = round5(tdee * (1 + delta));

  const proteinG = Math.round(weight * rule.proteinPerKg);
  const fatG = Math.round(weight * rule.fatPerKg);
  // Carbs take whatever calories are left — never negative, even for an
  // implausibly low TDEE with a high protein target.
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  // Protein spreads evenly across meals (better for muscle protein synthesis
  // than one big hit), while calories follow the split.
  const perMealProtein = Math.round(proteinG / SPLIT.length);

  return {
    goal: input.goal,
    kcal,
    proteinG,
    carbsG,
    fatG,
    proteinPerKg: rule.proteinPerKg,
    deltaPct: Math.round(delta * 100),
    meals: SPLIT.map((s) => ({
      slot: s.slot,
      share: s.share,
      kcal: round5(kcal * s.share),
      proteinG: perMealProtein,
    })),
    hydrationMl: Math.round((weight * 35 + (input.trainingDay ? 500 : 0)) / 100) * 100,
    timing: timingFor(input),
    headline: rule.headline,
  };
}

function timingFor(input: PlanInput): string[] {
  const tips: string[] = [
    `Protein at every meal — roughly ${Math.round((input.weightKg * RULES[input.goal].proteinPerKg) / SPLIT.length)} g a time, four times a day.`,
  ];
  if (input.trainingDay) {
    tips.push('Carbs 1–2 h before training: something you digest easily, not a fat-heavy meal.');
    tips.push('Eat within about 2 h of finishing — protein plus carbs. The "30-minute window" is a myth, the same day is not.');
  } else {
    tips.push('Rest day: same protein, fewer carbs. Appetite is usually lower anyway.');
  }
  tips.push('Slow protein before bed (quark, casein, cottage cheese) supports overnight recovery.');
  if (input.goal === 'lose') tips.push('Front-load volume: vegetables and lean protein first, so the deficit does not feel like one.');
  if (input.goal === 'gain') tips.push('If you cannot eat the surplus, drink part of it — a shake is easier than another plate.');
  return tips;
}

// ---- Filling the day with real food ----

export interface SuggestedMeal {
  slot: MealType;
  target: MealTarget;
  recipe: Recipe | null;
  /** Servings of that recipe, in half-serving steps — a real plan portions food. */
  portions: number;
  /** The recipe's macros at that portion size. */
  macros: { kcal: number; protein: number; carbs: number; fat: number };
}

export interface SuggestedDay {
  meals: SuggestedMeal[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  /** How far the picked day lands from the calorie target, as a percentage. */
  kcalOffPct: number;
}

const DIET_TAG: Record<Diet, RecipeTag | null> = {
  omnivore: null,
  vegetarian: 'vegetarian',
  vegan: 'vegan',
};

/** Half-serving steps, and never a portion nobody would plate (0.5×–3×). */
function portionsFor(recipe: Recipe, targetKcal: number): number {
  const perServing = recipe.kcal / Math.max(1, recipe.servings);
  const raw = targetKcal / Math.max(1, perServing);
  return Math.min(3, Math.max(0.5, Math.round(raw * 2) / 2));
}

/**
 * Pick one dish per meal slot and the portion size that hits that slot's
 * calorie target, preferring dishes whose protein density fits the target.
 * `variant` shifts which of the good candidates is taken, so "suggest another
 * day" produces a genuinely different menu.
 */
export function suggestDay(plan: NutritionPlan, opts: { diet?: Diet; variant?: number } = {}): SuggestedDay {
  const variant = Math.max(0, Math.floor(opts.variant ?? 0));
  const dietTag = DIET_TAG[opts.diet ?? 'omnivore'];
  const used = new Set<string>();
  const meals: SuggestedMeal[] = [];

  for (const target of plan.meals) {
    // A vegetarian filter must also accept vegan dishes — vegan is stricter.
    const pool = filterRecipes({
      meal: target.slot,
      goal: plan.goal,
      tags: dietTag === 'vegetarian' ? [] : dietTag ? [dietTag] : [],
    }).filter((r) => {
      if (used.has(r.id)) return false;
      if (dietTag === 'vegetarian') return r.tags.includes('vegetarian') || r.tags.includes('vegan');
      return true;
    });

    const ranked = [...pool].sort((a, b) => score(a, target) - score(b, target));
    const pick = ranked.length ? ranked[variant % ranked.length] : null;
    if (pick) used.add(pick.id);
    const portions = pick ? portionsFor(pick, target.kcal) : 0;
    meals.push({
      slot: target.slot,
      target,
      recipe: pick,
      portions,
      macros: pick
        ? scaleRecipe(pick, pick.servings * portions)
        : { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    });
  }

  const totals = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.macros.kcal,
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    meals,
    totals,
    kcalOffPct: plan.kcal > 0 ? Math.round(((totals.kcal - plan.kcal) / plan.kcal) * 100) : 0,
  };
}

/**
 * Lower is better. Because portions absorb the calorie gap, what actually
 * matters is protein density: size this dish to the slot's calories and see how
 * far its protein lands from the target. A small penalty keeps portions near 1×
 * so the plan stays plausible to cook.
 */
function score(r: Recipe, target: MealTarget): number {
  const portions = portionsFor(r, target.kcal);
  const scaled = scaleRecipe(r, r.servings * portions);
  const proteinMiss = Math.abs(scaled.protein - target.proteinG) / Math.max(1, target.proteinG);
  const kcalMiss = Math.abs(scaled.kcal - target.kcal) / Math.max(1, target.kcal);
  const awkwardPortion = Math.abs(portions - 1) * 0.15;
  return proteinMiss * 1.5 + kcalMiss + awkwardPortion;
}
