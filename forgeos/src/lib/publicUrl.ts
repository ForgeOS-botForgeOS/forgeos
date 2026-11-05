// Where share links point. Inside the Android app the page lives at
// https://localhost/, so a link built from location.href opened nothing on a
// friend's phone. Links always point at the hosted web app instead; only the
// dev server keeps its own origin so links can be tried locally.
export const PUBLIC_APP_URL = 'https://forgeos-botforgeos.github.io/forgeos/';

export function shareBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') return window.location.href.split('#')[0];
  return PUBLIC_APP_URL;
}

// A shared link opened by someone who has not finished onboarding used to be
// thrown away by the onboarding redirect. The route is kept and reopened after.
const PENDING_KEY = 'forge-pending-link';
const SHARE_ROUTES = /^\/(import-workout|import|u|race-join)(\?|$)/;

export function isShareRoute(pathAndSearch: string): boolean {
  return SHARE_ROUTES.test(pathAndSearch) && pathAndSearch.length <= 8000;
}

export function stashPendingLink(pathAndSearch: string): void {
  if (!isShareRoute(pathAndSearch)) return;
  try { localStorage.setItem(PENDING_KEY, pathAndSearch); } catch { /* storage unavailable */ }
}

export function takePendingLink(): string | null {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    if (!v) return null;
    localStorage.removeItem(PENDING_KEY);
    return isShareRoute(v) ? v : null;
  } catch {
    return null;
  }
}

export type ShareResult = 'shared' | 'copied' | 'failed';

// Share sheet where the browser has one (not inside the Android WebView), then
// the clipboard, then the old execCommand copy. 'failed' means the caller must
// show the link so it can be copied by hand; it never silently does nothing.
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<ShareResult> {
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
  if (typeof nav.share === 'function') {
    try {
      await nav.share(data);
      return 'shared';
    } catch {
      /* cancelled or refused: copy instead, so the link is never lost */
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(data.url);
      return 'copied';
    }
  } catch { /* try the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = data.url;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return 'copied';
  } catch { /* nothing left to try */ }
  return 'failed';
}
