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
  if (remote?.onboarded) {
    // A real, finished account exists in the cloud → adopt it.
    store.setProfile({ ...remote, id, email: remote.email ?? email });
  } else if (store.profile) {
    // We already have a local profile (possibly set up BEFORE the backend
    // existed). Keep it — never let an empty/stub remote row (onboarded=false,
    // auto-created by the new-user trigger) overwrite a real account. Just bind
    // it to this auth id so future writes target the right cloud row.
    if (store.profile.id !== id) store.updateProfile({ id });
    if (email && !store.profile.email) store.updateProfile({ email });
  }
  // else: brand-new user, no local profile — onboarding will create it.
}
