import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeedPost } from '../types';
import { MOCK_FEED } from '../lib/mockData';

const uid = () => Math.random().toString(36).slice(2, 10);

interface SocialState {
  feed: FeedPost[];
  ownedRoutineIds: string[];
  react: (postId: string, emoji: string) => void;
  publishPost: (body: string, summary?: FeedPost['workoutSummary']) => void;
  buyRoutine: (id: string) => void;
  seedIfEmpty: () => void;
}

export const useSocial = create<SocialState>()(
  persist(
    (set, get) => ({
      feed: [],
      ownedRoutineIds: [],

      seedIfEmpty: () => {
        if (get().feed.length === 0) set({ feed: MOCK_FEED });
      },

      react: (postId, emoji) => {
        set({
          feed: get().feed.map((p) => {
            if (p.id !== postId) return p;
            const reactions = { ...p.reactions };
            // Toggle: remove previous reaction, add new.
            if (p.myReaction) reactions[p.myReaction] = Math.max(0, (reactions[p.myReaction] ?? 1) - 1);
            if (p.myReaction === emoji) return { ...p, reactions, myReaction: undefined };
            reactions[emoji] = (reactions[emoji] ?? 0) + 1;
            return { ...p, reactions, myReaction: emoji };
          }),
        });
      },

      publishPost: (body, summary) => {
        const post: FeedPost = {
          id: uid(),
          authorId: 'me',
          authorName: 'You',
          avatarSeed: 'ME',
          body,
          workoutSummary: summary,
          createdAt: new Date().toISOString(),
          reactions: {},
        };
        set({ feed: [post, ...get().feed] });
      },

      buyRoutine: (id) => {
        if (get().ownedRoutineIds.includes(id)) return;
        set({ ownedRoutineIds: [...get().ownedRoutineIds, id] });
      },
    }),
    { name: 'forge-social' },
  ),
);
