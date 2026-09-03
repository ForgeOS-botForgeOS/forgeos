// Random values that other people can see, guess at, or collect.
//
// `Math.random()` is fine for picking today's quote and useless for anything an
// attacker touches: V8's generator is seeded per-context and its internal state
// is recoverable from a handful of observed outputs, so codes minted that way
// are predictable *from other codes* — and friend codes and race links are
// meant to be shared, which hands over exactly those observations.
//
// Everything here goes through the platform CSPRNG instead.

/** Crockford-ish alphabet: no 0/O/1/I/L, so a code survives being read aloud. */
export const READABLE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/**
 * A random string of `length` characters from `alphabet`, with no modulo bias.
 *
 * Bytes that would land in the ragged tail of the range are thrown away rather
 * than folded back in, so every character stays equally likely — the cheap
 * `% alphabet.length` version quietly makes the first few letters commoner.
 */
export function randomToken(length: number, alphabet = READABLE_ALPHABET): string {
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let out = '';
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b >= limit) continue; // biased tail — draw again
      out += alphabet[b % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/** A unique id for something other people can join or link to. */
export function randomId(): string {
  const c = globalThis.crypto as Crypto & { randomUUID?: () => string };
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  // Older WebViews have getRandomValues without randomUUID.
  return Array.from(randomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
}
