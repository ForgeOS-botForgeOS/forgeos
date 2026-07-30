import type { BarcodeProduct } from './barcode';

// Scanned products, kept on the device.
//
// Two jobs: a product you have scanned before still logs with no connection
// (protein bars and milk get scanned every week), and the last few give the
// scanner a "recent" list so a repeat log needs no camera at all.

const KEY = 'forgeos.barcodes.v1';
const MAX = 40;

interface Entry {
  product: BarcodeProduct;
  at: number;
}

function load(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    // Anything half-written or from an older shape is dropped rather than trusted.
    return parsed.filter((e): e is Entry => !!e?.product?.code && !!e.product.per100g && typeof e.at === 'number');
  } catch {
    return [];
  }
}

function save(entries: Entry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    // Private mode or a full quota — the cache is a convenience, never required.
  }
}

/** Newest first, one entry per code. */
export function rememberProduct(product: BarcodeProduct): void {
  const rest = load().filter((e) => e.product.code !== product.code);
  save([{ product, at: Date.now() }, ...rest]);
}

export function cachedProduct(code: string): BarcodeProduct | null {
  return load().find((e) => e.product.code === code)?.product ?? null;
}

export function recentProducts(limit = 4): BarcodeProduct[] {
  return load()
    .slice(0, limit)
    .map((e) => e.product);
}
