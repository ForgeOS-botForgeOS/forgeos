import { isBackendLive, ensureSession } from './supabase';
import { syncMyActivityRemote, upsertProfile } from './repositories';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import { useHealth } from '../state/healthStore';

// Steps walked since Monday — the "step race" number friends can see.
function myWeeklySteps(): number {
  const { recoveryEnabled, shareActivity } = useSettings.getState();
  if (!recoveryEnabled || !shareActivity) return 0;
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const from = monday.toISOString().slice(0, 10);
  return Object.values(useHealth.getState().days)
    .filter((d) => d.date >= from)
    .reduce((a, d) => a + (d.steps ?? 0), 0);
}

// Make the current device a real cloud account with zero signup: ensure a
// Supabase session (anonymous if needed), re-point the local profile at that
// auth id, and push it up. After this, friends/activity sync work for users who
// never registered. Returns true if a cloud session is active.
export async function ensureCloudAccount(): Promise<boolean> {
  if (!isBackendLive) return false;
  const session = await ensureSession();
  if (!session) return false; // e.g. anonymous sign-ins not enabled in Supabase
  const store = useUser.getState();
  if (store.profile && store.profile.id !== session.id) {
    // Adopt the real auth id so every write targets the right cloud row.
    store.updateProfile({ id: session.id, email: store.profile.email ?? session.email });
  }
  const profile = useUser.getState().profile;
  if (profile) await upsertProfile(profile); // create/update the cloud profile row
  await pushMyActivity();
  return true;
}

// Push my own rank/XP/streak/presence + share-preference so friends see an
// accurate snapshot. No-ops without a backend or when signed out. Workouts
// themselves sync separately via the offline queue (pushWorkout).
export async function pushMyActivity(trainingNow = false): Promise<void> {
  if (!isBackendLive) return;
  const profile = useUser.getState().profile;
  const { xp, streakDays } = useGami.getState();
  const shareActivity = useSettings.getState().shareActivity;
  await syncMyActivityRemote({ friendCode: profile?.friendCode, xp, streakDays, shareActivity, trainingNow, weeklySteps: myWeeklySteps() });
}
