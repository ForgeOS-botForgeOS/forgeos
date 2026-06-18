import { useEffect, useState } from 'react';
import type { Friend } from '../types';
import { friendActivity, type FriendActivity } from './friendActivity';
import { isBackendLive } from './supabase';
import { fetchFriendActivityRemote } from './repositories';

// A friend's activity, real when a backend is live. Shows the deterministic
// local placeholder instantly, then swaps in the friend's actual synced
// workouts/PRs once they load (or a "private" state if they've hidden them).
export function useFriendActivity(friend: Friend | null): { activity: FriendActivity | null; loading: boolean } {
  const [activity, setActivity] = useState<FriendActivity | null>(friend ? friendActivity(friend) : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!friend) { setActivity(null); return; }
    setActivity(friendActivity(friend)); // instant placeholder
    if (!isBackendLive) return;
    let alive = true;
    setLoading(true);
    fetchFriendActivityRemote(friend.id)
      .then((real) => { if (alive && real) setActivity(real); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [friend]);

  return { activity, loading };
}
