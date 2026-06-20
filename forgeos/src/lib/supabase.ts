import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When keys are absent we run fully on the local mock data layer (see lib/mockData
// and the Zustand stores). isBackendLive() gates any realtime/socket wiring.
export const isBackendLive = Boolean(url && anon);

export const supabase: SupabaseClient | null = isBackendLive
  ? createClient(url as string, anon as string, {
      // PKCE puts the auth code in the query string (?code=), which survives our
      // HashRouter URLs — implicit-flow hash tokens would collide with the route.
      auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: true },
    })
  : null;

// Pluggable auth — Google + Apple OAuth + email/password.
export async function signInWithOAuth(provider: 'google' | 'apple') {
  if (!supabase) return { error: 'mock-mode' } as const;
  // Return to the app root (no hash) so the ?code= lands cleanly before
  // HashRouter takes over. Add this URL to Supabase Auth → URL Configuration.
  const redirectTo = window.location.origin + window.location.pathname;
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return { error: 'mock-mode' } as const;
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) return { error: 'mock-mode' } as const;
  return supabase.auth.signUp({ email, password });
}

// Email a password-reset link. Can't reveal an existing password (it's only
// stored hashed), so this is the recovery path when one is forgotten. The link
// returns to the app root, where the PASSWORD_RECOVERY handler (PasswordReset
// overlay) lets the user set a new password.
export async function sendPasswordReset(email: string) {
  if (!supabase) return { error: 'mock-mode' } as const;
  const redirectTo = window.location.origin + window.location.pathname;
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

// Set a new password — valid right after a recovery link establishes a session.
export async function updatePassword(password: string) {
  if (!supabase) return { error: 'mock-mode' } as const;
  return supabase.auth.updateUser({ password });
}

// Capture the password-recovery event at module load (before the UI mounts) so
// the "set a new password" overlay never misses it. PasswordReset reads the flag
// on mount and also listens for the event.
export const recovery = { requested: false };
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovery.requested = true;
      window.dispatchEvent(new Event('forge:password-recovery'));
    }
  });
}

// The currently authenticated user (or null in mock mode / signed out). Used so
// each account's profile is stored under its real auth id and can be restored
// on login from any device.
export async function currentAuthUser(): Promise<{ id: string; email?: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
}

// Guarantee a real Supabase session WITHOUT making the user register: if none
// exists, sign in anonymously. This turns every existing local/guest/Google
// profile into a working cloud account automatically. Requires "Anonymous
// sign-ins" enabled in the Supabase dashboard. They can later attach an
// email/Google to keep it across devices.
export async function ensureSession(): Promise<{ id: string; email?: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (data.user) return { id: data.user.id, email: data.user.email ?? undefined };
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) return null;
  return { id: anon.user.id, email: anon.user.email ?? undefined };
}

// ---- Realtime ----
export interface RaceUpdate {
  userId: string;
  name: string;
  volumeKg: number;
}

// Live multiplayer race over a Supabase Realtime channel using presence +
// broadcast. Each athlete broadcasts their running volume; everyone receives it.
export function joinRace(raceId: string, me: RaceUpdate, onUpdate: (all: RaceUpdate[]) => void) {
  if (!supabase) return { broadcast: () => {}, leave: () => {} };
  const channel = supabase.channel(`race:${raceId}`, { config: { presence: { key: me.userId } } });
  const state = new Map<string, RaceUpdate>([[me.userId, me]]);

  channel
    .on('broadcast', { event: 'progress' }, ({ payload }) => {
      const u = payload as RaceUpdate;
      state.set(u.userId, u);
      onUpdate([...state.values()]);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track(me);
    });

  return {
    broadcast: (volumeKg: number) => {
      const u = { ...me, volumeKg };
      state.set(me.userId, u);
      void channel.send({ type: 'broadcast', event: 'progress', payload: u });
      onUpdate([...state.values()]);
    },
    leave: () => void supabase.removeChannel(channel),
  };
}

// Realtime feed: fire the callback whenever a new post is inserted.
export function subscribeToFeed(onInsert: (row: unknown) => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('public:feed_posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, (payload) => onInsert(payload.new))
    .subscribe();
  return () => void supabase.removeChannel(channel);
}
