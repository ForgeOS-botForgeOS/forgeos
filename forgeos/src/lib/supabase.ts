import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { RaceBroadcast } from './race';

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
// Where the OAuth provider sends the user back to. In the installed app the
// sign-in happens in the system browser (Google blocks WebViews), so the
// return leg is a deep link that reopens the app — handled in authDeepLink.ts.
// Both URLs must be listed in Supabase Auth → URL Configuration → Redirect URLs.
export const NATIVE_OAUTH_REDIRECT = 'forgeos://auth';

export async function signInWithOAuth(provider: 'google' | 'apple') {
  if (!supabase) return { error: 'mock-mode' } as const;
  // On the website: return to the app root (no hash) so the ?code= lands
  // cleanly before HashRouter takes over.
  const redirectTo = Capacitor.isNativePlatform()
    ? NATIVE_OAUTH_REDIRECT
    : window.location.origin + window.location.pathname;
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
// A user who explicitly logged out should NOT be auto-signed-in again. We flag
// it locally and check it before creating an anonymous session.
const SIGNED_OUT = 'forge-signed-out';
export function isSignedOut(): boolean {
  try { return localStorage.getItem(SIGNED_OUT) === '1'; } catch { return false; }
}
export function clearSignedOut(): void {
  try { localStorage.removeItem(SIGNED_OUT); } catch { /* ignore */ }
}

export async function ensureSession(): Promise<{ id: string; email?: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (data.user) return { id: data.user.id, email: data.user.email ?? undefined };
  if (isSignedOut()) return null; // don't auto-create a session after a logout
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) return null;
  return { id: anon.user.id, email: anon.user.email ?? undefined };
}

// Real sign-out: kill the Supabase session AND set the guard so nothing signs
// the user back in. Cleared the moment they explicitly sign in / onboard again.
export async function signOutEverywhere(): Promise<void> {
  try { localStorage.setItem(SIGNED_OUT, '1'); } catch { /* ignore */ }
  try { sessionStorage.removeItem('forge-restore-tried'); } catch { /* ignore */ }
  if (supabase) { try { await supabase.auth.signOut(); } catch { /* ignore */ } }
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

// The real multiplayer race channel (see lib/raceSession.ts for the state
// glue). Unlike the older joinRace above it handles presence sync/join/leave,
// so every client sees a live roster and can tell who dropped off.
export interface RaceChannelHandlers {
  // A rival reported progress. (Broadcasts are NOT echoed back to the sender —
  // raceSession applies its own updates locally before sending.)
  onProgress: (u: RaceBroadcast) => void;
  // The set of userIds currently connected to the channel changed.
  onRoster: (racers: RaceBroadcast[], onlineIds: string[]) => void;
  // The host started the race.
  onStart: (startAt: number) => void;
}

export interface RaceChannel {
  sendProgress: (u: RaceBroadcast) => void;
  sendStart: (startAt: number) => void;
  leave: () => void;
}

export function joinRaceChannel(raceId: string, me: RaceBroadcast, handlers: RaceChannelHandlers): RaceChannel | null {
  if (!supabase) return null;
  const channel = supabase.channel(`live-race:${raceId}`, { config: { presence: { key: me.userId } } });
  let latestMe = me;

  channel
    .on('broadcast', { event: 'progress' }, ({ payload }) => handlers.onProgress(payload as RaceBroadcast))
    .on('broadcast', { event: 'start' }, ({ payload }) => handlers.onStart((payload as { startAt: number }).startAt))
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<RaceBroadcast>();
      const racers = Object.values(state).map((metas) => metas[0]).filter(Boolean);
      handlers.onRoster(racers, Object.keys(state));
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track(latestMe);
    });

  return {
    sendProgress: (u) => {
      latestMe = u;
      void channel.send({ type: 'broadcast', event: 'progress', payload: u });
      void channel.track(u); // keep presence meta fresh for late joiners
    },
    sendStart: (startAt) => void channel.send({ type: 'broadcast', event: 'start', payload: { startAt } }),
    leave: () => void supabase?.removeChannel(channel),
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
