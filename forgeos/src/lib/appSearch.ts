// One box that finds anything — the Apprentice Mode answer to "where is that?".
//
// Apprentice Mode exists because a beginner cannot hold a six-tab app in their
// head. "Find it fast" (lib/apprentice.ts) answers that for six fixed things;
// this answers it for everything else — screens, settings, exercises, recipes,
// your own past sessions — with one input.
//
// Two rules make it a teaching tool rather than a shortcut:
//   1. every hit carries `where` — the place it lives IN THE FULL APP — so what
//      you learn by searching stays true after switching to Full Forge;
//   2. matching is diacritic-blind, because a Slovak user types "sosovicova"
//      on an English keyboard and still means "šošovicová".
//
// Everything here is pure. The index is assembled by lib/appSearchIndex.ts from
// live app data; this file only knows how to score strings.

export type SearchKind = 'place' | 'setting' | 'exercise' | 'recipe' | 'session';

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  /** Shown as the result. Already localised by whoever built the index. */
  title: string;
  /** Where it lives in the FULL app, e.g. "Food tab → Cookbook". */
  where: string;
  route: string;
  /** Words that should match but are not shown — synonyms, the other language. */
  keywords?: readonly string[];
  /**
   * A nudge for the entry people usually mean. The exercise library has nine
   * things starting with "bench"; without this, alphabetical order decides that
   * "Bench Dip" beats "Bench Press", which is never what anyone wanted.
   */
  common?: boolean;
}

export interface SearchHit extends SearchEntry {
  score: number;
}

/** Longest query we bother scoring — beyond this it is a paste, not a search. */
export const SEARCH_MAX = 64;
/** Below this every result is noise, so we show the browse list instead. */
export const SEARCH_MIN = 2;
export const SEARCH_LIMIT = 12;

/**
 * Lowercase and strip diacritics, so "Šošovicová" == "sosovicova" and
 * "Prítlak" == "pritlak". NFD splits a letter into base + combining mark; the
 * range U+0300–U+036F is exactly those marks.
 */
export function normalise(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Score for one field. 0 means "no match at all". */
function fieldScore(field: string, q: string, weights: [number, number, number]): number {
  if (!field) return 0;
  const [starts, word, contains] = weights;
  // An exact hit outranks a prefix of something longer. Without this, typing
  // "pr" scored the keyword "profil" exactly as highly as the keyword "pr",
  // and the PR Hall lost its own search term to a Slovak word for "profile".
  if (field === q) return starts + 20;
  if (field.startsWith(q)) return starts;
  // A match at a word boundary is nearly as good as at the start: someone
  // typing "press" means Bench Press.
  const at = field.indexOf(q);
  if (at < 0) return 0;
  return field[at - 1] === ' ' || field[at - 1] === '-' ? word : contains;
}

/**
 * How well one entry answers the query. Ordering intent, highest first:
 * a screen you can go to beats an exercise that merely contains the word,
 * a title match beats a keyword match, and a shorter title breaks ties so
 * "Bench Press" outranks "Close-Grip Bench Press Pause" for "bench".
 */
export function scoreEntry(entry: SearchEntry, query: string): number {
  const q = normalise(query);
  if (q.length < SEARCH_MIN) return 0;

  const title = fieldScore(normalise(entry.title), q, [100, 80, 55]);
  let keyword = 0;
  for (const k of entry.keywords ?? []) {
    keyword = Math.max(keyword, fieldScore(normalise(k), q, [70, 60, 40]));
    if (keyword === 70) break;
  }
  // "Where" is the weakest signal but a real one — typing "cookbook" should
  // still surface the recipes that live there.
  const where = fieldScore(normalise(entry.where), q, [25, 22, 18]);

  const best = Math.max(title, keyword, where);
  if (best === 0) return 0;

  // Destinations first: with 1000 exercises in the index, a beginner searching
  // "food" must get the Food tab, not a food-shaped lift.
  const kindBonus: Record<SearchKind, number> = {
    place: 12, setting: 8, session: 4, recipe: 2, exercise: 0,
  };
  // Shorter titles are more precise answers to the same word.
  const brevity = Math.max(0, 12 - Math.floor(entry.title.length / 6));
  return best + kindBonus[entry.kind] + brevity + (entry.common ? 6 : 0);
}

/**
 * Rank the index against a query. Ties break alphabetically so the list never
 * reshuffles between renders for equally good hits.
 */
export function searchApp(entries: readonly SearchEntry[], query: string, limit = SEARCH_LIMIT): SearchHit[] {
  const q = query.slice(0, SEARCH_MAX);
  if (normalise(q).length < SEARCH_MIN) return [];
  const hits: SearchHit[] = [];
  for (const e of entries) {
    const score = scoreEntry(e, q);
    if (score > 0) hits.push({ ...e, score });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, limit);
}


/**
 * Results, grouped and capped.
 *
 * A flat list is dominated by whichever kind happens to have a thousand rows:
 * typing "ben" filled the screen with bench variations and pushed every screen
 * and setting off the bottom. Grouping keeps one of each kind visible, and the
 * caps mean a group can never eat the whole list.
 */
export const GROUP_ORDER: readonly SearchKind[] = ['place', 'setting', 'session', 'recipe', 'exercise'];

/** Per-kind caps. Destinations are few and precious; exercises are endless. */
const GROUP_CAP: Record<SearchKind, number> = {
  place: 5, setting: 4, session: 3, recipe: 4, exercise: 5,
};

export interface SearchGroup {
  kind: SearchKind;
  hits: SearchHit[];
}

export function groupHits(hits: readonly SearchHit[]): SearchGroup[] {
  return GROUP_ORDER.map((kind) => ({
    kind,
    hits: hits.filter((h) => h.kind === kind).slice(0, GROUP_CAP[kind]),
  })).filter((g) => g.hits.length > 0);
}
