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

  // ---- Expanded vault (50) ----
  // Squat
  { theme: 'squat', text: 'The man who fears the bottom of the squat fears the bottom of himself. You went down and came back wiser.', source: 'Stoic Iron' },
  { theme: 'squat', text: 'Legs are forged where the lungs beg to stop. Today you negotiated with neither.', source: 'The Anvil' },
  { theme: 'squat', text: 'A heavy squat is a private war with the easiest version of you. You won the rematch.', source: 'Iron Wisdom' },
  { theme: 'squat', text: 'Stand up. That is the oldest command in strength, and the hardest to obey under real weight.', source: 'On the Squat' },
  { theme: 'squat', text: 'The spine learns courage one plate at a time. Yours just took a lesson.', source: 'The Forge' },
  { theme: 'squat', text: 'Depth is humility; the drive up is defiance. Strength is both, in that order.', source: 'Strength Maxim' },
  { theme: 'squat', text: 'They count your reps. The bar counts your character.', source: 'Stoic Iron' },

  // Bench
  { theme: 'bench', text: 'The bar comes to the chest to ask one question. Today your answer was: not yet, not today, not ever.', source: 'On the Bench' },
  { theme: 'bench', text: 'Press the floor away through the bar. The strong move the world by first refusing to be moved.', source: 'The Anvil' },
  { theme: 'bench', text: 'There is a man under every heavy bench who wants to quit. You have not met him in a while.', source: 'Iron Wisdom' },
  { theme: 'bench', text: 'Tightness is the secret nobody applauds. You braced, and the weight obeyed.', source: 'The Forge' },
  { theme: 'bench', text: 'A pause at the chest is patience under pressure — the rarest strength of all.', source: 'Strength Maxim' },
  { theme: 'bench', text: 'The press rewards the calm. Panic adds no kilos.', source: 'Stoic Iron' },
  { theme: 'bench', text: 'Lock it out and the doubt locks out with it.', source: 'On the Bench' },

  // Deadlift
  { theme: 'deadlift', text: 'The floor offers no excuses and accepts none. You met it on its own terms and walked away taller.', source: 'On the Deadlift' },
  { theme: 'deadlift', text: 'A deadlift is a decision made with the whole body. Indecision is the only thing that drops the bar.', source: 'The Anvil' },
  { theme: 'deadlift', text: 'Set your back like a man setting his mind. Then nothing on the ground stays on the ground.', source: 'Iron Wisdom' },
  { theme: 'deadlift', text: 'Heavy pulls do not build the body alone — they build the man who refuses to let go.', source: 'The Forge' },
  { theme: 'deadlift', text: 'Breath in, brace down, will up. The deadlift is a prayer answered by effort.', source: 'Strength Maxim' },
  { theme: 'deadlift', text: 'What is heavy today is a warm-up for who you are becoming.', source: 'Stoic Iron' },
  { theme: 'deadlift', text: 'The bar left the floor because you decided it would. That is power before it is muscle.', source: 'On the Deadlift' },

  // Press
  { theme: 'press', text: 'Overhead is the loneliest place in the gym — just you, the bar, and the sky you intend to push.', source: 'On the Press' },
  { theme: 'press', text: 'A locked-out press is a small monument: built fast, earned slowly.', source: 'The Anvil' },
  { theme: 'press', text: 'The shoulders carry what the heart commits to. Today the order was clear.', source: 'Iron Wisdom' },
  { theme: 'press', text: 'Press as if raising your own standard — because you are.', source: 'The Forge' },
  { theme: 'press', text: 'Nothing built overhead was built by a man looking down.', source: 'Strength Maxim' },
  { theme: 'press', text: 'The overhead lift cannot be cheated with momentum of the soul. Only honest force goes up.', source: 'Stoic Iron' },

  // Pull
  { theme: 'pull', text: 'The back is a debt repaid in private — no mirror, no applause, just iron drawn home.', source: 'On the Pull' },
  { theme: 'pull', text: 'Pull until the weak grip fails and the strong will continues. That gap is where you grow.', source: 'The Anvil' },
  { theme: 'pull', text: 'Every heavy row is a small act of taking back ground you once gave to comfort.', source: 'Iron Wisdom' },
  { theme: 'pull', text: 'A strong pull is humility in motion: you bow to the weight, then bring it to heel.', source: 'The Forge' },
  { theme: 'pull', text: 'Lats like wings are earned by men who never expected to fly — only to pull.', source: 'Strength Maxim' },
  { theme: 'pull', text: 'Draw the bar to your will. The body follows what the grip refuses to release.', source: 'Stoic Iron' },

  // Olympic
  { theme: 'olympic', text: 'In the split second under a snatch, hesitation weighs more than the bar.', source: 'On the Lifts' },
  { theme: 'olympic', text: 'The clean is faith in fast-forward: you commit before you can be sure, and the bar rewards the brave.', source: 'The Anvil' },
  { theme: 'olympic', text: 'Speed is strength that learned to dance. Today you led.', source: 'Iron Wisdom' },
  { theme: 'olympic', text: 'To catch a heavy bar is to trust the thousand reps that no one saw.', source: 'The Forge' },
  { theme: 'olympic', text: 'The jerk is decided overhead, in the silence before the legs believe.', source: 'Strength Maxim' },

  // General
  { theme: 'general', text: 'Comfort is a soft prison. Today you bent a bar of its bars.', source: 'Stoic Iron' },
  { theme: 'general', text: 'The weight you fear is a teacher in disguise. You just passed the lesson.', source: 'Iron Wisdom' },
  { theme: 'general', text: 'Discipline is choosing what you want most over what you want now. The iron remembers your choice.', source: 'The Forge' },
  { theme: 'general', text: 'Nobody is coming to lift it for you. Nobody needs to — you are enough.', source: 'Strength Maxim' },
  { theme: 'general', text: 'Motivation got you to the gym. Will got the bar off the ground. Know the difference; honour the second.', source: 'The Anvil' },
  { theme: 'general', text: 'You did not rise to the level of your hopes today. You fell to the level of your training — and it held.', source: 'Stoic Iron' },
  { theme: 'general', text: 'Iron does not lie, flatter, or forgive. It simply reveals. Today it revealed someone strong.', source: 'Iron Wisdom' },
  { theme: 'general', text: 'Pain is the toll on the road to strong. You paid it without complaint.', source: 'The Forge' },
  { theme: 'general', text: 'The body achieves what the mind survives. Yours survived plenty.', source: 'Strength Maxim' },
  { theme: 'general', text: 'A heavy day is a conversation with your future self. Today you told him: I did not quit.', source: 'The Anvil' },
  { theme: 'general', text: 'Strength is quiet on the way up and loud for a lifetime after.', source: 'Stoic Iron' },
  { theme: 'general', text: 'Greatness is just ordinary effort repeated when no one is impressed yet. Keep going.', source: 'Iron Wisdom' },
];

export function pickHeavyQuote(ex: Exercise | undefined): HeavyQuote {
  const theme = themeFor(ex);
  const pool = QUOTES.filter((q) => q.theme === theme);
  const fallback = QUOTES.filter((q) => q.theme === 'general');
  const list = pool.length ? [...pool, ...fallback] : fallback;
  return list[Math.floor(Math.random() * list.length)];
}
