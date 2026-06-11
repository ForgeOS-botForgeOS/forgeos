import type { FoodItem } from '../types';

// Real, exact macros via barcode — no AI guessing. Uses Open Food Facts (free,
// no key, CORS-enabled). Returns per-100g values so the UI can scale by grams.

export interface BarcodeProduct {
  code: string;
  name: string;
  brand?: string;
  per100g: { calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number };
  servingG?: number; // suggested portion if the product declares one
}

const OFF = 'https://world.openfoodfacts.org/api/v2/product';

const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' && isFinite(+v) ? +v : 0);

export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) return null;
  try {
    const res = await fetch(`${OFF}/${clean}?fields=product_name,brands,nutriments,serving_quantity`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const nut = p.nutriments ?? {};
    const kcal = n(nut['energy-kcal_100g']) || Math.round(n(nut['energy_100g']) / 4.184);
    return {
      code: clean,
      name: p.product_name || 'Unknown product',
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      per100g: {
        calories: Math.round(kcal),
        proteinG: Math.round(n(nut['proteins_100g'])),
        carbsG: Math.round(n(nut['carbohydrates_100g'])),
        fatG: Math.round(n(nut['fat_100g'])),
        sugarG: Math.round(n(nut['sugars_100g'])),
      },
      servingG: n(p.serving_quantity) || undefined,
    };
  } catch {
    return null;
  }
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

// The Web BarcodeDetector API (Chrome/Android). Where unsupported, the UI falls
// back to typing the number under the barcode.
type DetectorCtor = new (opts?: { formats?: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
export const barcodeDetectorSupported = () => typeof (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector === 'function';

export function createDetector() {
  const Ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  return new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
}
