// When the "new version" popup may appear. A core (APK) update is the one
// update the user has to act on, so it gets a real popup instead of a toast
// that vanishes in four seconds. It must never nag, though:
//   - at most MAX_SHOWS times per release version, at least GAP_MS apart
//     ("Later" means later, not "next time you open the app"),
//   - never while a workout is running,
//   - a brand-new release resets the count, because it is new news.
// The You tab's Update button stays available the whole time.

export const MAX_SHOWS = 3;
export const GAP_MS = 24 * 60 * 60 * 1000;
const KEY = 'forge-update-popup';

export interface PopupMemory {
  version: string;
  shown: number;
  lastShown: number;
}

export function shouldShowUpdatePopup(
  mem: PopupMemory | null,
  version: string,
  now: number,
  busy: boolean,
): boolean {
  if (busy) return false;
  if (!mem || mem.version !== version) return true;
  if (mem.shown >= MAX_SHOWS) return false;
  return now - mem.lastShown >= GAP_MS;
}

export function recordShown(mem: PopupMemory | null, version: string, now: number): PopupMemory {
  const shown = mem && mem.version === version ? mem.shown + 1 : 1;
  return { version, shown, lastShown: now };
}

/** Validates what storage hands back; anything malformed counts as "never shown". */
export function parseMemory(raw: string | null): PopupMemory | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Partial<PopupMemory>;
    if (typeof m.version !== 'string' || !Number.isFinite(m.shown) || !Number.isFinite(m.lastShown)) return null;
    return { version: m.version, shown: m.shown as number, lastShown: m.lastShown as number };
  } catch {
    return null;
  }
}

export function loadMemory(): PopupMemory | null {
  try {
    return parseMemory(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveMemory(mem: PopupMemory): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* storage blocked: worst case the popup can show again next launch */
  }
}
