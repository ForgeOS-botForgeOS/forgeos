import { isBackendLive } from './supabase';
import { syncMyActivityRemote } from './repositories';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';

// Push my own rank/XP/streak/presence + share-preference so friends see an
// accurate snapshot. No-ops without a backend or when signed out. Workouts
// themselves sync separately via the offline queue (pushWorkout).
export async function pushMyActivity(trainingNow = false): Promise<void> {
  if (!isBackendLive) return;
  const profile = useUser.getState().profile;
  const { xp, streakDays } = useGami.getState();
  const shareActivity = useSettings.getState().shareActivity;
  await syncMyActivityRemote({ friendCode: profile?.friendCode, xp, streakDays, shareActivity, trainingNow });
}
