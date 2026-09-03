import { describe, expect, it } from 'vitest';
import { estimateMacros, matchFoodTable, parseFoodDescription, resolveItem, scaleMacros } from './foodDescribe';
import { FOOD_TABLE } from '../data/foodTable';

describe('parseFoodDescription', () => {
  it('reads an explicit weight per food', () => {
    expect(parseFoodDescription('200g chicken breast, 150 g white rice')).toEqual([
      { name: 'chicken breast', grams: 200, gramsKnown: true },
      { name: 'white rice', grams: 150, gramsKnown: true },
    ]);
  });

  it('splits on the words people actually use, not just commas', () => {
    const names = parseFoodDescription('oats with milk and a banana + peanut butter').map((i) => i.name);
    expect(names).toEqual(['oats', 'milk', 'banana', 'peanut butter']);
  });

  it('converts every weight unit to grams', () => {
    const g = (s: string) => parseFoodDescription(s)[0].grams;
    expect(g('1.5 kg beef')).toBe(1500);
    expect(g('330ml cola')).toBe(330);
    expect(g('2dl milk')).toBe(200);
    expect(g('0,5l juice')).toBe(500);
  });

  it('multiplies a count by the weight of one piece', () => {
    expect(parseFoodDescription('3 eggs')).toEqual([{ name: 'eggs', grams: 150, gramsKnown: true }]);
    expect(parseFoodDescription('2 slices of bread')).toEqual([{ name: 'slices bread', grams: 60, gramsKnown: true }]);
  });

  it('assumes one piece when a piece food is named without a count', () => {
    expect(parseFoodDescription('banana')).toEqual([{ name: 'banana', grams: 118, gramsKnown: false }]);
  });

  it('flags an assumed portion so the UI can say so', () => {
    expect(parseFoodDescription('chicken curry')).toEqual([{ name: 'chicken curry', grams: 150, gramsKnown: false }]);
  });

  it('drops filler words that would spoil the lookup', () => {
    expect(parseFoodDescription('a large portion of homemade lasagna')[0].name).toBe('lasagna');
  });

  it('returns nothing for text with no food in it', () => {
    expect(parseFoodDescription('')).toEqual([]);
    expect(parseFoodDescription('   ,,  ')).toEqual([]);
  });

  it('keeps the meal to a sane number of items', () => {
    const many = Array.from({ length: 30 }, (_, i) => `food${i}`).join(', ');
    expect(parseFoodDescription(many).length).toBe(12);
  });

  it('clamps absurd weights instead of logging them', () => {
    expect(parseFoodDescription('99 kg rice')[0].grams).toBe(5000);
  });
});

describe('matchFoodTable', () => {
  it('prefers the longest match, so a specific cut beats the generic word', () => {
    expect(matchFoodTable('chicken breast')).toBe('chicken breast');
    expect(matchFoodTable('grilled chicken')).toBe('chicken');
    expect(matchFoodTable('brown rice, cooked')).toBe('brown rice');
  });

  it('returns null when nothing in the table applies', () => {
    expect(matchFoodTable('zzzznotafood')).toBeNull();
  });
});

describe('scaleMacros', () => {
  it('scales per-100g values to the portion', () => {
    expect(scaleMacros(FOOD_TABLE['chicken breast'], 200)).toEqual({
      calories: 330, proteinG: 62, carbsG: 0, fatG: 7, sugarG: 0,
    });
  });

  it('is zero for a zero portion', () => {
    expect(scaleMacros(FOOD_TABLE.rice, 0)).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 });
  });
});

describe('resolveItem', () => {
  it('uses the curated table without touching the network', async () => {
    const r = await resolveItem({ name: 'white rice', grams: 150, gramsKnown: true }, false);
    expect(r.source).toBe('table');
    expect(r.item.name).toBe('white rice (150g)');
    expect(r.item.calories).toBe(195);
  });

  it('falls back to a flagged estimate rather than dropping the food', async () => {
    const r = await resolveItem({ name: 'zzzznotafood', grams: 100, gramsKnown: false }, false);
    expect(r.source).toBe('estimate');
    expect(r.item.calories).toBe(estimateMacros(100).calories);
  });
});
