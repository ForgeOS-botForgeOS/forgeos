// The browser side of the autoplay rules (autoplay.ts holds the pure rules):
// reads this visit's facts from the device, and remembers that the trailer
// has been shown. Storage can be blocked (private mode); every access here
// degrades to "never seen", which at worst shows the trailer once more.
import type { CSSProperties } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUser } from '../../state/userStore';
import { useSettings } from '../../state/settingsStore';
import { SEEN_KEY, SESSION_KEY, shouldAutoplayTrailer } from './autoplay';

/** The address the page was opened with, read before the router redirects to /home or /onboarding. */
const INITIAL_HASH = typeof window === 'undefined' ? '' : window.location.hash;

/** Covers the app while the trailer chunk loads, so the page never flashes underneath. */
export const CURTAIN: CSSProperties = { position: 'fixed', inset: 0, zIndex: 9999, background: '#0e1116' };

function flag(storage: () => Storage, key: string): boolean {
  try {
    return storage().getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markTrailerSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage blocked: it may show again, which is harmless */
  }
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* same */
  }
}

/** prefers-reduced-motion, or the app's own bigger-controls mode (which also turns decorative motion off). */
export function prefersCalm(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) || useSettings.getState().a11yLargeTargets;
}

/** Whether this page load should open with the trailer. */
export function trailerShouldAutoplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return shouldAutoplayTrailer({
    native: Capacitor.isNativePlatform(),
    standalone: Boolean(window.matchMedia?.('(display-mode: standalone)').matches) || nav.standalone === true,
    hash: INITIAL_HASH,
    onboarded: Boolean(useUser.getState().profile?.onboarded),
    seenEver: flag(() => localStorage, SEEN_KEY),
    seenThisSession: flag(() => sessionStorage, SESSION_KEY),
    reducedMotion: prefersCalm(),
  });
}
