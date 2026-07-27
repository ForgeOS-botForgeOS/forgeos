import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShoppingItem {
  id: string;
  text: string;
  /** How many recipes asked for it. */
  count: number;
  checked: boolean;
}

interface CookbookState {
  favourites: string[]; // recipe ids
  /** recipe id -> times you have cooked it (tapped "cooked this"). */
  cooked: Record<string, number>;
  shopping: ShoppingItem[];
  toggleFavourite: (recipeId: string) => void;
  isFavourite: (recipeId: string) => boolean;
  markCooked: (recipeId: string) => void;
  /** Merge ingredients into the list, bumping the count of anything already on it. */
  addToShopping: (lines: { text: string; count: number }[]) => number;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearChecked: () => void;
  clearShopping: () => void;
}

const key = (text: string) => text.trim().toLowerCase();

export const useCookbook = create<CookbookState>()(
  persist(
    (set, get) => ({
      favourites: [],
      cooked: {},
      shopping: [],

      toggleFavourite: (recipeId) =>
        set({
          favourites: get().favourites.includes(recipeId)
            ? get().favourites.filter((id) => id !== recipeId)
            : [...get().favourites, recipeId],
        }),
      isFavourite: (recipeId) => get().favourites.includes(recipeId),

      markCooked: (recipeId) =>
        set({ cooked: { ...get().cooked, [recipeId]: (get().cooked[recipeId] ?? 0) + 1 } }),

      // Returns how many NEW lines were added, so the UI can say what happened.
      addToShopping: (lines) => {
        const existing = get().shopping;
        const byKey = new Map(existing.map((i) => [key(i.text), i]));
        let added = 0;
        for (const line of lines) {
          const k = key(line.text);
          const hit = byKey.get(k);
          if (hit) {
            byKey.set(k, { ...hit, count: hit.count + line.count, checked: false });
          } else {
            added += 1;
            byKey.set(k, { id: k, text: line.text.trim(), count: line.count, checked: false });
          }
        }
        set({ shopping: [...byKey.values()].sort((a, b) => a.text.localeCompare(b.text)) });
        return added;
      },

      toggleShoppingItem: (id) =>
        set({ shopping: get().shopping.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) }),
      removeShoppingItem: (id) => set({ shopping: get().shopping.filter((i) => i.id !== id) }),
      clearChecked: () => set({ shopping: get().shopping.filter((i) => !i.checked) }),
      clearShopping: () => set({ shopping: [] }),
    }),
    { name: 'forge-cookbook' },
  ),
);
