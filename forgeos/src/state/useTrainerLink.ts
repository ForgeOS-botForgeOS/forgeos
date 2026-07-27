import { useEffect, useSyncExternalStore } from 'react';
import { probeTrainer, subscribeTrainerLink, trainerConfigured, trainerLink, type TrainerLink } from '../lib/trainer';

/**
 * The trainer's real connection state, checked once per visit.
 *
 * Deliberately not a Zustand store: the value is a plain string owned by the
 * lib, and `useSyncExternalStore` over a primitive avoids the fresh-object
 * selector trap that has bitten this codebase before.
 */
export function useTrainerLink(enabled: boolean): TrainerLink {
  const link = useSyncExternalStore(subscribeTrainerLink, trainerLink, trainerLink);

  useEffect(() => {
    // Already proven good — don't spend a request re-proving it.
    if (!enabled || !trainerConfigured || trainerLink() === 'live') return;
    void probeTrainer();
  }, [enabled]);

  return link;
}
