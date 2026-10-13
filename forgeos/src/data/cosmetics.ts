export type CosmeticType = 'title' | 'frame' | 'badge' | 'confetti' | 'theme';

export interface Cosmetic {
  id: string;
  name: string;
  type: CosmeticType;
  price: number;
  /** title text · CSS colour/gradient (frame) · ThemeId (theme) · one emoji
   *  shown next to your name (badge) · comma-separated emoji (confetti). */
  value: string;
  /** Achievement-only: never for sale, no matter how many coins you have. */
  exclusive?: true;
  /** What you have to do to earn it (shown in the shop while it's locked). */
  earnedBy?: string;
}

export const COSMETICS: Cosmetic[] = [
  // Titles (shown under your name)
  { id: 't-forged', name: 'The Forged', type: 'title', price: 50, value: 'The Forged' },
  { id: 't-disciple', name: 'Iron Disciple', type: 'title', price: 80, value: 'Iron Disciple' },
  { id: 't-beast', name: 'Beast Mode', type: 'title', price: 120, value: 'Beast Mode' },
  { id: 't-zen', name: 'Zen Warrior', type: 'title', price: 120, value: 'Zen Warrior' },
  { id: 't-relentless', name: 'Relentless', type: 'title', price: 160, value: 'Relentless' },
  { id: 't-unbroken', name: 'Unbroken', type: 'title', price: 200, value: 'Unbroken' },
  { id: 't-ironwill', name: 'Iron Will', type: 'title', price: 220, value: 'Iron Will' },
  { id: 't-strongman', name: 'The Strongman', type: 'title', price: 300, value: 'The Strongman' },
  { id: 't-apex', name: 'Apex Predator', type: 'title', price: 450, value: 'Apex Predator' },
  { id: 't-immortal', name: 'Immortal', type: 'title', price: 700, value: 'Immortal' },
  // The fun ones
  { id: 't-gymrat', name: 'Certified Gym Rat', type: 'title', price: 60, value: 'Certified Gym Rat' },
  { id: 't-legday', name: 'Leg Day Survivor', type: 'title', price: 90, value: 'Leg Day Survivor' },
  { id: 't-goblin', name: 'Protein Goblin', type: 'title', price: 90, value: 'Protein Goblin' },
  { id: 't-chalk', name: 'Chalk Wizard', type: 'title', price: 110, value: 'Chalk Wizard' },
  { id: 't-whisperer', name: 'Plate Whisperer', type: 'title', price: 110, value: 'Plate Whisperer' },
  { id: 't-cardio', name: 'Cardio Enjoyer (Allegedly)', type: 'title', price: 120, value: 'Cardio Enjoyer (Allegedly)' },
  { id: 't-rebel', name: 'Rest Timer Rebel', type: 'title', price: 130, value: 'Rest Timer Rebel' },
  { id: 't-spotter', name: 'Spotter of the Year', type: 'title', price: 140, value: 'Spotter of the Year' },
  { id: 't-mirror', name: 'Mirror Flexer', type: 'title', price: 150, value: 'Mirror Flexer' },
  { id: 't-sleep', name: 'Sleep Champion', type: 'title', price: 160, value: 'Sleep Champion' },
  { id: 't-bard', name: 'The Barbell Bard', type: 'title', price: 180, value: 'The Barbell Bard' },
  { id: 't-philosopher', name: 'Iron Philosopher', type: 'title', price: 240, value: 'Iron Philosopher' },
  { id: 't-dragon', name: 'Deadlift Dragon', type: 'title', price: 260, value: 'Deadlift Dragon' },
  { id: 't-finalboss', name: 'Final Boss', type: 'title', price: 900, value: 'Final Boss' },
  // Avatar frames (ring colour around your avatar)
  { id: 'f-gold', name: 'Gold Frame', type: 'frame', price: 100, value: '#ffd24a' },
  { id: 'f-crimson', name: 'Crimson Frame', type: 'frame', price: 100, value: '#ef4444' },
  { id: 'f-cyan', name: 'Cyan Frame', type: 'frame', price: 100, value: '#38bdf8' },
  { id: 'f-violet', name: 'Violet Frame', type: 'frame', price: 150, value: '#a855f7' },
  { id: 'f-emerald', name: 'Emerald Frame', type: 'frame', price: 150, value: '#10b981' },
  { id: 'f-rosegold', name: 'Rose Gold Frame', type: 'frame', price: 180, value: 'linear-gradient(90deg,#f9a8d4,#fbbf24)' },
  { id: 'f-rainbow', name: 'Prismatic Frame', type: 'frame', price: 400, value: 'linear-gradient(90deg,#ff5c35,#ffd24a,#38bdf8,#a855f7)' },
  { id: 'f-molten', name: 'Molten Frame', type: 'frame', price: 500, value: 'linear-gradient(90deg,#ff5c35,#ff0000,#ffd24a)' },
  { id: 'f-ice', name: 'Ice Frame', type: 'frame', price: 150, value: 'linear-gradient(90deg,#e0f2fe,#7dd3fc,#e0f2fe)' },
  { id: 'f-toxic', name: 'Toxic Frame', type: 'frame', price: 200, value: 'linear-gradient(90deg,#365314,#a3e635,#365314)' },
  { id: 'f-sunset', name: 'Sunset Frame', type: 'frame', price: 220, value: 'linear-gradient(90deg,#f97316,#ec4899,#8b5cf6)' },
  { id: 'f-ocean', name: 'Deep Ocean Frame', type: 'frame', price: 260, value: 'linear-gradient(90deg,#0c4a6e,#06b6d4,#0c4a6e)' },
  { id: 'f-galaxy', name: 'Galaxy Frame', type: 'frame', price: 450, value: 'linear-gradient(90deg,#1e1b4b,#7c3aed,#ec4899,#1e1b4b)' },
  // Badges (one emoji next to your name)
  { id: 'b-egg', name: 'Egg', type: 'badge', price: 40, value: '🥚' },
  { id: 'b-drumstick', name: 'Drumstick', type: 'badge', price: 60, value: '🍗' },
  { id: 'b-turtle', name: 'Slow & Steady', type: 'badge', price: 70, value: '🐢' },
  { id: 'b-silverback', name: 'Silverback', type: 'badge', price: 80, value: '🦍' },
  { id: 'b-owl', name: 'Night Owl', type: 'badge', price: 90, value: '🦉' },
  { id: 'b-fire', name: 'On Fire', type: 'badge', price: 100, value: '🔥' },
  { id: 'b-ice', name: 'Ice Cold', type: 'badge', price: 100, value: '🧊' },
  { id: 'b-bolt', name: 'Voltage', type: 'badge', price: 120, value: '⚡' },
  { id: 'b-arm', name: 'Bionic Arm', type: 'badge', price: 120, value: '🦾' },
  { id: 'b-shark', name: 'Shark', type: 'badge', price: 150, value: '🦈' },
  { id: 'b-dragon', name: 'Dragon', type: 'badge', price: 250, value: '🐉' },
  { id: 'b-goat', name: 'The GOAT', type: 'badge', price: 300, value: '🐐' },
  { id: 'b-crown', name: 'Crown', type: 'badge', price: 500, value: '👑' },
  // Confetti (what rains down on every celebration: PRs, rank-ups, claims)
  { id: 'c-hearts', name: 'Love the Grind', type: 'confetti', price: 120, value: '❤️,💖' },
  { id: 'c-stars', name: 'Starfall', type: 'confetti', price: 120, value: '⭐,✨' },
  { id: 'c-flames', name: 'Flames', type: 'confetti', price: 150, value: '🔥,💥' },
  { id: 'c-flex', name: 'Flex Storm', type: 'confetti', price: 150, value: '💪,🦾' },
  { id: 'c-cheat', name: 'Cheat Meal', type: 'confetti', price: 180, value: '🍕,🍔,🍩' },
  { id: 'c-plates', name: 'Plate Rain', type: 'confetti', price: 200, value: '🏋️,⚪,⚫' },
  { id: 'c-coins', name: 'Coin Shower', type: 'confetti', price: 250, value: '🪙,💰' },
  { id: 'c-dragon', name: 'Dragon Fire', type: 'confetti', price: 350, value: '🐉,🔥,💥' },
  // Themes (buy with coins instead of grinding rank) — value = ThemeId
  { id: 'theme-emerald-forge', name: 'Emerald Forge', type: 'theme', price: 250, value: 'emerald-forge' },
  { id: 'theme-cyber-lime', name: 'Cyber Lime', type: 'theme', price: 250, value: 'cyber-lime' },
  { id: 'theme-obsidian-platinum', name: 'Obsidian Platinum', type: 'theme', price: 350, value: 'obsidian-platinum' },
  { id: 'theme-royal-amethyst', name: 'Royal Amethyst', type: 'theme', price: 350, value: 'royal-amethyst' },
  { id: 'theme-synthwave', name: 'Synthwave', type: 'theme', price: 500, value: 'synthwave' },
  { id: 'theme-blood-moon', name: 'Blood Moon', type: 'theme', price: 500, value: 'blood-moon' },
  { id: 'theme-solar-flare', name: 'Solar Flare', type: 'theme', price: 750, value: 'solar-flare' },
];

// ---- Achievement-only rewards ----
// The point of these: coins can be farmed, these cannot. Each one is bound to a
// single legendary achievement (see data/achievements.ts `cosmeticId`), so
// wearing it says exactly what you did. Price 0 + `exclusive` keeps the shop
// from ever selling them.
export const EXCLUSIVE_COSMETICS: Cosmetic[] = [
  { id: 'x-title-unbreakable', name: 'Unbreakable Will', type: 'title', price: 0, value: 'Unbreakable Will', exclusive: true, earnedBy: '100-day streak' },
  { id: 'x-title-yearofiron', name: 'Year of Iron', type: 'title', price: 0, value: 'Year of Iron', exclusive: true, earnedBy: '365 workouts' },
  { id: 'x-title-tectonic', name: 'Tectonic', type: 'title', price: 0, value: 'Tectonic', exclusive: true, earnedBy: '2,500,000 kg lifted' },
  { id: 'x-frame-ironmountain', name: 'Iron Mountain Frame', type: 'frame', price: 0, value: 'linear-gradient(90deg,#6b7280,#d1d5db,#6b7280)', exclusive: true, earnedBy: '1,000,000 kg lifted' },
  { id: 'x-frame-titan', name: 'Titan Frame', type: 'frame', price: 0, value: 'linear-gradient(90deg,#92400e,#f59e0b,#92400e)', exclusive: true, earnedBy: '250 sets at 100 kg+' },
  { id: 'x-frame-laurel', name: 'Laurel Frame', type: 'frame', price: 0, value: 'linear-gradient(90deg,#14532d,#4ade80,#14532d)', exclusive: true, earnedBy: 'Complete Athlete' },
  { id: 'x-theme-champions-forge', name: 'Champion’s Forge', type: 'theme', price: 0, value: 'champions-forge', exclusive: true, earnedBy: 'the highest rank' },
];

export const ALL_COSMETICS: Cosmetic[] = [...COSMETICS, ...EXCLUSIVE_COSMETICS];

export const cosmeticById = (id: string) => ALL_COSMETICS.find((c) => c.id === id);
