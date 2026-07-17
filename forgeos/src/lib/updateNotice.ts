import { toast } from './toast';

// Each build bakes in the commit it was built from (see vite.config.ts define).
declare const __WEB_SHA__: string;

const KEY = 'forge-build-sha';

/**
 * Pure rule: should we announce an update? Only when we've seen a *different*
 * build before — never on a first run (previous null) or a same-build reopen.
 */
export function shouldAnnounceUpdate(previous: string | null, current: string): boolean {
  if (current === 'dev' || !current) return false;
  return previous != null && previous !== current;
}

/**
 * Boot-time check that turns the *silent* auto-update into a *visible* one.
 *
 * Both the installed app (OTA web-bundle swap, src/lib/webUpdate.ts) and the
 * website (service-worker takeover, components/UpdatePrompt.tsx) reload onto a
 * new bundle when an update lands. localStorage survives that reload, so if the
 * bundle now running carries a different commit SHA than the one we recorded
 * last time, an update just applied — say so, so the user can see it worked.
 *
 * First-ever run records the SHA silently (nothing to compare against yet), so
 * we never fire a false "updated" on a brand-new install.
 */
export function announceIfUpdated(): void {
  const current = typeof __WEB_SHA__ !== 'undefined' ? __WEB_SHA__ : 'dev';
  if (current === 'dev') return; // local dev build carries no real deploy identity

  let previous: string | null = null;
  try {
    previous = localStorage.getItem(KEY);
    localStorage.setItem(KEY, current);
  } catch {
    return; // storage blocked — skip rather than risk a wrong signal
  }

  if (shouldAnnounceUpdate(previous, current)) {
    // Let the first paint settle so the toast is actually seen.
    setTimeout(() => toast('✨ ForgeOS updated to the latest version', 'success'), 1200);
  }
}
