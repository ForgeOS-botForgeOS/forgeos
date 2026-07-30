import { describe, expect, test } from 'vitest';
import { canonicalCode, expandUpcE, gtinCheckDigitOk, isPlausibleBarcode, portionToItem, type BarcodeProduct } from './barcode';
import { CONFIRM_HITS, confirmRead, emptyConfirm } from './barcodeScan';

describe('barcode check digits', () => {
  test('accepts real EAN-13 codes', () => {
    expect(gtinCheckDigitOk('3017620422003')).toBe(true); // Nutella
    expect(gtinCheckDigitOk('5449000000996')).toBe(true); // Coca-Cola
  });

  test('accepts real UPC-A and EAN-8 codes', () => {
    expect(gtinCheckDigitOk('038000138416')).toBe(true); // Pringles, 12 digits
    expect(gtinCheckDigitOk('96385074')).toBe(true); // EAN-8
  });

  test('rejects a single mistyped digit', () => {
    expect(gtinCheckDigitOk('3017620422004')).toBe(false);
    expect(gtinCheckDigitOk('3017620422103')).toBe(false);
  });

  test('rejects wrong lengths and non-digits', () => {
    expect(gtinCheckDigitOk('301762042200')).toBe(false); // 12 digits, but an EAN-13 payload
    expect(gtinCheckDigitOk('12345')).toBe(false);
    expect(gtinCheckDigitOk('')).toBe(false);
    expect(gtinCheckDigitOk('30176204220O3')).toBe(false);
  });
});

describe('UPC-E expansion', () => {
  // A UPC-E's check digit belongs to the expanded UPC-A, so an unexpanded
  // 8-digit code looks like a broken EAN-8 and would be rejected.
  test('expands each compression case to a valid UPC-A', () => {
    for (const code of ['04252614', '01234565', '00567891', '01278906']) {
      const expanded = expandUpcE(code);
      expect(expanded, code).not.toBeNull();
      expect(expanded).toHaveLength(12);
    }
  });

  test('canonicalCode expands a UPC-E that fails as an EAN-8', () => {
    expect(gtinCheckDigitOk('04252614')).toBe(false);
    expect(canonicalCode('04252614')).toBe('0042100005264');
    expect(isPlausibleBarcode('04252614')).toBe(true);
  });

  test('leaves a genuine EAN-8 alone', () => {
    expect(canonicalCode('96385074')).toBe('96385074');
  });

  test('rejects codes that are not UPC-E at all', () => {
    expect(expandUpcE('3017620422003')).toBeNull();
    expect(expandUpcE('92345670')).toBeNull(); // number system must be 0 or 1
  });
});

describe('canonicalCode', () => {
  test('strips spaces, dashes and stray characters', () => {
    expect(canonicalCode(' 3017-6204 22003 ')).toBe('3017620422003');
  });

  // Verified against the real decoder and the real API: ZXing reports a UPC-A as
  // a zero-padded EAN-13, Android's native detector as 12 digits, and Open Food
  // Facts answers with 13 either way. One key, or the cache splits in two.
  test('pads a 12-digit UPC-A to 13 so both scan engines agree', () => {
    expect(canonicalCode('038000138416')).toBe('0038000138416');
    expect(canonicalCode('0038000138416')).toBe('0038000138416');
    expect(isPlausibleBarcode('038000138416')).toBe(true);
  });

  test('padding does not disturb the check digit', () => {
    expect(gtinCheckDigitOk('038000138416')).toBe(true);
    expect(gtinCheckDigitOk('0038000138416')).toBe(true);
  });

  test('leaves a genuine EAN-13 and EAN-8 untouched', () => {
    expect(canonicalCode('3017620422003')).toBe('3017620422003');
    expect(canonicalCode('96385074')).toBe('96385074');
  });

  test('survives empty and junk input', () => {
    expect(canonicalCode('')).toBe('');
    expect(canonicalCode('abc')).toBe('');
    expect(isPlausibleBarcode('')).toBe(false);
  });
});

describe('portionToItem', () => {
  const bar: BarcodeProduct = {
    code: '3017620422003',
    name: 'Protein bar',
    brand: 'Brandy',
    // Unrounded per-100g, as the lookup now keeps them.
    per100g: { calories: 412.5, proteinG: 32.4, carbsG: 28.7, fatG: 12.3, sugarG: 3.6 },
  };

  test('scales macros to the portion and names the brand', () => {
    expect(portionToItem(bar, 100)).toEqual({
      name: 'Protein bar (Brandy)',
      calories: 413,
      proteinG: 32,
      carbsG: 29,
      fatG: 12,
      sugarG: 4,
    });
  });

  test('a half portion is half the macros, not half of a rounded number', () => {
    // 32.4 g/100 g → 16.2 g in 50 g. Rounding per-100g first would give 16.
    const half = portionToItem(bar, 50);
    expect(half.proteinG).toBe(16);
    expect(half.calories).toBe(206);
  });

  test('small portions keep useful precision', () => {
    const spoon = portionToItem({ ...bar, per100g: { ...bar.per100g, proteinG: 5.4 } }, 30);
    expect(spoon.proteinG).toBe(2); // 1.62 → 2, not 0
  });

  test('omits the brand when the product has none', () => {
    expect(portionToItem({ ...bar, brand: undefined }, 100).name).toBe('Protein bar');
  });
});

describe('scan confirmation', () => {
  // One frame is not enough: a misread digit yields a different, still valid
  // product. Two agreeing frames must be seen before anything is logged.
  test('needs two agreeing reads before accepting', () => {
    const first = confirmRead(emptyConfirm, ['3017620422003']);
    expect(first.accepted).toBeNull();
    expect(first.state.hits).toBe(1);

    const second = confirmRead(first.state, ['3017620422003']);
    expect(second.accepted).toBe('3017620422003');
    expect(CONFIRM_HITS).toBe(2);
  });

  test('a disagreeing read restarts the count instead of accepting', () => {
    const first = confirmRead(emptyConfirm, ['3017620422003']);
    const other = confirmRead(first.state, ['5449000000996']);
    expect(other.accepted).toBeNull();
    expect(other.state).toEqual({ code: '5449000000996', hits: 1 });
  });

  test('ignores reads that fail their check digit', () => {
    const bad = confirmRead(emptyConfirm, ['3017620422004']);
    expect(bad.accepted).toBeNull();
    expect(bad.state).toEqual(emptyConfirm);

    const again = confirmRead(bad.state, ['3017620422004']);
    expect(again.accepted).toBeNull(); // never accepted, however many times it is seen
  });

  test('ignores empty frames and keeps the pending code', () => {
    const first = confirmRead(emptyConfirm, ['3017620422003']);
    const blank = confirmRead(first.state, []);
    expect(blank.state).toEqual(first.state);
    expect(confirmRead(blank.state, ['3017620422003']).accepted).toBe('3017620422003');
  });

  test('picks the valid code out of a frame with several barcodes', () => {
    const state = confirmRead(emptyConfirm, ['not-a-code', '3017620422003']).state;
    expect(confirmRead(state, ['3017620422003']).accepted).toBe('3017620422003');
  });

  test('accepts a UPC-E in its expanded form', () => {
    const first = confirmRead(emptyConfirm, ['04252614']);
    expect(confirmRead(first.state, ['04252614']).accepted).toBe('0042100005264');
  });

  // The two engines spell a UPC-A differently; after canonicalisation they are
  // the same read, so scanning does not stall on a "disagreement" that isn't one.
  test('treats the native and WASM spellings of one UPC-A as agreeing', () => {
    const first = confirmRead(emptyConfirm, ['038000138416']); // native
    const second = confirmRead(first.state, ['0038000138416']); // WASM
    expect(second.accepted).toBe('0038000138416');
  });
});
