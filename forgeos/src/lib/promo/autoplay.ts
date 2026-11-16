// When the 30-second trailer plays on its own, and the flags its link can carry.
//
// It is an advert for the app, so it plays for people who arrive at the
// website's front door, and stays out of the way of everyone else:
//   - never inside the Android app or an installed web app: they already have it;
//   - never on a shared link (an invite, a race, a profile): those visitors came
//     to do something specific, and a 30-second video in front of it is hostile;
//   - never when the device asks for reduced motion;
//   - at most once per visit, so a reload or a trip back never replays it;
//   - for people who already set ForgeOS up in this browser, once ever.
// `#/trailer` plays it on demand regardless (the Download page links there).

export interface TrailerEnv {
  /** Running inside the Capacitor APK. */
  native: boolean;
  /** Running as an installed web app (display-mode: standalone). */
  standalone: boolean;
  /** `location.hash` as the page was first opened, before the router redirects. */
  hash: string;
  /** This browser has finished onboarding. */
  onboarded: boolean;
  /** The trailer has opened in this browser before. */
  seenEver: boolean;
  /** The trailer already opened during this visit (tab session). */
  seenThisSession: boolean;
  /** prefers-reduced-motion, or the app's own bigger-controls mode. */
  reducedMotion: boolean;
}

const FRONT_DOOR = new Set(['', '#', '#/', '#/home', '#/onboarding']);

/** True for the routes a plain visit lands on, false for any shared deep link. */
export function isFrontDoor(hash: string): boolean {
  return FRONT_DOOR.has(hash.split('?')[0]);
}

export function shouldAutoplayTrailer(env: TrailerEnv): boolean {
  if (env.native || env.standalone) return false;
  if (!isFrontDoor(env.hash)) return false;
  if (env.reducedMotion || env.seenThisSession) return false;
  if (env.onboarded) return !env.seenEver;
  return true;
}

export interface TrailerFlags {
  /** Render-only mode for the MP4 export: no controls, time set from outside. */
  capture: boolean;
  /** Fades instead of whips, no flashes or shake. */
  calm: boolean;
  /** Start position in seconds. */
  startAt: number;
}

/** Reads `?capture=1&calm=1&t=12.5` from the query part of a `#/trailer` link. */
export function parseTrailerFlags(search: string, duration: number): TrailerFlags {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = Number(q.get('t'));
  const startAt = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), duration) : 0;
  return { capture: q.get('capture') === '1', calm: q.get('calm') === '1', startAt };
}

export const SEEN_KEY = 'forge-trailer-seen';
export const SESSION_KEY = 'forge-trailer-session';
