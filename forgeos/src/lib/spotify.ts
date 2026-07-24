import type { SpotifyTrack } from '../types';

// Spotify OAuth scaffold. Register a Developer App, set the redirect URI, and
// expose VITE_SPOTIFY_CLIENT_ID. With no client id we mock playback so the
// player UI and PR-song attachment are fully explorable.
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
// Redirect back to the app's own URL — this EXACT string must be added as a
// Redirect URI in your Spotify app settings (works on the GitHub Pages subpath).
const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
const SCOPES = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'];
const TOKEN_KEY = 'forge-spotify-token';
const VERIFIER_KEY = 'forge-spotify-verifier';

// A registered client id is required to log in at all — that's the piece that
// was "missing" (an empty client id makes Spotify reject the request outright).
export const spotifyIsLive = Boolean(clientId);
export const spotifyRedirectUri = redirectUri;

function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(digest);
}

// Start login: create a PKCE verifier, stash it, and send the user to Spotify's
// consent screen. No-op without a client id (the caller gates on spotifyIsLive).
export async function beginSpotifyAuth(): Promise<void> {
  if (!clientId) return;
  const verifier = randomString(64);
  localStorage.setItem(VERIFIER_KEY, verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

interface StoredToken { accessToken: string; expiresAt: number }

// On return from Spotify (?code=…) exchange the code for an access token with
// the PKCE verifier, store it, and strip the query. Safe to call on every load.
export async function handleSpotifyCallback(): Promise<boolean> {
  if (typeof window === 'undefined' || !clientId) return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!code || !verifier) return false;
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: verifier,
      }),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (data.access_token) {
      const token: StoredToken = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
      localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    }
  } catch {
    /* network / misconfig — fall back to mock */
  } finally {
    localStorage.removeItem(VERIFIER_KEY);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
  }
  return spotifyConnected();
}

export function spotifyConnected(): boolean {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const t = JSON.parse(raw) as StoredToken;
    return !!t.accessToken && t.expiresAt > Date.now();
  } catch { return false; }
}

export function spotifyLogout(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export const MOCK_TRACKS: SpotifyTrack[] = [
  { id: 't1', title: 'Till I Collapse', artist: 'Eminem', albumArt: '🎧', durationMs: 297000 },
  { id: 't2', title: 'Stronger', artist: 'Kanye West', albumArt: '🔥', durationMs: 312000 },
  { id: 't3', title: 'Power', artist: 'Kanye West', albumArt: '⚡', durationMs: 292000 },
  { id: 't4', title: 'HUMBLE.', artist: 'Kendrick Lamar', albumArt: '👑', durationMs: 177000 },
  { id: 't5', title: 'Black Skinhead', artist: 'Kanye West', albumArt: '🖤', durationMs: 188000 },
  { id: 't6', title: 'Can’t Hold Us', artist: 'Macklemore', albumArt: '🚀', durationMs: 258000 },
  { id: 't7', title: 'The Pretender', artist: 'Foo Fighters', albumArt: '🎸', durationMs: 269000 },
  { id: 't8', title: 'Lose Yourself', artist: 'Eminem', albumArt: '🥊', durationMs: 326000 },
];

export const MOCK_PLAYLISTS = [
  { id: 'p1', name: 'Forge Heavy', count: 42, vibe: 'Rock / Metal' },
  { id: 'p2', name: 'PR Energy', count: 30, vibe: 'Hip-hop' },
  { id: 'p3', name: 'Hypertrophy Flow', count: 55, vibe: 'EDM' },
  { id: 'p4', name: 'Deload Calm', count: 24, vibe: 'Lo-fi' },
];
