import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeedPost, Friend } from '../types';
import { MOCK_FEED, MOCK_FRIENDS } from '../lib/mockData';
import { publishPostRemote, reactRemote } from '../lib/repositories';
import { useUser } from './userStore';

const uid = () => Math.random().toString(36).slice(2, 10);

interface SocialState {
  feed: FeedPost[];
  friends: Friend[];
  ownedRoutineIds: string[];
  react: (postId: string, emoji: string) => void;
  publishPost: (body: string, summary?: FeedPost['workoutSummary']) => void;
  buyRoutine: (id: string) => void;
  addFriend: (name: string) => void;
  removeFriend: (id: string) => void;
  seedIfEmpty: () => void;
}

export const useSocial = create<SocialState>()(
  persist(
    (set, get) => ({
      feed: [],
      friends: [],
      ownedRoutineIds: [],

      seedIfEmpty: () => {
        if (get().feed.length === 0) set({ feed: MOCK_FEED });
        if (get().friends.length === 0) set({ friends: MOCK_FRIENDS });
      },

      addFriend: (name) => {
        const clean = name.trim();
        if (!clean) return;
        const seed = clean.slice(0, 2).toUpperCase();
        const friend: Friend = {
          id: uid(),
          name: clean,
          rank: 'Bronze I',
          xp: Math.floor(Math.random() * 1500),
          online: Math.random() > 0.5,
          avatarSeed: seed,
        };
        set({ friends: [friend, ...get().friends] });
      },

      removeFriend: (id) => set({ friends: get().friends.filter((f) => f.id !== id) }),

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
        const me = useUser.getState().profile?.id;
        if (me) void reactRemote(postId, me, emoji); // no-op in mock mode
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
        const me = useUser.getState().profile?.id;
        if (me) void publishPostRemote(me, body, summary); // no-op in mock mode
      },

      buyRoutine: (id) => {
        if (get().ownedRoutineIds.includes(id)) return;
        set({ ownedRoutineIds: [...get().ownedRoutineIds, id] });
      },
    }),
    { name: 'forge-social' },
  ),
);
