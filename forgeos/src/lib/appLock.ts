// The app-lock passcode, stored the way a passcode should be.
//
// It used to sit in localStorage as plain digits — which meant the lock was
// defeated by *reading* it, and worse, `forge-settings` is part of the backup
// export and the cloud sync, so the PIN travelled into a file people share and
// into a database row. Now only a PBKDF2 hash is kept, the salt is per-device,
// and `lib/backup.ts` strips the lock from every dump.
//
// This is still an app lock, not device encryption: everything behind it is
// readable by anything that can already run code on the device. What it now
// guarantees is narrower and true — the passcode itself is not recoverable,
// and it is not in your backups.

const ITERATIONS = 210_000; // OWASP 2023 floor for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const KEY_BITS = 256;

export interface LockSecret {
  v: 1;
  salt: string; // base64
  hash: string; // base64
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(code: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations: ITERATIONS },
    key,
    KEY_BITS,
  );
  return toB64(new Uint8Array(bits));
}

/** Hash a passcode for storage. The result is safe to persist. */
export async function hashPasscode(code: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const secret: LockSecret = { v: 1, salt: toB64(salt), hash: await derive(code, salt) };
  return JSON.stringify(secret);
}

/** Parse a stored value; null when it is not a hashed secret (i.e. legacy plaintext). */
export function parseSecret(stored: string): LockSecret | null {
  if (!stored || stored[0] !== '{') return null;
  try {
    const p = JSON.parse(stored) as LockSecret;
    return p && p.v === 1 && typeof p.salt === 'string' && typeof p.hash === 'string' ? p : null;
  } catch {
    return null;
  }
}

/** True when the stored value is an old cleartext passcode that needs upgrading. */
export function isLegacyPasscode(stored: string): boolean {
  return !!stored && parseSecret(stored) === null;
}

/**
 * Check an entered passcode against the stored value.
 *
 * Legacy cleartext is still accepted so nobody is locked out by the upgrade —
 * the caller re-saves it hashed straight after (see App.tsx), so a device is
 * only ever one unlock away from having no plaintext PIN left.
 */
export async function verifyPasscode(entered: string, stored: string): Promise<boolean> {
  const secret = parseSecret(stored);
  if (!secret) return entered === stored;
  const candidate = await derive(entered, fromB64(secret.salt));
  return timingSafeEqual(candidate, secret.hash);
}

/**
 * Constant-time-ish string compare. A PIN check is not a realistic timing
 * target — but comparing hashes with `===` is the habit worth not having.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * How many digits to draw on the keypad.
 *
 * The old screen used `code.length`, which leaked the passcode length to anyone
 * looking at the phone. A hash has no length, so the lock now always shows the
 * same four dots and unlocks whenever the entry matches.
 */
export const PASSCODE_DOTS = 4;
export const PASSCODE_MAX = 8;
