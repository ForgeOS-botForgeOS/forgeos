import type { SpotifyTrack } from '../types';

// Spotify OAuth scaffold. Register a Developer App, set the redirect URI, and
// expose VITE_SPOTIFY_CLIENT_ID. With no client id we mock playback so the
// player UI and PR-song attachment are fully explorable.
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : ''}/spotify-callback`;
const SCOPES = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'];

export const spotifyIsLive = Boolean(clientId);

export function getAuthUrl(): string {
  // TODO: register Developer App + redirect URI
  const params = new URLSearchParams({
    client_id: clientId ?? '',
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
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
