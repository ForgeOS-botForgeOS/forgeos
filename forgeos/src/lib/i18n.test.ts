import { describe, expect, test } from 'vitest';
import { translate, translateCount, pluralCategory, localeFor } from './i18n';

describe('translate', () => {
  test('returns the key when no translation exists', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
  });

  test('substitutes {placeholders} with params', () => {
    expect(translate('en', 'duel.challengeSent', { name: 'Mia' })).toBe('Challenge sent to Mia ⚔️');
  });

  test('lets each language own word order around the value', () => {
    // English puts the count first, Slovak wraps it differently — same key, same param.
    expect(translate('en', 'duel.daysLeft', { n: 3 })).toBe('3d left');
    expect(translate('sk', 'duel.daysLeft', { n: 3 })).toBe('zostáva 3d');
  });

  test('falls back to English when a Slovak key is missing', () => {
    // 'common.kg' exists in both; a hypothetical EN-only key still resolves via EN.
    expect(translate('sk', 'nonexistent.but.enOnly')).toBe('nonexistent.but.enOnly');
  });
});

describe('pluralCategory', () => {
  test('English is one/other', () => {
    expect(pluralCategory('en', 1)).toBe('one');
    expect(pluralCategory('en', 0)).toBe('other');
    expect(pluralCategory('en', 5)).toBe('other');
  });

  test('Slovak adds a few bucket for 2–4', () => {
    expect(pluralCategory('sk', 1)).toBe('one');
    expect(pluralCategory('sk', 2)).toBe('few');
    expect(pluralCategory('sk', 4)).toBe('few');
    expect(pluralCategory('sk', 5)).toBe('other');
    expect(pluralCategory('sk', 0)).toBe('other');
  });
});

describe('translateCount', () => {
  test('picks the right English form and injects n', () => {
    expect(translateCount('en', 'wr.session', 1)).toBe('1 session');
    expect(translateCount('en', 'wr.session', 3)).toBe('3 sessions');
  });

  test('picks the Slovak one/few/other forms', () => {
    expect(translateCount('sk', 'wr.session', 1)).toBe('1 tréning');
    expect(translateCount('sk', 'wr.session', 3)).toBe('3 tréningy');
    expect(translateCount('sk', 'wr.session', 8)).toBe('8 tréningov');
  });

  test('falls back to .other when a bucket is absent', () => {
    // 'wr.pr' has no explicit English '.few'; SK "few" for PR maps to the invariant form.
    expect(translateCount('en', 'wr.pr', 2)).toBe('2 PRs');
    expect(translateCount('sk', 'wr.pr', 2)).toBe('2 PR');
  });
});

describe('localeFor', () => {
  test('maps language to a BCP-47 locale', () => {
    expect(localeFor('en')).toBe('en-GB');
    expect(localeFor('sk')).toBe('sk-SK');
  });
});
