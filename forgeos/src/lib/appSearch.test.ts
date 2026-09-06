import { describe, expect, it } from 'vitest';
import { GROUP_ORDER, SEARCH_MIN, groupHits, normalise, scoreEntry, searchApp, type SearchEntry } from './appSearch';

const entry = (over: Partial<SearchEntry> & Pick<SearchEntry, 'id' | 'title'>): SearchEntry => ({
  kind: 'exercise', where: 'Train tab', route: '/train', ...over,
});

const INDEX: SearchEntry[] = [
  entry({ id: 'p-food', kind: 'place', title: 'Food', where: 'Food tab', route: '/nutrition', keywords: ['nutrition', 'jedlo', 'calories'] }),
  entry({ id: 'p-book', kind: 'place', title: 'Cookbook', where: 'Food tab → Cookbook', route: '/cookbook', keywords: ['recipes', 'recepty'] }),
  entry({ id: 'x-bench', title: 'Bench Press', where: 'Train tab → Exercise library', route: '/exercise/bench' }),
  entry({ id: 'x-cgbp', title: 'Close-Grip Bench Press', where: 'Train tab → Exercise library', route: '/exercise/cgbp' }),
  entry({ id: 'r-lentil', kind: 'recipe', title: 'Šošovicová polievka', where: 'Food tab → Cookbook', route: '/recipe/1' }),
  entry({ id: 's-lock', kind: 'setting', title: 'App lock', where: 'You tab → Preferences', route: '/profile', keywords: ['passcode', 'pin'] }),
];

describe('normalise', () => {
  it('strips Slovak diacritics so an English keyboard still finds the dish', () => {
    expect(normalise('Šošovicová')).toBe('sosovicova');
    expect(normalise('  Prítlak ')).toBe('pritlak');
  });
});

describe('scoreEntry', () => {
  it('ignores queries shorter than the minimum', () => {
    expect(scoreEntry(INDEX[0], 'f')).toBe(0);
    expect('f'.length).toBeLessThan(SEARCH_MIN);
  });

  it('scores a title match above a keyword match above a where match', () => {
    const title = scoreEntry(entry({ id: 'a', title: 'Cookbook', where: 'zzz' }), 'cookbook');
    const keyword = scoreEntry(entry({ id: 'a', title: 'zzz', where: 'zzz', keywords: ['cookbook'] }), 'cookbook');
    const where = scoreEntry(entry({ id: 'a', title: 'zzz', where: 'Cookbook' }), 'cookbook');
    expect(title).toBeGreaterThan(keyword);
    expect(keyword).toBeGreaterThan(where);
  });

  it('rewards a match at a word boundary over one buried mid-word', () => {
    const boundary = scoreEntry(entry({ id: 'a', title: 'Bench Press' }), 'press');
    const buried = scoreEntry(entry({ id: 'a', title: 'Impressive Lift' }), 'press');
    expect(boundary).toBeGreaterThan(buried);
  });
});

describe('searchApp', () => {
  it('returns nothing until the query is long enough to mean something', () => {
    expect(searchApp(INDEX, '')).toEqual([]);
    expect(searchApp(INDEX, 'b')).toEqual([]);
  });

  it('puts a destination above an exercise that merely contains the word', () => {
    const hits = searchApp(INDEX, 'food');
    expect(hits[0].id).toBe('p-food');
  });

  it('finds a Slovak recipe typed without diacritics', () => {
    expect(searchApp(INDEX, 'sosovicova')[0].id).toBe('r-lentil');
  });

  it('finds the Cookbook by its Slovak keyword', () => {
    expect(searchApp(INDEX, 'recepty')[0].id).toBe('p-book');
  });

  it('prefers the shorter, more precise title on an equal match', () => {
    const hits = searchApp(INDEX, 'bench press');
    expect(hits[0].id).toBe('x-bench');
    expect(hits.map((h) => h.id)).toContain('x-cgbp');
  });

  it('finds a setting by a synonym the screen never shows', () => {
    expect(searchApp(INDEX, 'passcode')[0].id).toBe('s-lock');
  });

  it('every hit says where it lives in the full app', () => {
    for (const hit of searchApp(INDEX, 'press')) expect(hit.where).not.toBe('');
  });

  it('honours the limit and sorts strictly by score', () => {
    const hits = searchApp(INDEX, 'e', 3);
    expect(hits.length).toBeLessThanOrEqual(3);
    const scores = searchApp(INDEX, 'press').map((h) => h.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('is stable for equally-scoring hits (alphabetical tie-break)', () => {
    const a = searchApp(INDEX, 'press');
    const b = searchApp([...INDEX].reverse(), 'press');
    expect(a.map((h) => h.id)).toEqual(b.map((h) => h.id));
  });

  it('does not choke on a pasted wall of text', () => {
    expect(() => searchApp(INDEX, 'x'.repeat(5000))).not.toThrow();
    expect(searchApp(INDEX, 'x'.repeat(5000))).toEqual([]);
  });
});

describe('groupHits', () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    entry({ id: `x${i}`, title: `Bench Variation ${i}`, where: 'Train tab' }),
  );

  it('keeps destinations visible even when a thousand exercises match', () => {
    const hits = searchApp([...many, INDEX[0], INDEX[5]], 'ben', 60);
    // Without grouping, 30 exercises would bury the Food screen entirely.
    const groups = groupHits(hits);
    expect(groups.map((g) => g.kind)).toContain('exercise');
    expect(groups.find((g) => g.kind === 'exercise')!.hits.length).toBeLessThanOrEqual(5);
  });

  it('orders the groups destinations-first', () => {
    const hits = searchApp(INDEX, 'press', 60);
    const kinds = groupHits(hits).map((g) => g.kind);
    expect(kinds).toEqual([...GROUP_ORDER].filter((k) => kinds.includes(k)));
  });

  it('drops empty groups instead of rendering an empty heading', () => {
    expect(groupHits(searchApp(INDEX, 'sosovicova')).map((g) => g.kind)).toEqual(['recipe']);
  });

  it('prefers the movement everything else is a variation of', () => {
    const list = [
      entry({ id: 'dip', title: 'Bench Dip' }),
      entry({ id: 'press', title: 'Bench Press', common: true }),
    ];
    expect(searchApp(list, 'bench')[0].id).toBe('press');
  });
});

describe('exact matches', () => {
  it('beats a prefix of a longer word — "pr" means PRs, not "profil"', () => {
    const list = [
      entry({ id: 'you', kind: 'place', title: 'You', where: 'You tab', keywords: ['profil', 'settings'] }),
      entry({ id: 'prs', kind: 'place', title: 'Your records (PRs)', where: 'Quests tab', keywords: ['pr', 'records'] }),
    ];
    expect(searchApp(list, 'pr')[0].id).toBe('prs');
  });

  it('still ranks an exact title above an exact keyword', () => {
    const list = [
      entry({ id: 'a', title: 'Shop', where: 'x' }),
      entry({ id: 'b', title: 'Something else', where: 'x', keywords: ['shop'] }),
    ];
    expect(searchApp(list, 'shop')[0].id).toBe('a');
  });
});

describe('whole words beat prefixes of longer words', () => {
  it('puts "Bench Press" above "Pressing Snatch Balance" for "press"', () => {
    const list = [
      entry({ id: 'pressing', title: 'Pressing Snatch Balance' }),
      entry({ id: 'bench', title: 'Bench Press' }),
    ];
    expect(searchApp(list, 'press')[0].id).toBe('bench');
  });

  it('still ranks the whole field above a word inside a longer one', () => {
    const list = [
      entry({ id: 'long', title: 'Incline Dumbbell Press' }),
      entry({ id: 'exact', title: 'Press' }),
    ];
    expect(searchApp(list, 'press')[0].id).toBe('exact');
  });

  it('treats a bracketed word as a word — "(PRs)" contains "prs"', () => {
    const list = [
      entry({ id: 'other', title: 'Progress' }),
      entry({ id: 'prs', title: 'Your records (PRs)' }),
    ];
    expect(searchApp(list, 'prs')[0].id).toBe('prs');
  });
});
