import type { Exercise } from '../types';
import type { Recipe } from '../data/recipes';
import type { SearchEntry } from './appSearch';

// What the search box can find, assembled from the app's own data.
//
// `PLACES` is the hand-written half: screens, features and settings, each
// carrying the sentence that says where it lives IN THE FULL APP — the same
// promise "Find it fast" makes, so searching teaches the layout instead of
// replacing it. Keywords are never displayed; they exist so that a Slovak word,
// an English word or the name someone else's app uses all land on the right row.
//
// buildIndex() is pure: it takes the data and a translator, so a test can drive
// it with three exercises instead of a thousand.

export interface PlaceDef {
  id: string;
  titleKey: string;
  whereKey: string;
  route: string;
  kind: 'place' | 'setting';
  /** Synonyms in both languages. Lowercase; never shown to anyone. */
  keywords: readonly string[];
}

export const PLACES: readonly PlaceDef[] = [
  // --- the tabs themselves ---
  { id: 'home', kind: 'place', titleKey: 'search.home', whereKey: 'search.home.at', route: '/home', keywords: ['domov', 'dashboard', 'start'] },
  { id: 'train', kind: 'place', titleKey: 'search.train', whereKey: 'search.train.at', route: '/train', keywords: ['trening', 'workout', 'cvicenie', 'gym', 'lift'] },
  { id: 'food', kind: 'place', titleKey: 'search.food', whereKey: 'search.food.at', route: '/nutrition', keywords: ['jedlo', 'nutrition', 'calories', 'kalorie', 'macros', 'makra', 'eat'] },
  { id: 'you', kind: 'place', titleKey: 'search.you', whereKey: 'search.you.at', route: '/profile', keywords: ['ty', 'profil', 'settings', 'nastavenia', 'account', 'ucet'] },
  { id: 'social', kind: 'place', titleKey: 'search.social', whereKey: 'search.social.at', route: '/social', keywords: ['friends', 'kamarati', 'priatelia', 'feed', 'nastenka'] },
  { id: 'quests', kind: 'place', titleKey: 'search.quests', whereKey: 'search.quests.at', route: '/quests', keywords: ['questy', 'ulohy', 'xp', 'rank', 'level'] },

  // --- training ---
  { id: 'library', kind: 'place', titleKey: 'search.library', whereKey: 'search.library.at', route: '/library', keywords: ['exercises', 'cviky', 'kniznica', 'movements', 'how to'] },
  { id: 'history', kind: 'place', titleKey: 'search.history', whereKey: 'search.history.at', route: '/history', keywords: ['historia', 'past', 'minule', 'log', 'zaznam'] },
  { id: 'plan', kind: 'place', titleKey: 'search.plan', whereKey: 'search.plan.at', route: '/plan', keywords: ['plan', 'week', 'tyzden', 'program', 'split', 'routine', 'rutina'] },
  { id: 'calendar', kind: 'place', titleKey: 'search.calendar', whereKey: 'search.calendar.at', route: '/calendar', keywords: ['kalendar', 'heatmap', 'streak', 'seria'] },
  { id: 'progress', kind: 'place', titleKey: 'search.progress', whereKey: 'search.progress.at', route: '/progress', keywords: ['vaha', 'weight', 'pokrok', 'measurements', 'miery', 'photos', 'fotky', 'graphs', 'grafy'] },

  // --- nutrition ---
  { id: 'cookbook', kind: 'place', titleKey: 'search.cookbook', whereKey: 'search.cookbook.at', route: '/cookbook', keywords: ['recipes', 'recepty', 'kucharka', 'cook', 'varit', 'meals'] },
  { id: 'nutritionPlan', kind: 'place', titleKey: 'search.nutritionPlan', whereKey: 'search.nutritionPlan.at', route: '/nutrition-plan', keywords: ['diet', 'dieta', 'jedalnicek', 'macros', 'makra', 'cut', 'bulk'] },
  { id: 'scan', kind: 'place', titleKey: 'search.scan', whereKey: 'search.scan.at', route: '/nutrition', keywords: ['photo', 'foto', 'camera', 'kamera', 'barcode', 'ciarovy kod', 'scanner', 'skener'] },

  // --- rewards ---
  { id: 'prs', kind: 'place', titleKey: 'search.prs', whereKey: 'search.prs.at', route: '/quests', keywords: ['pr', 'records', 'rekordy', 'personal best', 'osobak', '1rm'] },
  { id: 'achievements', kind: 'place', titleKey: 'search.achievements', whereKey: 'search.achievements.at', route: '/achievements', keywords: ['badges', 'odznaky', 'uspechy', 'trophies', 'rewards', 'odmeny'] },
  { id: 'shop', kind: 'place', titleKey: 'search.shop', whereKey: 'search.shop.at', route: '/shop', keywords: ['obchod', 'coins', 'mince', 'themes', 'temy', 'cosmetics', 'titles'] },
  { id: 'collection', kind: 'place', titleKey: 'search.collection', whereKey: 'search.collection.at', route: '/collection', keywords: ['zbierka', 'items', 'unlocked'] },

  // --- people ---
  { id: 'addFriend', kind: 'place', titleKey: 'search.addFriend', whereKey: 'search.addFriend.at', route: '/add-friend', keywords: ['invite', 'pozvat', 'friend code', 'kod', 'pridat'] },
  { id: 'duels', kind: 'place', titleKey: 'search.duels', whereKey: 'search.duels.at', route: '/social', keywords: ['duel', 'suboj', 'challenge', 'vyzva', 'race', 'preteky', 'compete'] },

  // --- help & health ---
  { id: 'trainer', kind: 'place', titleKey: 'search.trainer', whereKey: 'search.trainer.at', route: '/trainer', keywords: ['ai', 'coach', 'trener', 'chat', 'ask', 'opytat', 'help', 'pomoc'] },
  { id: 'health', kind: 'place', titleKey: 'search.health', whereKey: 'search.health.at', route: '/health', keywords: ['sleep', 'spanok', 'steps', 'kroky', 'garmin', 'watch', 'hodinky', 'readiness', 'recovery', 'regeneracia'] },
  { id: 'wrapped', kind: 'place', titleKey: 'search.wrapped', whereKey: 'search.wrapped.at', route: '/wrapped', keywords: ['year', 'rok', 'summary', 'zhrnutie', 'recap'] },
  { id: 'spotify', kind: 'place', titleKey: 'search.spotify', whereKey: 'search.spotify.at', route: '/spotify', keywords: ['music', 'hudba', 'songs', 'playlist'] },

  // --- settings people actually hunt for ---
  { id: 'mode', kind: 'setting', titleKey: 'search.mode', whereKey: 'search.mode.at', route: '/profile', keywords: ['apprentice', 'ucen', 'simple', 'jednoduchy', 'full', 'switch', 'prepnut', 'beginner', 'zaciatocnik'] },
  { id: 'theme', kind: 'setting', titleKey: 'search.theme', whereKey: 'search.theme.at', route: '/profile', keywords: ['dark', 'tmavy', 'colours', 'farby', 'design', 'look', 'vzhlad'] },
  { id: 'language', kind: 'setting', titleKey: 'search.language', whereKey: 'search.language.at', route: '/profile', keywords: ['jazyk', 'slovencina', 'slovak', 'english', 'anglictina'] },
  { id: 'reminder', kind: 'setting', titleKey: 'search.reminder', whereKey: 'search.reminder.at', route: '/profile', keywords: ['notification', 'notifikacia', 'pripomienka', 'alarm', 'time', 'cas'] },
  { id: 'lock', kind: 'setting', titleKey: 'search.lock', whereKey: 'search.lock.at', route: '/profile', keywords: ['passcode', 'pin', 'kod', 'zamok', 'privacy', 'sukromie', 'security'] },
  { id: 'backup', kind: 'setting', titleKey: 'search.backup', whereKey: 'search.backup.at', route: '/profile', keywords: ['zaloha', 'export', 'import', 'json', 'data', 'udaje', 'sync'] },
  { id: 'access', kind: 'setting', titleKey: 'search.access', whereKey: 'search.access.at', route: '/profile', keywords: ['accessibility', 'pristupnost', 'big', 'velke', 'text', 'targets', 'motion', 'contrast'] },
  { id: 'feedback', kind: 'setting', titleKey: 'search.feedback', whereKey: 'search.feedback.at', route: '/profile', keywords: ['bug', 'chyba', 'report', 'nahlasit', 'idea', 'napad', 'suggest', 'navrh', 'broken'] },
];

export interface IndexSources {
  t: (key: string) => string;
  exercises: readonly Exercise[];
  recipes: readonly Recipe[];
  /** Past sessions: enough of each to name it and open it. */
  sessions: readonly { id: string; name: string; date: string }[];
}

/** Where an exercise or a recipe lives, phrased the "Find it fast" way. */
function whereFor(t: IndexSources['t'], key: string): string {
  const s = t(key);
  return s === key ? '' : s;
}

export function buildIndex({ t, exercises, recipes, sessions }: IndexSources): SearchEntry[] {
  const places: SearchEntry[] = PLACES.map((p) => ({
    id: `place:${p.id}`,
    kind: p.kind,
    title: t(p.titleKey),
    where: t(p.whereKey),
    route: p.route,
    keywords: p.keywords,
  }));

  const exerciseWhere = whereFor(t, 'search.at.library');
  const exerciseEntries: SearchEntry[] = exercises.map((e) => ({
    id: `exercise:${e.id}`,
    kind: 'exercise',
    title: e.name,
    where: exerciseWhere,
    route: `/exercise/${e.id}`,
    keywords: [e.primary, e.equipment, e.category],
    // The library already marks the handful of movements everything else is a
    // variation of; that is exactly "the one they probably meant".
    common: e.isCore === true,
  }));

  const recipeWhere = whereFor(t, 'search.at.cookbook');
  const recipeEntries: SearchEntry[] = recipes.map((r) => ({
    id: `recipe:${r.id}`,
    kind: 'recipe',
    title: r.name,
    where: recipeWhere,
    route: `/recipe/${r.id}`,
    keywords: [r.meal, ...r.tags],
  }));

  const sessionWhere = whereFor(t, 'search.at.history');
  const sessionEntries: SearchEntry[] = sessions.map((w) => ({
    id: `session:${w.id}`,
    kind: 'session',
    title: w.name,
    where: sessionWhere,
    route: `/workout/${w.id}`,
    keywords: [new Date(w.date).toLocaleDateString()],
  }));

  return [...places, ...exerciseEntries, ...recipeEntries, ...sessionEntries];
}
