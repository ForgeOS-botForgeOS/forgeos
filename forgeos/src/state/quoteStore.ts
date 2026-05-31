import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tracks unlocked quotes (your collection), favourites, and claimed milestones.
interface QuoteState {
  collected: string[];
  collectedAt: Record<string, string>;
  favourites: string[];
  claimedMilestones: number[];
  collect: (id: string) => void;
  has: (id: string) => boolean;
  toggleFav: (id: string) => void;
  isFav: (id: string) => boolean;
  claimMilestone: (n: number) => void;
}

export const MILESTONES = [10, 25, 50, 100, 150, 200];

export const useQuotes = create<QuoteState>()(
  persist(
    (set, get) => ({
      collected: [],
      collectedAt: {},
      favourites: [],
      claimedMilestones: [],
      collect: (id) => {
        if (get().collected.includes(id)) return;
        set({
          collected: [...get().collected, id],
          collectedAt: { ...get().collectedAt, [id]: new Date().toISOString() },
        });
      },
      has: (id) => get().collected.includes(id),
      toggleFav: (id) =>
        set({
          favourites: get().favourites.includes(id)
            ? get().favourites.filter((x) => x !== id)
            : [...get().favourites, id],
        }),
      isFav: (id) => get().favourites.includes(id),
      claimMilestone: (n) => {
        if (get().claimedMilestones.includes(n)) return;
        set({ claimedMilestones: [...get().claimedMilestones, n] });
      },
    }),
    { name: 'forge-quotes' },
  ),
);
