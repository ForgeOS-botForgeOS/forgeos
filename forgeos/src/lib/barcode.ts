import type { FoodItem } from '../types';
import { cachedProduct, rememberProduct } from './barcodeCache';

// Real, exact macros via barcode — no AI guessing. Uses Open Food Facts (free,
// no key, CORS-enabled). Returns per-100g values so the UI can scale by grams.
//
// Every failure is named. "Not in the database", "no nutrition data on the
// record" and "your phone has no connection" need three different sentences
// from the UI, and a scanner that says "product not found" while the wifi is
// off is lying to the user.

export interface BarcodeProduct {
  code: string;
  name: string;
  brand?: string;
  /** Unrounded: rounding once at portion time keeps small portions accurate. */
  per100g: { calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number };
  servingG?: number; // suggested portion if the product declares one
}

/** Why a lookup produced no loggable product. */
export type LookupFailure =
  | 'invalid' // not a plausible barcode at all
  | 'not-found' // Open Food Facts has no such product
  | 'no-nutrition' // the record exists but carries no usable nutrition data
  | 'offline' // the phone could not reach the network
  | 'error'; // the server answered with something unusable

export type LookupResult =
  | { ok: true; product: BarcodeProduct; fromCache?: boolean }
  | { ok: false; reason: LookupFailure; name?: string };

const OFF = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'product_name,product_name_en,generic_name,brands,nutriments,serving_quantity';
const LOOKUP_TIMEOUT_MS = 10000;

const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && isFinite(+v) ? +v : 0);

/** GTIN-8/12/13/14 check digit. A misread barcode almost always fails this. */
export function gtinCheckDigitOk(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  if (![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop() as number;
  // Weights alternate 3,1 leftwards from the digit next to the check digit.
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += digits[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Expand a compressed 8-digit UPC-E into its 12-digit UPC-A form.
 *
 * UPC-E is not a short EAN-8 — it is a UPC-A with runs of zeros squeezed out,
 * and its check digit belongs to the *expanded* number. Validating it as an
 * EAN-8 rejects a perfectly good scan, so expand first and check that.
 */
export function expandUpcE(code: string): string | null {
  if (!/^\d{8}$/.test(code)) return null;
  const [system, ...rest] = code.split('');
  if (system !== '0' && system !== '1') return null;
  const check = rest.pop() as string;
  const d = rest.join(''); // 6 payload digits
  const last = d[5];
  let middle: string;
  if (last === '0' || last === '1' || last === '2') {
    middle = `${d.slice(0, 2)}${last}0000${d.slice(2, 5)}`;
  } else if (last === '3') {
    middle = `${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  } else if (last === '4') {
    middle = `${d.slice(0, 4)}00000${d[4]}`;
  } else {
    middle = `${d.slice(0, 5)}0000${last}`;
  }
  const expanded = `${system}${middle}${check}`;
  return expanded.length === 12 ? expanded : null;
}

/**
 * The one form of a code we look up and cache under.
 *
 * The same tin of beans arrives spelled differently depending on who read it:
 * the browser's native detector reports a UPC-A as 12 digits, the WASM decoder
 * reports it as a zero-padded EAN-13, and Open Food Facts answers with 13. A
 * leading zero never changes a GTIN check digit (the weights are counted from
 * the right), so padding to 13 is safe and gives one cache key per product.
 */
export function canonicalCode(raw: string): string {
  const clean = (raw ?? '').replace(/\D/g, '');
  // UPC-E first: its check digit only adds up once expanded.
  if (clean.length === 8 && !gtinCheckDigitOk(clean)) {
    const expanded = expandUpcE(clean);
    if (expanded && gtinCheckDigitOk(expanded)) return `0${expanded}`;
  }
  return clean.length === 12 ? `0${clean}` : clean;
}

/** Worth sending to the server: right length, and the check digit adds up. */
export function isPlausibleBarcode(raw: string): boolean {
  return gtinCheckDigitOk(canonicalCode(raw));
}

/** Pick per-100g nutrition out of an Open Food Facts `nutriments` blob. */
function readNutriments(nut: Record<string, unknown>, servingG: number | undefined) {
  const per100 = (base: string) => n(nut[`${base}_100g`]);
  const perServing = (base: string) => n(nut[`${base}_serving`]);
  // Some records only carry per-serving values; with a serving size we can
  // still get to per-100g, which is what everything downstream expects.
  const scale = servingG && servingG > 0 ? 100 / servingG : 0;
  const pick = (base: string) => per100(base) || (scale ? perServing(base) * scale : 0);

  let calories = pick('energy-kcal');
  if (!calories) {
    // Fall back to the kJ figure. `energy` is kJ unless the record says otherwise.
    const energy = pick('energy');
    calories = String(nut['energy_unit'] ?? '').toLowerCase() === 'kcal' ? energy : energy / 4.184;
  }
  return {
    calories,
    proteinG: pick('proteins'),
    carbsG: pick('carbohydrates'),
    fatG: pick('fat'),
    sugarG: pick('sugars'),
  };
}

export async function lookupBarcode(raw: string): Promise<LookupResult> {
  const code = canonicalCode(raw);
  if (!gtinCheckDigitOk(code)) return { ok: false, reason: 'invalid' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`${OFF}/${code}?fields=${FIELDS}`, { signal: ctrl.signal });
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return offlineFallback(code, 'error');
    const data = await res.json().catch(() => null);
    if (!data || data.status !== 1 || !data.product) return { ok: false, reason: 'not-found' };

    const p = data.product;
    const name: string = p.product_name || p.product_name_en || p.generic_name || '';
    const servingG = n(p.serving_quantity) || undefined;
    const per100g = readNutriments(p.nutriments ?? {}, servingG);

    // A record with no numbers on it is the single most common way a scan
    // "works" and still logs nonsense — Open Food Facts is crowd-sourced, and
    // plenty of products are just a name and a photo. Logging that as a 0 kcal
    // food is worse than admitting there is nothing to log.
    const hasNutrition = per100g.calories > 0 || per100g.proteinG > 0 || per100g.carbsG > 0 || per100g.fatG > 0;
    if (!hasNutrition) return { ok: false, reason: 'no-nutrition', name: name || undefined };

    const product: BarcodeProduct = {
      code,
      name: name || 'Unknown product',
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      per100g,
      servingG,
    };
    rememberProduct(product);
    return { ok: true, product };
  } catch {
    // Abort, DNS failure, captive portal, airplane mode — all indistinguishable
    // from here, and all mean "we could not ask".
    return offlineFallback(code, navigator.onLine === false ? 'offline' : 'error');
  } finally {
    clearTimeout(timer);
  }
}

/** A product scanned before still works with no network — that is the point of the cache. */
function offlineFallback(code: string, reason: LookupFailure): LookupResult {
  const hit = cachedProduct(code);
  return hit ? { ok: true, product: hit, fromCache: true } : { ok: false, reason };
}

/** Scale a product to a portion in grams → a loggable FoodItem with exact macros. */
export function portionToItem(p: BarcodeProduct, grams: number): FoodItem {
  const k = grams / 100;
  const name = p.brand ? `${p.name} (${p.brand})` : p.name;
  return {
    name,
    calories: Math.round(p.per100g.calories * k),
    proteinG: Math.round(p.per100g.proteinG * k),
    carbsG: Math.round(p.per100g.carbsG * k),
    fatG: Math.round(p.per100g.fatG * k),
    sugarG: Math.round(p.per100g.sugarG * k),
  };
}
