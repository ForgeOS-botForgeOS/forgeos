import { describe, expect, it } from 'vitest';
import { searchApp } from './appSearch';
import { PLACES, buildIndex } from './appSearchIndex';

// A translator that behaves like the real one: returns the key when a string
// is missing, which is how a forgotten translation shows up in the UI.
const DICT: Record<string, string> = {
  'search.at.library': 'Train tab → Exercise library',
  'search.at.cookbook': 'Food tab → Cookbook',
  'search.at.history': 'Train tab → History',
};
for (const p of PLACES) {
  DICT[p.titleKey] = p.id;
  DICT[p.whereKey] = `${p.id} lives here`;
}
const t = (key: string) => DICT[key] ?? key;

const index = () =>
  buildIndex({
    t,
    exercises: [
      { id: 'bench', name: 'Bench Press', category: 'Chest', primary: 'Chest', secondary: [], equipment: 'Barbell' },
      { id: 'squat', name: 'Back Squat', category: 'Legs', primary: 'Quads', secondary: [], equipment: 'Barbell' },
    ],
    recipes: [
      { id: 'r1', name: 'Šošovicová polievka', meal: 'Lunch', goals: [], kcal: 400, protein: 25, carbs: 50, fat: 8, minutes: 30, servings: 2, ingredients: [], steps: [], tags: ['high-protein'] },
    ],
    sessions: [{ id: 'w1', name: 'Monday Push', date: '2026-09-01T09:00:00.000Z' }],
  });

describe('the search index', () => {
  it('carries every screen, exercise, recipe and past session', () => {
    const built = index();
    expect(built.filter((e) => e.kind === 'place' || e.kind === 'setting')).toHaveLength(PLACES.length);
    expect(built.filter((e) => e.kind === 'exercise')).toHaveLength(2);
    expect(built.filter((e) => e.kind === 'recipe')).toHaveLength(1);
    expect(built.filter((e) => e.kind === 'session')).toHaveLength(1);
  });

  it('gives every single entry a "where it lives" line — that is the whole point', () => {
    for (const e of index()) {
      expect(e.where, `${e.id} has no where`).not.toBe('');
      expect(e.where.startsWith('search.'), `${e.id} shows a raw i18n key`).toBe(false);
    }
  });

  it('routes every place at a real in-app path', () => {
    for (const e of index()) expect(e.route.startsWith('/')).toBe(true);
  });

  it('has a translation for every place key in both dictionaries', async () => {
    // Guards the most likely regression: adding a PLACE and forgetting the
    // Slovak (or English) strings, which would show "search.foo" to a user.
    const { EN_KEYS, SK_KEYS } = await import('./i18n.keys.test-helper');
    for (const p of PLACES) {
      expect(EN_KEYS.has(p.titleKey), `EN missing ${p.titleKey}`).toBe(true);
      expect(EN_KEYS.has(p.whereKey), `EN missing ${p.whereKey}`).toBe(true);
      expect(SK_KEYS.has(p.titleKey), `SK missing ${p.titleKey}`).toBe(true);
      expect(SK_KEYS.has(p.whereKey), `SK missing ${p.whereKey}`).toBe(true);
    }
  });

  it('finds a lift, a dish and a past session from one box', () => {
    const built = index();
    expect(searchApp(built, 'bench')[0].id).toBe('exercise:bench');
    expect(searchApp(built, 'sosovicova')[0].id).toBe('recipe:r1');
    expect(searchApp(built, 'monday')[0].id).toBe('session:w1');
  });

  it('finds a setting by a word the screen never prints', () => {
    // "passcode" is a keyword on the app-lock row; the row itself says "lock".
    expect(searchApp(index(), 'passcode')[0].id).toBe('place:lock');
  });

  it('gives no two entries the same id', () => {
    const ids = index().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
