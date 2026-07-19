import type { FeedPost } from '../types';
import { isBackendLive, supabase, subscribeToFeed } from './supabase';
import { useSocial } from '../state/socialStore';

// Live feed: friends' posts stream in over Supabase Realtime (postgres_changes
// on feed_posts — RLS still applies, so only posts you're allowed to read
// arrive). Until now the subscription helper existed but nothing called it;
// the feed only moved via the local mock drip.

/** Validate + map a raw feed_posts row. Null = not a usable post. */
export function feedRowToPost(row: unknown): FeedPost | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as {
    id?: unknown;
    author_id?: unknown;
    author_name?: unknown;
    body?: unknown;
    workout_summary?: unknown;
    created_at?: unknown;
  };
  if (typeof r.id !== 'string' || typeof r.author_id !== 'string' || typeof r.created_at !== 'string') return null;
  const name = typeof r.author_name === 'string' && r.author_name ? r.author_name : 'Athlete';
  const summary = r.workout_summary as FeedPost['workoutSummary'] | null | undefined;
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: name,
    avatarSeed: name.slice(0, 2).toUpperCase(),
    body: typeof r.body === 'string' ? r.body : '',
    workoutSummary: summary ?? undefined,
    createdAt: r.created_at,
    reactions: {},
  };
}

/**
 * Boot-time hook: stream friends' new posts straight into the feed. Own posts
 * are skipped — addPost already showed them locally (under a different id, so
 * the remote echo would duplicate). No-op in mock mode.
 */
export function initLiveFeed(): void {
  if (!isBackendLive || !supabase) return;
  void supabase.auth.getUser().then(({ data }) => {
    const myId = data.user?.id;
    subscribeToFeed((raw) => {
      const post = feedRowToPost(raw);
      if (!post || post.authorId === myId) return;
      const feed = useSocial.getState().feed;
      if (feed.some((p) => p.id === post.id)) return;
      useSocial.setState({ feed: [post, ...feed] });
    });
  });
}
