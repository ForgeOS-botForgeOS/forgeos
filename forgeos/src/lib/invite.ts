import { PUBLIC_APP_URL } from './publicUrl';
import type { Friend } from '../types';
import { cleanNumber, displayName, displayTitle } from './sanitize';
import { randomId } from './rand';

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
  if (raw.length > 4000) return null;
  return sanitizeInvite(decode<unknown>(raw));
}

/**
 * Every field of an invite is written by whoever made the link. Rebuild it from
 * known keys with the right types: a numeric-looking `xp` that is really an
 * object used to be stored on the friend and crash the Social screen whenever
 * it was rendered, and a code of any shape went on to the add-by-code RPC.
 */
export function sanitizeInvite(raw: unknown): InvitePayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (p.v !== 1 || typeof p.code !== 'string' || typeof p.name !== 'string') return null;
  const code = p.code.trim();
  if (!/^[A-Za-z0-9-]{4,24}$/.test(code)) return null;
  const name = displayName(p.name, '');
  if (!name) return null;
  return {
    v: 1,
    code,
    name,
    rank: displayTitle(p.rank, 'Bronze I'),
    xp: cleanNumber(p.xp, 0, 1e12),
    seed: displayTitle(p.seed).slice(0, 2),
    ...(p.streak == null ? {} : { streak: cleanNumber(p.streak, 0, 100_000) }),
  };
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
  // Every field here was decoded from a link a stranger can write by hand.
  const name = displayName(p.name);
  return {
    id: randomId(),
    name,
    rank: displayTitle(p.rank, 'Bronze I'),
    xp: p.xp,
    online: false,
    avatarSeed: displayTitle(p.seed).slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase(),
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
    return sanitizeInvite(JSON.parse(raw));
  } catch {
    return null;
  }
}
