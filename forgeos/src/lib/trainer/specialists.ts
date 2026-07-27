// ---- The specialists ----
// One chat window, four specialists behind it. The question decides which one
// answers, and each gets its own brief plus only the context it needs. A
// nutrition question should not be answered in the voice of a strength coach,
// and an "how do I use this app" question should not be answered by either.

export type SpecialistId = 'training' | 'nutrition' | 'recovery' | 'app';

export interface Specialist {
  id: SpecialistId;
  /** Shown as a badge on the reply, so it is obvious who is talking. */
  label: string;
  icon: string;
  brief: string;
  /** Unambiguous domain words — "protein" is only ever a nutrition question. */
  strong: string[];
  /** Words that hint but also show up everywhere ("training", "workout"). */
  keywords: string[];
}

// Rules every specialist inherits. The user is 15, which is the reason for most
// of them — this is the guard rail that survives whatever the model feels like
// doing on a given day.
export const SHARED_RULES = `
Ground rules, without exception:
- You are ForgeOS's in-app trainer. You only cover training, nutrition, recovery and how this app works. Anything else: say so in one sentence and offer what you can help with instead.
- The athlete is a MINOR (under 18). Never suggest an aggressive calorie deficit, a fast weight-loss target, fasting protocols, appetite suppressants, performance-enhancing drugs, or any supplement beyond ordinary food-level amounts. Never estimate body fat or comment on appearance.
- You are not a doctor or a physiotherapist. For pain, injury, illness, medication or anything that sounds medical: say plainly that it needs a real professional, and stop there. Do not diagnose and do not prescribe rehab protocols.
- Use their actual data. Refer to their real numbers, their quiz answers and their recent sessions. Generic advice they could have read anywhere is a failure.
- Metric only: kg, cm, kcal, grams. Never pounds or inches.
- Be brief and concrete. 120 words or fewer unless they ask for detail, no filler, no "as an AI". Give a number or a next action they can take today.
- If you do not know something about the app, say so rather than inventing a screen or a button.
- Never claim a change has been made for them — you can only advise; they tap the buttons.
`.trim();

export const SPECIALISTS: Record<SpecialistId, Specialist> = {
  training: {
    id: 'training',
    label: 'Strength coach',
    icon: '🏋️',
    strong: [
      'sets', 'reps', 'rpe', 'squat', 'squats', 'bench', 'deadlift', 'overhead press', 'plateau', 'stalled', 'stall',
      'progressive overload', 'hypertrophy', '1rm', 'e1rm', 'deload', 'technique', 'form check', 'warm up', 'warmup',
      'programme', 'program', 'split', 'periodisation',
    ],
    keywords: [
      'set', 'rep', 'press', 'row', 'curl', 'lift', 'lifting', 'plan', 'volume', 'form', 'pr', 'strength', 'muscle',
      'cardio', 'run', 'running', 'sprint', 'conditioning', 'exercise', 'workout', 'train', 'training', 'gym', 'heavy',
    ],
    brief:
      'You are a strength and conditioning coach. Programming, exercise selection, loading, progression, plateaus and technique cues are yours. Prefer the smallest change that moves the needle: a load step, a rep target, an exercise swap, a deload. Reference their own recent sessions and best lifts when you justify it.',
  },
  nutrition: {
    id: 'nutrition',
    label: 'Nutrition coach',
    icon: '🥗',
    strong: [
      'eat', 'eating', 'ate', 'protein', 'calorie', 'calories', 'kcal', 'macro', 'macros', 'carbs', 'recipe',
      'recipes', 'meal', 'meals', 'breakfast', 'lunch', 'dinner', 'snack', 'diet', 'deficit', 'surplus',
      'lose weight', 'gain weight', 'weight loss', 'hydration', 'creatine', 'supplement', 'vitamin', 'whey', 'shake',
    ],
    keywords: [
      'food', 'carb', 'fat', 'cook', 'bulk', 'cut', 'cutting', 'water', 'sugar', 'vegan', 'vegetarian', 'fibre',
      'fiber', 'portion', 'hungry',
    ],
    brief:
      'You are a sports-nutrition coach. Calories, macros, meal timing, practical food choices and hydration are yours. Work from their targets and what they have actually logged today. Suggest real dishes from the app cookbook by name where it fits. Food first, supplements last, and never anything a 15-year-old should not take.',
  },
  recovery: {
    id: 'recovery',
    label: 'Recovery coach',
    icon: '😴',
    strong: [
      'sleep', 'slept', 'tired', 'exhausted', 'wrecked', 'drained', 'fatigue', 'fatigued', 'recovery', 'recover',
      'sore', 'soreness', 'doms', 'readiness', 'hrv', 'overtraining', 'overtrained', 'burnout', 'burnt out',
      'rest day', 'day off', 'deloading', 'no energy',
    ],
    keywords: ['rest', 'stress', 'stretch', 'mobility', 'stiff', 'flat', 'nap'],
    brief:
      'You are a recovery coach. Sleep, fatigue management, readiness, soreness, rest days and load balance are yours. Use their sleep average, readiness score and recent training load. Soreness is normal and gets practical advice; pain, swelling or anything that feels like an injury goes to a professional.',
  },
  app: {
    id: 'app',
    label: 'App guide',
    icon: '📱',
    strong: [
      'achievement', 'achievements', 'xp', 'coin', 'coins', 'streak', 'theme', 'themes', 'cosmetic', 'shopping list',
      'focus mode', 'barcode', 'cookbook', 'garmin', 'health connect', 'race', 'duel', 'backup', 'export', 'import',
      'apk', 'notification', 'notifications', 'setting', 'settings', 'app design', 'rank',
    ],
    keywords: ['app', 'button', 'screen', 'tab', 'feature', 'design', 'language', 'sync', 'friend', 'shop', 'install', 'update', 'scanner'],
    brief:
      'You are the app guide. Answer using the ForgeOS manual excerpts provided — where to tap, what a feature does, how a system works. Name the tab and the button. If the manual does not cover it, say you are not sure rather than inventing a screen.',
  },
};

export const SPECIALIST_LIST = Object.values(SPECIALISTS);

/**
 * Route a question to a specialist by weighted keyword hits. Ties break toward
 * the app guide for "how do I…" phrasing and toward training otherwise, because
 * that is what people ask most.
 */
export function pickSpecialist(question: string): SpecialistId {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const score: Record<SpecialistId, number> = { training: 0, nutrition: 0, recovery: 0, app: 0 };

  // Weighting matters more than the word list: "what should I eat before
  // training" contains both "eat" and "training", and it is a food question.
  // Unambiguous words score 4, words that appear in every gym question score 1.
  for (const s of SPECIALIST_LIST) {
    for (const kw of s.strong) score[s.id] += q.includes(` ${kw} `) ? (kw.includes(' ') ? 5 : 4) : 0;
    for (const kw of s.keywords) score[s.id] += q.includes(` ${kw} `) ? 1 : 0;
  }

  // "How do I / where is / how does" is nearly always about the app itself.
  if (/\b(how do i|how can i|where is|where do i|how does the app|what does this)\b/.test(q)) score.app += 4;

  const best = (Object.entries(score) as [SpecialistId, number][]).sort((a, b) => b[1] - a[1]);
  if (best[0][1] === 0) return 'training';
  return best[0][0];
}

/** The full system prompt: who you are + the rules + their data + app manual. */
export function buildSystemPrompt(opts: {
  specialist: SpecialistId;
  userContext: string;
  helpContext?: string;
  language: string;
}): string {
  const s = SPECIALISTS[opts.specialist];
  const parts = [
    `You are the ${s.label} inside ForgeOS, a fitness app the athlete uses every day.`,
    s.brief,
    SHARED_RULES,
    opts.language === 'sk'
      ? 'Reply in Slovak, because the app is set to Slovak. Keep exercise names and units clear.'
      : 'Reply in English.',
    opts.userContext,
  ];
  if (opts.helpContext) {
    parts.push(`## ForgeOS manual (use this for app questions, do not contradict it)\n${opts.helpContext}`);
  }
  return parts.join('\n\n');
}

/** Opening suggestions — different per specialist so the chat is never a blank box. */
export const STARTERS: { specialist: SpecialistId; question: string }[] = [
  { specialist: 'training', question: 'Look at my last few sessions — what should I change this week?' },
  { specialist: 'nutrition', question: 'Am I eating enough protein for my goal?' },
  { specialist: 'training', question: 'My bench has stalled. What now?' },
  { specialist: 'recovery', question: 'I feel wrecked. Should I train today or rest?' },
  { specialist: 'nutrition', question: 'Give me a cheap high-protein dinner I can cook tonight.' },
  { specialist: 'app', question: 'How do achievement rewards work?' },
  { specialist: 'training', question: 'Is my week plan balanced for my goal?' },
  { specialist: 'app', question: 'How do I start a race with a friend?' },
];
