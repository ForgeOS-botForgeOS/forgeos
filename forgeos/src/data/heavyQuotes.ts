import type { Exercise } from '../types';

// Deep, exercise-themed quotes that "drop" when you complete a heavy set (≥100kg),
// with a rolled rarity — like a loot drop.
export type Rarity = 'rare' | 'legendary' | 'mythic';
export type LiftTheme = 'squat' | 'bench' | 'deadlift' | 'press' | 'pull' | 'olympic' | 'general';

export interface HeavyQuote {
  theme: LiftTheme;
  text: string;
  source: string;
}

export const RARITY: Record<Rarity, { label: string; color: string; weight: number }> = {
  rare: { label: 'Rare', color: '#38bdf8', weight: 70 },
  legendary: { label: 'Legendary', color: '#ffd24a', weight: 25 },
  mythic: { label: 'Mythic', color: '#a855f7', weight: 5 },
};

export function rollRarity(): Rarity {
  const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
  let n = Math.random() * total;
  for (const [k, r] of Object.entries(RARITY)) {
    if (n < r.weight) return k as Rarity;
    n -= r.weight;
  }
  return 'rare';
}

export function themeFor(ex: Exercise | undefined): LiftTheme {
  if (!ex) return 'general';
  const n = ex.name.toLowerCase();
  if (/squat|leg press|lunge/.test(n)) return 'squat';
  if (/deadlift|rack pull|good morning|hip thrust/.test(n)) return 'deadlift';
  if (/bench|chest|fly|dip/.test(n)) return 'bench';
  if (/overhead|press|snatch.*balance|push press|jerk/.test(n) && /shoulder/.test(ex.primary.toLowerCase())) return 'press';
  if (/row|pulldown|pull-up|pull up|chin|lat/.test(n)) return 'pull';
  if (/clean|snatch|jerk/.test(n)) return 'olympic';
  if (ex.primary === 'Shoulders') return 'press';
  if (ex.primary === 'Back') return 'pull';
  return 'general';
}

const QUOTES: HeavyQuote[] = [
  // Squat
  { theme: 'squat', text: 'The bar bends to the will of the one who refuses to. Under load, you discover what you actually are.', source: 'On the Squat' },
  { theme: 'squat', text: 'Every great lifter has knelt before the bar — and stood back up anyway. That standing up is the whole sport.', source: 'Iron Wisdom' },
  { theme: 'squat', text: 'There is no lie in a heavy squat. It tells you, to the kilo, the truth of your preparation.', source: 'The Forge' },
  { theme: 'squat', text: 'Descend with control, rise with violence. The squat rewards the patient and punishes the proud.', source: 'Strength Maxim' },
  // Bench
  { theme: 'bench', text: 'A hundred kilos on the chest is a quiet conversation with gravity — and today you had the last word.', source: 'On the Bench' },
  { theme: 'bench', text: 'The press is decided in the inch you cannot see — at the chest, where most men give up and the strong drive on.', source: 'Iron Wisdom' },
  { theme: 'bench', text: 'Lower the weight like you respect it. Press it like you own it.', source: 'The Forge' },
  // Deadlift
  { theme: 'deadlift', text: 'The deadlift is honest: there is no momentum, no bounce, no mercy — only you, the floor, and the decision to pull.', source: 'On the Deadlift' },
  { theme: 'deadlift', text: 'To pull a heavy bar from the dead is to refuse the easiest answer in the room: leave it down.', source: 'Iron Wisdom' },
  { theme: 'deadlift', text: 'Grip it as if it owes you something. The earth gives up its weight only to those who insist.', source: 'The Forge' },
  { theme: 'deadlift', text: 'No lift teaches resolve like the one that starts at zero and demands everything.', source: 'Strength Maxim' },
  // Press
  { theme: 'press', text: 'To put weight overhead is to declare the sky is not the limit — it is the destination.', source: 'On the Press' },
  { theme: 'press', text: 'The overhead press humbles the ego and builds the spine. Stand tall; the bar is watching.', source: 'Iron Wisdom' },
  // Pull
  { theme: 'pull', text: 'A strong back is built in silence — rep after rep no one applauds. Today the iron noticed.', source: 'On the Pull' },
  { theme: 'pull', text: 'Pull the weight to you as if reclaiming something stolen. Strength is taken, never given.', source: 'Iron Wisdom' },
  // Olympic
  { theme: 'olympic', text: 'Speed under a heavy bar is courage made visible. You did not lift it — you decided, and the bar obeyed.', source: 'On the Lifts' },
  { theme: 'olympic', text: 'The clean and the snatch are poetry written in milliseconds. Few read it; fewer write it.', source: 'Iron Wisdom' },
  // General
  { theme: 'general', text: 'Heavy is a relative word. Today you moved what last year was impossible — that is the entire point.', source: 'The Forge' },
  { theme: 'general', text: 'Three plates is not a number. It is months of mornings you did not skip.', source: 'Iron Wisdom' },
  { theme: 'general', text: 'The weight does not care about your mood, your excuses, or your past. It only answers to effort.', source: 'Strength Maxim' },
  { theme: 'general', text: 'Strength is the most honest currency: it cannot be borrowed, faked, or inherited. You earned this.', source: 'The Forge' },
];

export function pickHeavyQuote(ex: Exercise | undefined): HeavyQuote {
  const theme = themeFor(ex);
  const pool = QUOTES.filter((q) => q.theme === theme);
  const fallback = QUOTES.filter((q) => q.theme === 'general');
  const list = pool.length ? [...pool, ...fallback] : fallback;
  return list[Math.floor(Math.random() * list.length)];
}
