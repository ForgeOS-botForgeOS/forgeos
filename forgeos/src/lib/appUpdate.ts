import { Capacitor } from '@capacitor/core';
import { syncWebUpdate, hasWebUpdater } from './webUpdate';

// "Download a new APK" nudge. APKs with the OTA updater pull web changes by
// themselves (src/lib/webUpdate.ts), so for them the nudge only fires when the
// release's native code is newer than the installed app's. Older APKs (before
// the updater existed) fall back to the original check: compare the release's
// rebuild time against this bundle's own build time.

declare const __BUILD_TIME__: number; // injected by vite `define`

const RELEASE_API = 'https://api.github.com/repos/ForgeOS-botForgeOS/forgeos/releases/tags/app-latest';
// The release asset is uploaded a few minutes after the build starts; only
// flag builds meaningfully newer than ours to avoid a same-build false alarm.
const SLACK_MS = 45 * 60 * 1000;

export interface ApkUpdate {
  available: boolean;
  updatedAt?: number;
}

let cached: Promise<ApkUpdate> | null = null;

/** One network check per session, shared by every caller. Never throws. */
export function checkForApkUpdate(): Promise<ApkUpdate> {
  cached ??= doCheck();
  return cached;
}

async function doCheck(): Promise<ApkUpdate> {
  // Only meaningful inside the installed Android app.
  if (!(Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform())) {
    return { available: false };
  }
  // OTA-capable APK: web changes apply themselves; only a native-code bump
  // still needs a fresh APK.
  if (hasWebUpdater()) {
    const r = await syncWebUpdate();
    return { available: r.nativeUpdate };
  }
  try {
    const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return { available: false };
    const rel: { assets?: { name?: string; updated_at?: string }[] } = await res.json();
    const apk = (rel.assets ?? []).find((a) => a.name === 'forgeos.apk');
    if (!apk?.updated_at) return { available: false };
    const updatedAt = Date.parse(apk.updated_at);
    const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : Date.now();
    return { available: updatedAt > buildTime + SLACK_MS, updatedAt };
  } catch {
    return { available: false };
  }
}
