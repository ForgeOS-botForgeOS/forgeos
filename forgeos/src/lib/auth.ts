import { supabase, isBackendLive } from './supabase';
import { useUser } from '../state/userStore';
import { fetchProfile } from './repositories';

// Restore a live Supabase session on boot and react to auth changes.
// In mock mode this is a no-op so the local profile drives everything.
export function initAuth(): () => void {
  if (!isBackendLive || !supabase) return () => {};

  // Pull the current session and hydrate the profile if present.
  void supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user;
    if (user) void hydrateProfile(user.id, user.email ?? undefined);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    if (user) void hydrateProfile(user.id, user.email ?? undefined);
  });

  return () => sub.subscription.unsubscribe();
}

async function hydrateProfile(id: string, email?: string) {
  const remote = await fetchProfile(id);
  const store = useUser.getState();
  if (remote) {
    store.setProfile(remote);
  } else if (!store.profile) {
    // New auth user with no local profile yet — leave onboarding to create it,
    // but stamp the id/email so the write targets the right row.
    store.updateProfile?.({});
  }
  if (email && store.profile) store.updateProfile({ email });
}
