import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tracks which quotes you've unlocked via the daily popup — your collection.
interface QuoteState {
  collected: string[];
  collectedAt: Record<string, string>; // quoteId -> ISO date first seen
  collect: (id: string) => void;
  has: (id: string) => boolean;
}

export const useQuotes = create<QuoteState>()(
  persist(
    (set, get) => ({
      collected: [],
      collectedAt: {},
      collect: (id) => {
        if (get().collected.includes(id)) return;
        set({
          collected: [...get().collected, id],
          collectedAt: { ...get().collectedAt, [id]: new Date().toISOString() },
        });
      },
      has: (id) => get().collected.includes(id),
    }),
    { name: 'forge-quotes' },
  ),
);
