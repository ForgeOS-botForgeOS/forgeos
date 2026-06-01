export interface Cosmetic {
  id: string;
  name: string;
  type: 'title' | 'frame';
  price: number;
  value: string; // title text, or CSS color/gradient for frames
}

export const COSMETICS: Cosmetic[] = [
  // Titles (shown under your name)
  { id: 't-forged', name: 'The Forged', type: 'title', price: 50, value: 'The Forged' },
  { id: 't-disciple', name: 'Iron Disciple', type: 'title', price: 80, value: 'Iron Disciple' },
  { id: 't-beast', name: 'Beast Mode', type: 'title', price: 120, value: 'Beast Mode' },
  { id: 't-zen', name: 'Zen Warrior', type: 'title', price: 120, value: 'Zen Warrior' },
  { id: 't-unbroken', name: 'Unbroken', type: 'title', price: 200, value: 'Unbroken' },
  { id: 't-strongman', name: 'The Strongman', type: 'title', price: 300, value: 'The Strongman' },
  // Avatar frames (ring colour around your avatar)
  { id: 'f-gold', name: 'Gold Frame', type: 'frame', price: 100, value: '#ffd24a' },
  { id: 'f-crimson', name: 'Crimson Frame', type: 'frame', price: 100, value: '#ef4444' },
  { id: 'f-cyan', name: 'Cyan Frame', type: 'frame', price: 100, value: '#38bdf8' },
  { id: 'f-violet', name: 'Violet Frame', type: 'frame', price: 150, value: '#a855f7' },
  { id: 'f-emerald', name: 'Emerald Frame', type: 'frame', price: 150, value: '#10b981' },
  { id: 'f-rainbow', name: 'Prismatic Frame', type: 'frame', price: 400, value: 'linear-gradient(90deg,#ff5c35,#ffd24a,#38bdf8,#a855f7)' },
];

export const cosmeticById = (id: string) => COSMETICS.find((c) => c.id === id);
