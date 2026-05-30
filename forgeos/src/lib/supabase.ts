import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When keys are absent we run fully on the local mock data layer (see lib/mockData
// and the Zustand stores). isBackendLive() gates any realtime/socket wiring.
export const isBackendLive = Boolean(url && anon);

export const supabase: SupabaseClient | null = isBackendLive
  ? createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

// Pluggable auth — Google + Apple OAuth + email/password.
export async function signInWithOAuth(provider: 'google' | 'apple') {
  if (!supabase) return { error: 'mock-mode' } as const;
  return supabase.auth.signInWithOAuth({ provider });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return { error: 'mock-mode' } as const;
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) return { error: 'mock-mode' } as const;
  return supabase.auth.signUp({ email, password });
}

// TODO: wire backend — realtime channels for the live workout race + feed.
export function subscribeToRace(_raceId: string, _onUpdate: (payload: unknown) => void) {
  if (!supabase) return () => {};
  // const channel = supabase.channel(`race:${_raceId}`) ... .subscribe()
  // TODO: wire backend (sockets / presence)
  return () => {};
}
