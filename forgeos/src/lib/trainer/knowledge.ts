// ---- What the trainer knows about ForgeOS itself ----
// A model cannot answer "how do I start a race?" from training knowledge — it
// needs to be told how this app works. These entries are the app's own manual,
// searched by keyword and pasted into the prompt (and used verbatim by the
// offline trainer, which has no model at all).

export interface HelpEntry {
  id: string;
  title: string;
  /** Words a person might actually type when they mean this. */
  keywords: string[];
  answer: string;
  /** Where to go in the app, if there is a screen for it. */
  route?: string;
}

export const APP_HELP: HelpEntry[] = [
  {
    id: 'start-workout',
    title: 'Starting and logging a workout',
    keywords: ['start workout', 'log workout', 'log a set', 'begin training', 'session', 'empty workout', 'ghost'],
    answer:
      'Train tab → start today\'s planned session or "start an empty workout". Each exercise has set rows: adjust weight/reps with the ± steppers, then tap the big green Done button (or swipe the row right). Swipe left deletes a set, long-press opens notes. The 👻 ghost line under a set shows what you did last time, so you always know what to beat.',
    route: '/train',
  },
  {
    id: 'focus-hud',
    title: 'Focus mode during a session',
    keywords: ['focus', 'hud', 'one set at a time', 'full screen', 'crosshair', 'distraction'],
    answer:
      'In a live session, tap the crosshair icon in the header. Focus mode fills the screen with just the set you are on — big weight × reps, the ghost target, RPE and a giant Done button. The rest timer and the music player float above it. Chips at the bottom let you jump to another exercise (handy for supersets).',
    route: '/train',
  },
  {
    id: 'exercise-detail',
    title: 'Exercise detail pages',
    keywords: ['exercise page', 'form cues', 'how to do', 'technique', 'e1rm', 'progression', 'video', 'library'],
    answer:
      'Tap any lift\'s name — in a session, the library, history, or the PR Hall — and you get its page: form cues step by step, the common mistake, your session count, best e1RM, your PR, an e1RM progression chart, a warm-up ladder to your working weight, similar movements, and a form video.',
    route: '/library',
  },
  {
    id: 'cookbook',
    title: 'The cookbook',
    keywords: ['recipe', 'recipes', 'cookbook', 'cook', 'meal idea', 'what to eat', 'shopping list', 'ingredients'],
    answer:
      'Food tab → Cookbook. 107 recipes, each with a real step-by-step method you can tick off while cooking. Filter by meal, your goal, tags (high-protein, quick, vegan, budget…) or ≤15 minutes. On a recipe: scale the servings and the macros rescale, add the ingredients to your shopping list, and "log it" writes the scaled macros into today\'s food log.',
    route: '/cookbook',
  },
  {
    id: 'nutrition-plan',
    title: 'The nutrition plan',
    keywords: ['nutrition plan', 'meal plan', 'macros', 'calories', 'how much protein', 'targets', 'tdee', 'cut', 'bulk'],
    answer:
      'Food tab → Nutrition plan. Pick any goal to see its numbers before committing: calories, protein/carbs/fat, protein per kg, training vs rest day, hydration, meal-by-meal split, and a full day of real food from the cookbook portioned to hit those targets. "Switch to this" makes it your actual goal.',
    route: '/nutrition-plan',
  },
  {
    id: 'vitamins',
    title: 'Recovery and vitamins',
    keywords: ['vitamin', 'supplement', 'creatine', 'magnesium', 'protein powder', 'recovery', 'omega', 'zinc', 'iron'],
    answer:
      'Food tab → Nutrition plan → "Recovery & vitamins". Each nutrient shows what it does, why it matters for recovery, food sources first, an ordinary amount, timing and a caution. The list reorders itself from your data — short sleep raises magnesium, winter raises vitamin D, four-plus sessions a week raises protein and electrolytes. It is information, not a prescription.',
    route: '/nutrition-plan',
  },
  {
    id: 'scanner',
    title: 'Scanning food',
    keywords: ['scan', 'photo', 'camera', 'barcode', 'macro scanner', 'ai food'],
    answer:
      'Food tab → "Scan a meal" reads a photo and estimates each item, which you can edit before logging; your corrections are remembered for next time. The barcode scanner gives exact macros from Open Food Facts. Both are optional — manual entry works the same.',
    route: '/nutrition',
  },
  {
    id: 'achievements',
    title: 'Achievements and rewards',
    keywords: ['achievement', 'reward', 'claim', 'xp', 'coins', 'tier', 'legendary', 'cosmetic', 'title', 'frame'],
    answer:
      'Profile → Achievements. All 57 have a tier: bronze pays 100 XP + 25 coins, silver 300/75, gold 800/200, legendary 2000/600. You claim them (one at a time or "claim everything"). Seven legendary ones grant cosmetics no amount of coins can buy — titles, frames and the Champion\'s Forge theme.',
    route: '/achievements',
  },
  {
    id: 'rank-xp',
    title: 'XP, ranks and coins',
    keywords: ['rank', 'level', 'xp', 'forge coins', 'shop', 'cosmetics', 'currency'],
    answer:
      'XP comes from sets, sessions, PRs, quests and achievements, and drives your rank (Bronze → Strongman). Forge Coins come from quests, milestones and converting XP, and buy titles, avatar frames and themes in the Forge Shop.',
    route: '/quests',
  },
  {
    id: 'streak',
    title: 'How the streak works',
    keywords: ['streak', 'weekly', 'miss a day', 'freeze', 'consistency'],
    answer:
      'The main streak is weekly — "weeks you showed up". It advances on your first session of the week and only breaks if you skip a whole week, so a missed Tuesday costs nothing. A daily streak is tracked too, shown secondarily.',
    route: '/quests',
  },
  {
    id: 'plan',
    title: 'The week plan',
    keywords: ['week plan', 'programme', 'program', 'plan editor', 'split', 'routine', 'rest day'],
    answer:
      'Profile → Edit week plan. Onboarding generates a plan from your goal, experience and available days, and you can edit every day: swap exercises, change sets/reps, make a day a rest day. Change your goal and the app offers to re-tune the plan to match.',
    route: '/plan',
  },
  {
    id: 'race',
    title: 'Live races and duels',
    keywords: ['race', 'duel', 'friend', 'multiplayer', 'compete', 'challenge', 'leaderboard'],
    answer:
      'Social tab → Live Race: pick a mode (same workout first-to-finish, volume race to a target, or timed most-kg), share the invite link, and everyone\'s sets appear live. Duels are weekly challenges against a friend that advance automatically from workouts you actually finish.',
    route: '/social',
  },
  {
    id: 'garmin',
    title: 'Garmin and health data',
    keywords: ['garmin', 'watch', 'health connect', 'sleep', 'steps', 'readiness', 'hrv', 'sync'],
    answer:
      'In the installed Android app, ForgeOS reads Health Connect, which Garmin syncs into. It re-syncs every 6 hours even when closed and sends one morning readiness notification. Readiness combines sleep, resting heart rate and recent load into a score that adjusts training guidance.',
    route: '/health',
  },
  {
    id: 'progress',
    title: 'Progress, charts and history',
    keywords: ['progress', 'chart', 'graph', 'weight trend', 'history', 'photos', 'measurements', 'calendar'],
    answer:
      'Profile → Progress for weight trend, body measurements and progress photos; History for every session and per-lift e1RM charts; Calendar for the volume heatmap. Quests holds the PR timeline and XP curve.',
    route: '/progress',
  },
  {
    id: 'design',
    title: 'Changing how the app looks',
    keywords: ['theme', 'design', 'dark', 'light', 'look', 'colour', 'color', 'appearance', 'language', 'slovak'],
    answer:
      'Profile → App design switches the whole visual language (Classic, Nova, Bolt, or the V2 · Tempo preview), and Theme changes colours (about 15, some rank-locked). Language switches between English and Slovak in the same place.',
    route: '/profile',
  },
  {
    id: 'offline',
    title: 'Offline, backups and the APK',
    keywords: ['offline', 'backup', 'sync', 'export', 'import', 'apk', 'install', 'update', 'data'],
    answer:
      'Everything is stored on your device first, so the app works with no signal and syncs when it can. Profile has backup/export, import from other apps, and cloud sync when signed in. The Android app updates its web layer silently; the rare core update is a one-tap install from inside the app.',
    route: '/download',
  },
];

// Words that carry no topic at all. Without this list, "WHAT is the capital of
// France" scores against the keyword "what to eat" and the manual answers a
// geography question with a recipe.
const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'why', 'how', 'the', 'and', 'for', 'with', 'this', 'that', 'you', 'your',
  'can', 'does', 'did', 'has', 'have', 'are', 'was', 'about', 'from', 'into', 'get', 'got', 'not', '但', 'should',
]);

const words = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const hasWholeWord = (haystackWords: string[], word: string) => haystackWords.includes(word);

/**
 * Keyword scoring on whole words. Substring matching was the first version and
 * it was wrong twice over: "work" matched "workout", and stop-words matched
 * everything — so a question about the streak came back about starting a session.
 */
export function searchHelp(question: string, limit = 3): HelpEntry[] {
  const qWords = words(question);
  const q = question.toLowerCase();

  const scored = APP_HELP.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (kw.includes(' ')) {
        if (q.includes(kw)) score += 5; // an exact phrase is the strongest signal
        continue;
      }
      if (hasWholeWord(qWords, kw)) {
        score += 3;
        continue;
      }
      // A meaningful query word appearing as a whole word inside a keyword.
      const kwWords = words(kw);
      if (qWords.some((w) => w.length > 3 && !STOP_WORDS.has(w) && hasWholeWord(kwWords, w))) score += 1;
    }
    if (q.includes(entry.title.toLowerCase())) score += 4;
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

/** The slice of the manual that goes into a prompt, kept small on purpose. */
export function helpContext(question: string): string {
  const hits = searchHelp(question);
  if (!hits.length) return '';
  return hits.map((h) => `- ${h.title}: ${h.answer}`).join('\n');
}
