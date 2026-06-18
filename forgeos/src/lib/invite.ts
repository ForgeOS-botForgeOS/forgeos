import type { Friend } from '../types';

// Friend invites without a backend: the inviter's real profile snapshot is
// packed into the share link itself, so when another ForgeOS user opens it we
// add the *real* person (name, rank, XP, streak) — not a random mock friend.
// It's a point-in-time snapshot (no live sync), which is the most that's
// possible fully client-side.

export interface InvitePayload {
  v: 1;
  code: string; // inviter's unique friend code
  name: string;
  rank: string;
  xp: number;
  seed: string; // avatar initials
  streak?: number;
}

// Canonical public site — share links must be clickable from any chat app on
// any device, so they always point at the hosted web app (not the local/APK
// origin). This is the share target, unrelated to the Vite build base.
const PUBLIC_APP_URL = 'https://forgeos-botforgeos.github.io/forgeos/';

// URL-safe base64 (base64url) so payloads survive being pasted into links.
function encode(obj: unknown): string {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode<T>(s: string): T | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b64)))) as T;
  } catch {
    return null;
  }
}

export function buildInviteLink(p: InvitePayload): string {
  return `${PUBLIC_APP_URL}#/add-friend?i=${encode(p)}`;
}

export function parseInvitePayload(raw: string): InvitePayload | null {
  const p = decode<InvitePayload>(raw);
  if (!p || p.v !== 1 || !p.code || !p.name) return null;
  return p;
}

// Pull an invite payload out of whatever the user pasted: a full link, a bare
// "?i=…" token, or the raw encoded blob. Returns null if it isn't an invite.
export function tryExtractInvite(raw: string): InvitePayload | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/[?&]i=([A-Za-z0-9_-]+)/);
  if (m) return parseInvitePayload(m[1]);
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return parseInvitePayload(s);
  return null;
}

export function friendFromInvite(p: InvitePayload): Friend {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: p.name,
    rank: p.rank,
    xp: p.xp,
    online: false,
    avatarSeed: p.seed || p.name.slice(0, 2).toUpperCase(),
    streak: p.streak,
    lastActiveISO: new Date().toISOString(),
    friendCode: p.code,
  };
}

// Stash an invite the user opened before finishing onboarding, so we can add
// the friend the moment their profile exists.
const PENDING_KEY = 'forge-pending-invite';
export function stashPendingInvite(p: InvitePayload) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}
export function takePendingInvite(): InvitePayload | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_KEY);
    const p = JSON.parse(raw) as InvitePayload;
    return p && p.v === 1 && p.code ? p : null;
  } catch {
    return null;
  }
}
