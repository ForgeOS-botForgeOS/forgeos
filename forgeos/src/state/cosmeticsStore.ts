import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CosmeticsState {
  owned: string[];
  equippedTitle: string | null; // cosmetic id
  equippedFrame: string | null; // cosmetic id
  equippedBadge: string | null; // cosmetic id
  equippedConfetti: string | null; // cosmetic id; null = the classic colours
  own: (id: string) => void;
  equipTitle: (id: string | null) => void;
  equipFrame: (id: string | null) => void;
  equipBadge: (id: string | null) => void;
  equipConfetti: (id: string | null) => void;
}

export const useCosmetics = create<CosmeticsState>()(
  persist(
    (set, get) => ({
      owned: [],
      equippedTitle: null,
      equippedFrame: null,
      equippedBadge: null,
      equippedConfetti: null,
      own: (id) => {
        if (!get().owned.includes(id)) set({ owned: [...get().owned, id] });
      },
      equipTitle: (id) => set({ equippedTitle: id }),
      equipFrame: (id) => set({ equippedFrame: id }),
      equipBadge: (id) => set({ equippedBadge: id }),
      equipConfetti: (id) => set({ equippedConfetti: id }),
    }),
    { name: 'forge-cosmetics' },
  ),
);
