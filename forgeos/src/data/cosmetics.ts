export interface Cosmetic {
  id: string;
  name: string;
  type: 'title' | 'frame' | 'theme';
  price: number;
  value: string; // title text, CSS colour/gradient for frames, or ThemeId for themes
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
  // Avatar frames (ring colour around your avatar)
  { id: 'f-gold', name: 'Gold Frame', type: 'frame', price: 100, value: '#ffd24a' },
  { id: 'f-crimson', name: 'Crimson Frame', type: 'frame', price: 100, value: '#ef4444' },
  { id: 'f-cyan', name: 'Cyan Frame', type: 'frame', price: 100, value: '#38bdf8' },
  { id: 'f-violet', name: 'Violet Frame', type: 'frame', price: 150, value: '#a855f7' },
  { id: 'f-emerald', name: 'Emerald Frame', type: 'frame', price: 150, value: '#10b981' },
  { id: 'f-rosegold', name: 'Rose Gold Frame', type: 'frame', price: 180, value: 'linear-gradient(90deg,#f9a8d4,#fbbf24)' },
  { id: 'f-rainbow', name: 'Prismatic Frame', type: 'frame', price: 400, value: 'linear-gradient(90deg,#ff5c35,#ffd24a,#38bdf8,#a855f7)' },
  { id: 'f-molten', name: 'Molten Frame', type: 'frame', price: 500, value: 'linear-gradient(90deg,#ff5c35,#ff0000,#ffd24a)' },
  // Themes (buy with coins instead of grinding rank) — value = ThemeId
  { id: 'theme-emerald-forge', name: 'Emerald Forge', type: 'theme', price: 250, value: 'emerald-forge' },
  { id: 'theme-cyber-lime', name: 'Cyber Lime', type: 'theme', price: 250, value: 'cyber-lime' },
  { id: 'theme-obsidian-platinum', name: 'Obsidian Platinum', type: 'theme', price: 350, value: 'obsidian-platinum' },
  { id: 'theme-royal-amethyst', name: 'Royal Amethyst', type: 'theme', price: 350, value: 'royal-amethyst' },
  { id: 'theme-synthwave', name: 'Synthwave', type: 'theme', price: 500, value: 'synthwave' },
  { id: 'theme-blood-moon', name: 'Blood Moon', type: 'theme', price: 500, value: 'blood-moon' },
  { id: 'theme-solar-flare', name: 'Solar Flare', type: 'theme', price: 750, value: 'solar-flare' },
];

export const cosmeticById = (id: string) => COSMETICS.find((c) => c.id === id);
