import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Duel, DuelMetric, FeedComment, FeedPost, Friend, FriendRequest, MarketplaceRoutine, WeekPlan } from '../types';
import { MOCK_FEED, MOCK_FEED_DRIP, MOCK_FRIENDS, MOCK_REQUESTS } from '../lib/mockData';
import { publishPostRemote, reactRemote, fetchFriendsRemote, addFriendByCodeRemote, removeFriendRemote } from '../lib/repositories';
import { isBackendLive } from '../lib/supabase';
import { friendFromInvite, type InvitePayload } from '../lib/invite';
import { useUser } from './userStore';

const uid = () => Math.random().toString(36).slice(2, 10);
const RANKS = ['Bronze I', 'Bronze II', 'Silver I', 'Silver II', 'Gold I', 'Gold II', 'Platinum I'];
const me = () => useUser.getState().profile;
const myName = () => me()?.name ?? 'You';
const mySeed = () => (me()?.name ?? 'You').slice(0, 2).toUpperCase();

export interface PublishOpts {
  summary?: FeedPost['workoutSummary'];
  flex?: FeedPost['flex'];
  imageUrl?: string;
}

interface SocialState {
  feed: FeedPost[];
  friends: Friend[];
  requests: FriendRequest[];
  duels: Duel[];
  ownedRoutineIds: string[];
  publishedRoutines: MarketplaceRoutine[];
  // feed
  react: (postId: string, emoji: string) => void;
  publishPost: (body: string, opts?: PublishOpts) => void;
  addComment: (postId: string, body: string) => void;
  deletePost: (id: string) => void;
  refreshFeed: () => boolean;
  // friends + requests
  addFriend: (name: string) => void;
  sendFriendRequest: (name: string, meta?: Partial<Friend>) => void;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  addFriendByInvite: (p: InvitePayload) => 'added' | 'duplicate' | 'self';
  removeFriend: (id: string) => void;
  // Pull the real friend graph from the backend (no-op without one).
  syncFriends: () => Promise<void>;
  cheerFriend: (id: string) => void;
  // duels
  startDuel: (opponentName: string, opponentAvatar: string, metric: DuelMetric, target: number, days: number) => void;
  advanceDuel: (id: string, mine: number) => void;
  clearDuel: (id: string) => void;
  // marketplace
  buyRoutine: (id: string) => void;
  publishRoutine: (r: { title: string; priceCoins: number; focus: string; plan: WeekPlan; author: string; authorRank: string }) => void;
  seedIfEmpty: () => void;
}

export const useSocial = create<SocialState>()(
  persist(
    (set, get) => ({
      feed: [],
      friends: [],
      requests: [],
      duels: [],
      ownedRoutineIds: [],
      publishedRoutines: [],

      seedIfEmpty: () => {
        if (get().feed.length === 0) set({ feed: MOCK_FEED });
        if (get().friends.length === 0) set({ friends: MOCK_FRIENDS });
        if (get().requests.length === 0) set({ requests: MOCK_REQUESTS });
      },

      // ---- Feed ----
      react: (postId, emoji) => {
        set({
          feed: get().feed.map((p) => {
            if (p.id !== postId) return p;
            const reactions = { ...p.reactions };
            if (p.myReaction) reactions[p.myReaction] = Math.max(0, (reactions[p.myReaction] ?? 1) - 1);
            if (p.myReaction === emoji) return { ...p, reactions, myReaction: undefined };
            reactions[emoji] = (reactions[emoji] ?? 0) + 1;
            return { ...p, reactions, myReaction: emoji };
          }),
        });
        const id = me()?.id;
        if (id) void reactRemote(postId, id, emoji);
      },

      publishPost: (body, opts = {}) => {
        const post: FeedPost = {
          id: uid(),
          authorId: me()?.id ?? 'me',
          authorName: myName(),
          avatarSeed: mySeed(),
          body,
          workoutSummary: opts.summary,
          flex: opts.flex,
          imageUrl: opts.imageUrl,
          createdAt: new Date().toISOString(),
          reactions: {},
          comments: [],
          mine: true,
        };
        set({ feed: [post, ...get().feed] });
        const id = me()?.id;
        if (id) void publishPostRemote(id, body, opts.summary);
      },

      addComment: (postId, body) => {
        const clean = body.trim();
        if (!clean) return;
        const comment: FeedComment = { id: uid(), authorName: myName(), avatarSeed: mySeed(), body: clean, createdAt: new Date().toISOString() };
        set({ feed: get().feed.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments ?? []), comment] } : p)) });
      },

      deletePost: (id) => set({ feed: get().feed.filter((p) => p.id !== id) }),

      // Drip a believable friend post into the feed (pull-to-refresh feel).
      refreshFeed: () => {
        const friends = get().friends;
        if (friends.length === 0) return false;
        const tpl = MOCK_FEED_DRIP[Math.floor(Math.random() * MOCK_FEED_DRIP.length)];
        // only surface posts from people you're actually friends with
        const known = friends.some((f) => f.name === tpl.authorName) ? tpl : { ...tpl, authorName: friends[0].name, avatarSeed: friends[0].avatarSeed, authorId: friends[0].id };
        const post: FeedPost = { ...known, id: uid(), createdAt: new Date().toISOString(), comments: [] };
        set({ feed: [post, ...get().feed] });
        return true;
      },

      // ---- Friends & requests ----
      addFriend: (name) => {
        const clean = name.trim();
        if (!clean) return;
        const friend: Friend = {
          id: uid(), name: clean, rank: RANKS[Math.floor(Math.random() * RANKS.length)],
          xp: Math.floor(Math.random() * 9000), online: Math.random() > 0.5, avatarSeed: clean.slice(0, 2).toUpperCase(),
          streak: Math.floor(Math.random() * 30), lastActiveISO: new Date().toISOString(),
        };
        set({ friends: [friend, ...get().friends] });
      },

      // Send a request (by name or to a suggested person). It appears as a
      // pending "outgoing" request, then auto-accepts shortly after to simulate
      // the other side accepting — with no backend social graph.
      sendFriendRequest: (name, meta = {}) => {
        const clean = name.trim();
        if (!clean) return;
        if (get().friends.some((f) => f.name.toLowerCase() === clean.toLowerCase())) return;
        if (get().requests.some((r) => r.name.toLowerCase() === clean.toLowerCase())) return;
        const req: FriendRequest = {
          id: uid(), name: clean, avatarSeed: clean.slice(0, 2).toUpperCase(),
          rank: meta.rank ?? RANKS[Math.floor(Math.random() * RANKS.length)], xp: meta.xp ?? Math.floor(Math.random() * 9000),
          direction: 'outgoing', createdAt: new Date().toISOString(),
        };
        set({ requests: [req, ...get().requests] });
        setTimeout(() => {
          const r = get().requests.find((x) => x.id === req.id);
          if (!r) return;
          const friend: Friend = {
            id: uid(), name: r.name, rank: r.rank, xp: r.xp, online: Math.random() > 0.4,
            avatarSeed: r.avatarSeed, streak: meta.streak ?? Math.floor(Math.random() * 30), lastActiveISO: new Date().toISOString(),
          };
          set({ requests: get().requests.filter((x) => x.id !== req.id), friends: [friend, ...get().friends] });
        }, 2600);
      },

      acceptRequest: (id) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r) return;
        const friend: Friend = {
          id: uid(), name: r.name, rank: r.rank, xp: r.xp, online: Math.random() > 0.4,
          avatarSeed: r.avatarSeed, streak: Math.floor(Math.random() * 40), lastActiveISO: new Date().toISOString(),
        };
        set({ requests: get().requests.filter((x) => x.id !== id), friends: [friend, ...get().friends] });
      },

      declineRequest: (id) => set({ requests: get().requests.filter((x) => x.id !== id) }),

      // Add a friend from a real invite link. Uses the inviter's actual profile
      // snapshot (no random stats), dedups by friend code or name, and clears
      // any pending request to/from the same person.
      addFriendByInvite: (p) => {
        const myCode = me()?.friendCode;
        if (myCode && p.code === myCode) return 'self';
        const friends = get().friends;
        if (friends.some((f) => (f.friendCode && f.friendCode === p.code) || f.name.toLowerCase() === p.name.toLowerCase())) return 'duplicate';
        set({
          friends: [friendFromInvite(p), ...friends],
          requests: get().requests.filter((r) => r.name.toLowerCase() !== p.name.toLowerCase()),
        });
        // With a live backend, create the real mutual friendship and reconcile
        // the list with the server (real id + real activity).
        if (isBackendLive) void addFriendByCodeRemote(p.code).then((real) => { if (real) void get().syncFriends(); });
        return 'added';
      },

      removeFriend: (id) => {
        if (isBackendLive) void removeFriendRemote(id);
        set({ friends: get().friends.filter((f) => f.id !== id) });
      },

      syncFriends: async () => {
        if (!isBackendLive) return;
        const friends = await fetchFriendsRemote();
        if (friends) set({ friends });
      },

      cheerFriend: (id) => set({ friends: get().friends.map((f) => (f.id === id ? { ...f, cheeredAt: new Date().toISOString() } : f)) }),

      // ---- Duels (async challenges) ----
      startDuel: (opponentName, opponentAvatar, metric, target, days) => {
        const duel: Duel = {
          id: uid(), opponentName, opponentAvatar, metric, target, myProgress: 0,
          theirProgress: 0, createdAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + days * 86400000).toISOString(), status: 'active',
        };
        set({ duels: [duel, ...get().duels] });
      },

      advanceDuel: (id, mine) => {
        set({
          duels: get().duels.map((d) => {
            if (d.id !== id || d.status !== 'active') return d;
            const myProgress = Math.min(d.target, d.myProgress + mine);
            // opponent grinds along too
            const theirProgress = Math.min(d.target, d.theirProgress + Math.round(mine * (0.6 + Math.random() * 0.7)));
            let status = d.status as Duel['status'];
            if (myProgress >= d.target) status = 'won';
            else if (theirProgress >= d.target) status = 'lost';
            return { ...d, myProgress, theirProgress, status };
          }),
        });
      },

      clearDuel: (id) => set({ duels: get().duels.filter((d) => d.id !== id) }),

      // ---- Marketplace ----
      buyRoutine: (id) => {
        if (get().ownedRoutineIds.includes(id)) return;
        set({ ownedRoutineIds: [...get().ownedRoutineIds, id] });
      },

      publishRoutine: (r) => {
        const routine: MarketplaceRoutine = {
          id: uid(), title: r.title, author: r.author, authorRank: r.authorRank, priceCoins: r.priceCoins,
          weeks: 4, daysPerWeek: r.plan.days.filter((d) => !d.rest).length, focus: r.focus, rating: 5, byMe: true, owned: true, plan: r.plan,
        };
        set({ publishedRoutines: [routine, ...get().publishedRoutines], ownedRoutineIds: [...get().ownedRoutineIds, routine.id] });
      },
    }),
    { name: 'forge-social' },
  ),
);
