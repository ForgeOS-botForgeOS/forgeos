import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { toast } from './toast';

// Google refuses to run its sign-in page inside a WebView, so in the installed
// app the OAuth round-trip goes: system browser → Google → Supabase →
// forgeos://auth?code=… → Android reopens the app (intent-filter in
// AndroidManifest.xml) → we exchange the code for a session here. The PKCE
// code_verifier lives in this app's localStorage, which is exactly why the
// exchange must happen back inside the app and not on the website.

export type AuthRedirect =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

/** Pure parser for the OAuth return deep link. Null = not our auth callback. */
export function parseAuthRedirect(url: string): AuthRedirect | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'forgeos:' || parsed.hostname !== 'auth') return null;
  const message = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error');
  if (message) return { kind: 'error', message };
  const code = parsed.searchParams.get('code');
  if (code) return { kind: 'code', code };
  return null;
}

// Guards the post-success reload: the launch intent still carries the (now
// used) code, and exchanging it twice would wrongly report a failure.
const HANDLED_CODE_KEY = 'forge-auth-code-handled';

async function handleAuthUrl(url: string): Promise<void> {
  const redirect = parseAuthRedirect(url);
  if (!redirect || !supabase) return;
  if (redirect.kind === 'error') {
    toast(`Google sign-in failed: ${redirect.message}`, 'error');
    return;
  }
  try {
    if (sessionStorage.getItem(HANDLED_CODE_KEY) === redirect.code) return;
    sessionStorage.setItem(HANDLED_CODE_KEY, redirect.code);
  } catch { /* storage blocked — still attempt the exchange */ }
  const { error } = await supabase.auth.exchangeCodeForSession(redirect.code);
  if (error) {
    toast('Google sign-in failed — please try again.', 'error');
    return;
  }
  // Reload so the normal boot path sees the fresh session and restores the
  // cloud account — identical to how the website returns from its redirect.
  window.location.hash = '#/onboarding';
  window.location.reload();
}

/** Boot-time hook: catch the OAuth return deep link (installed app only). */
export function initAuthDeepLinks(): void {
  if (!Capacitor.isNativePlatform() || !supabase) return;
  void import('@capacitor/app').then(({ App }) => {
    // Warm app (browser on top): the redirect arrives as an event.
    void App.addListener('appUrlOpen', ({ url }) => {
      void handleAuthUrl(url);
    });
    // Cold start: the deep link launched the app, so the event already fired
    // before any listener existed — the launch URL carries it instead.
    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) void handleAuthUrl(launch.url);
    });
  });
}
