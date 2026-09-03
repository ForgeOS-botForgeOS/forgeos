import { FOOD_TABLE, type Per100g } from '../data/foodTable';
import type { FoodItem, ScanResult } from '../types';

// Telling the app what the food IS.
//
// A photo alone is the hardest possible way to count a home-cooked meal: the
// model has to guess the food *and* the portion, and it cannot see the oil in
// the pan. One sentence — "200g chicken breast, 150g rice and a banana" —
// removes the identification guess entirely, so this module does two jobs:
//
//   1) it is sent along with the photo as a hint for the vision model, and
//   2) on its own it resolves to real macros here on the device, with no AI in
//      the loop at all — which is why the feature works offline, instantly, and
//      keeps working when the Worker is down.
//
// Everything is an editable estimate afterwards, exactly like a photo scan.

/** Grams assumed for one piece of the foods people count in pieces, not grams. */
const PIECE_G: Readonly<Record<string, number>> = {
  egg: 50, eggs: 50, 'boiled egg': 50, 'fried egg': 50,
  banana: 118, apple: 182, orange: 131, pear: 178, peach: 150, kiwi: 75, plum: 66,
  slice: 30, toast: 30, bread: 30, tortilla: 45, wrap: 45, bagel: 95, croissant: 57,
  potato: 173, 'sweet potato': 130, carrot: 61, tomato: 123, avocado: 150, pepper: 119,
  'rice cake': 9, biscuit: 15, cookie: 16, date: 8, dates: 8, 'protein bar': 60,
};

/** With nothing to go on, this is the portion we assume — same as the Worker. */
const DEFAULT_PORTION_G = 150;
const MIN_G = 1;
const MAX_G = 5000;
/** More than this and it stops being one meal; the rest is almost certainly noise. */
const MAX_ITEMS = 12;

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_TIMEOUT_MS = 4500;

/** Words that carry no food meaning and only get in the way of a table match. */
const FILLER = /^(a|an|the|some|of|with|and|plus|about|approx|approximately|around|my|homemade|home|made|large|small|medium|big|portion|serving|servings)$/;

export interface DescribedItem {
  /** The food as the user wrote it, cleaned up — this is what gets looked up. */
  name: string;
  grams: number;
  /** False when we assumed the portion instead of reading it from the text. */
  gramsKnown: boolean;
}

export type MacroSource = 'table' | 'off' | 'estimate';

/** Split a free-text meal into food-sized pieces with a weight for each. */
export function parseFoodDescription(text: string): DescribedItem[] {
  return String(text ?? '')
    // A comma separates foods here, so a decimal comma ("0,5 l" — how it is
    // written in Slovakia) has to become a dot before the split, or half a
    // litre of juice would be read as two foods.
    .replace(/(\d),(\d)/g, '$1.$2')
    .split(/[,;\n/]|\band\b|\bwith\b|\+|&/i)
    .map(parsePart)
    .filter((it): it is DescribedItem => it !== null)
    .slice(0, MAX_ITEMS);
}

function parsePart(raw: string): DescribedItem | null {
  const part = raw.trim().toLowerCase();
  if (!part) return null;

  // "200g", "1.5 kg", "330 ml", "2dl" — a real weight beats every other guess.
  // ml is treated as grams: for the foods people describe (milk, juice, soup)
  // the density is close enough to 1 that the error is smaller than the recipe.
  const weight = part.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram(?:s)?|ml|l|dl|cl)\b/);
  // A leading count — "2 eggs", "3x toast", "1 banana".
  const count = part.match(/^(?:x\s*)?(\d+(?:[.,]\d+)?)\s*(?:x|pcs?|pieces?)?\s+/);

  const name = cleanName(part.replace(weight?.[0] ?? '', ' ').replace(count?.[0] ?? '', ' '));
  if (!name) return null;

  if (weight) {
    const grams = toGrams(num(weight[1]), weight[2]);
    if (grams !== null) return { name, grams: clampG(grams), gramsKnown: true };
  }

  const piece = pieceGrams(name);
  if (count && piece) return { name, grams: clampG(num(count[1]) * piece), gramsKnown: true };
  // "2 chicken breasts" — a count of something we have no piece weight for is
  // still information: multiply the default rather than throwing it away.
  if (count) return { name, grams: clampG(num(count[1]) * DEFAULT_PORTION_G), gramsKnown: false };
  if (piece) return { name, grams: clampG(piece), gramsKnown: false };
  return { name, grams: DEFAULT_PORTION_G, gramsKnown: false };
}

function num(s: string): number {
  return Number(s.replace(',', '.')) || 0;
}

function toGrams(value: number, unit: string): number | null {
  if (value <= 0) return null;
  switch (unit) {
    case 'kg': case 'l': return value * 1000;
    case 'dl': return value * 100;
    case 'cl': return value * 10;
    default: return value; // g / gram / grams / ml
  }
}

function clampG(g: number): number {
  return Math.min(MAX_G, Math.max(MIN_G, Math.round(g)));
}

function cleanName(s: string): string {
  return s
    .replace(/[()[\]{}."]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.test(w))
    .join(' ')
    .trim();
}

/** Piece weight for a food counted in pieces — plural and "slice of X" included. */
function pieceGrams(name: string): number | null {
  const singular = name.replace(/e?s$/, '');
  for (const key of [name, singular]) {
    if (PIECE_G[key] !== undefined) return PIECE_G[key];
  }
  // "slice of bread", "2 slices toast" — the last word is usually the food.
  const words = name.split(' ');
  const last = words[words.length - 1];
  return PIECE_G[last] ?? PIECE_G[last.replace(/e?s$/, '')] ?? null;
}

/**
 * Longest matching entry in the curated table, or null.
 *
 * Longest wins so "chicken breast" never resolves through the shorter, less
 * accurate "chicken" — the same rule the Worker applies to the AI's item names.
 */
export function matchFoodTable(name: string): string | null {
  const n = name.toLowerCase();
  let best: string | null = null;
  for (const key of Object.keys(FOOD_TABLE)) {
    if (n.includes(key) && (!best || key.length > best.length)) best = key;
  }
  return best;
}

/** Scale per-100g macros to a portion. */
export function scaleMacros([kcal, p, c, f, s]: Per100g, grams: number): Omit<FoodItem, 'name'> {
  const k = grams / 100;
  return {
    calories: Math.round(kcal * k),
    proteinG: Math.round(p * k),
    carbsG: Math.round(c * k),
    fatG: Math.round(f * k),
    sugarG: Math.round(s * k),
  };
}

/**
 * Last resort when a food is in neither the table nor Open Food Facts: a plain
 * mixed-meal density (1.5 kcal/g). It is openly a guess, flagged as one, and
 * still better than dropping the food out of the meal.
 */
export function estimateMacros(grams: number): Omit<FoodItem, 'name'> {
  return {
    calories: Math.round(grams * 1.5),
    proteinG: Math.round(grams * 0.08),
    carbsG: Math.round(grams * 0.15),
    fatG: Math.round(grams * 0.05),
    sugarG: 0,
  };
}

/** Per-100g macros for a food name from Open Food Facts search, or null. */
async function offSearch(name: string): Promise<Per100g | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OFF_TIMEOUT_MS);
  try {
    const url = `${OFF_SEARCH}?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    for (const p of data?.products ?? []) {
      const nut = p?.nutriments ?? {};
      const kcal = Number(nut['energy-kcal_100g']);
      // A record with no energy, or an impossible one, is worse than no record.
      if (kcal > 0 && kcal < 1000) {
        return [kcal, Number(nut.proteins_100g) || 0, Number(nut.carbohydrates_100g) || 0, Number(nut.fat_100g) || 0, Number(nut.sugars_100g) || 0];
      }
    }
    return null;
  } catch {
    // Offline, blocked, timed out — the table already answered whatever it could.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface ResolvedFood {
  item: FoodItem;
  source: MacroSource;
}

/** Resolve one described food to macros: curated table → Open Food Facts → estimate. */
export async function resolveItem(it: DescribedItem, allowNetwork = true): Promise<ResolvedFood> {
  const label = `${it.name} (${it.grams}g)`;
  const key = matchFoodTable(it.name);
  if (key) return { item: { name: label, ...scaleMacros(FOOD_TABLE[key], it.grams) }, source: 'table' };

  if (allowNetwork) {
    const off = await offSearch(it.name);
    if (off) return { item: { name: label, ...scaleMacros(off, it.grams) }, source: 'off' };
  }
  return { item: { name: label, ...estimateMacros(it.grams) }, source: 'estimate' };
}

/**
 * A typed description → the same editable `ScanResult` a photo produces, so the
 * review-and-confirm step downstream is identical either way.
 *
 * `null` means the text held no food we could make sense of — the caller says
 * so rather than logging an invented meal.
 */
export async function scanDescription(text: string): Promise<ScanResult | null> {
  const parsed = parseFoodDescription(text);
  if (!parsed.length) return null;

  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const resolved = await Promise.all(parsed.map((it) => resolveItem(it, online)));
  const items = resolved.map((r) => r.item);
  const totals = items.reduce(
    (a, b) => ({
      calories: a.calories + b.calories,
      proteinG: a.proteinG + b.proteinG,
      carbsG: a.carbsG + b.carbsG,
      fatG: a.fatG + b.fatG,
      sugarG: a.sugarG + b.sugarG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 },
  );
  const matched = resolved.filter((r) => r.source !== 'estimate').length;
  const guessedPortions = parsed.filter((p) => !p.gramsKnown).length;

  return {
    name: parsed.map((p) => p.name).join(', '),
    ...totals,
    items,
    // Confidence is about the *numbers*, so it counts what we actually resolved.
    confidence: Math.max(0.3, Math.min(0.95, matched / resolved.length)),
    tip: describeTip(matched, resolved.length, guessedPortions),
  };
}

function describeTip(matched: number, total: number, guessedPortions: number): string {
  const parts = [`${matched}/${total} matched a nutrition database.`];
  if (guessedPortions > 0) {
    parts.push(
      guessedPortions === total
        ? 'No weights given, so portions are assumed — add grams (e.g. "200g rice") for real numbers.'
        : `${guessedPortions} portion(s) assumed — add grams for those.`,
    );
  }
  return parts.join(' ');
}
