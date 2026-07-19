import { Capacitor, registerPlugin } from '@capacitor/core';

// Over-the-air updates for the installed Android app. The native side
// (WebUpdatePlugin.kt) downloads the latest web bundle from the app-latest
// release, verifies its SHA-256 and swaps the WebView onto it — so web-only
// changes arrive automatically, exactly like the website's silent updates.
// `nativeUpdate` means the release's native code is newer than this APK's,
// which OTA can't fix — that's the only case left for the download nudge.

declare const __WEB_SHA__: string;

export interface WebUpdateResult {
  applied: boolean;
  nativeUpdate: boolean;
  sha?: string;
}

interface WebUpdateNative {
  confirmBoot(): Promise<void>;
  sync(opts: { currentSha: string }): Promise<WebUpdateResult>;
  installApkUpdate(): Promise<{ started: boolean }>;
}

const WebUpdate = registerPlugin<WebUpdateNative>('WebUpdate');

const NONE: WebUpdateResult = { applied: false, nativeUpdate: false };
// Re-check at most every 30 min (launch + app-foreground calls funnel here).
const RECHECK_MS = 30 * 60 * 1000;

function available(): boolean {
  return (
    Capacitor.getPlatform() === 'android' &&
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable('WebUpdate')
  );
}

let inflight: Promise<WebUpdateResult> | null = null;
let lastCheck = 0;

/**
 * Confirm this bundle boots fine (rollback safety) and pull any newer web
 * build. When an update is applied the WebView reloads underneath us, so the
 * returned promise may simply never settle. Never throws.
 */
export function syncWebUpdate(): Promise<WebUpdateResult> {
  if (!available()) return Promise.resolve(NONE);
  if (inflight && Date.now() - lastCheck < RECHECK_MS) return inflight;
  lastCheck = Date.now();
  inflight = (async () => {
    try {
      await WebUpdate.confirmBoot();
      const sha = typeof __WEB_SHA__ !== 'undefined' ? __WEB_SHA__ : 'dev';
      return await WebUpdate.sync({ currentSha: sha });
    } catch {
      return NONE;
    }
  })();
  return inflight;
}

/** Whether this build runs inside an APK that has the OTA updater. */
export const hasWebUpdater = available;

/**
 * In-app APK self-update: the native side downloads the newest APK and opens
 * Android's install confirmation. Resolves false when this APK is too old to
 * have the method (pre-v1.0.68), we're not in the app, or the download failed —
 * callers should then fall back to the classic download page.
 */
export async function installApkUpdate(): Promise<boolean> {
  if (!available()) return false;
  try {
    const r = await WebUpdate.installApkUpdate();
    return Boolean(r.started);
  } catch {
    return false;
  }
}
