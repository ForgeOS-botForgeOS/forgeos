// A friend code uniquely identifies a user so others can add them. It used to
// be derived from the profile id, but in mock/offline mode every install shares
// id 'me' — so everyone ended up with the same code. Each user now gets their
// own random code, stored on the profile and generated once.

// Crockford-ish alphabet: no 0/O/1/I/L so codes are easy to read aloud / type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LEN = 6;

export function generateFriendCode(): string {
  let s = '';
  for (let i = 0; i < LEN; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `FORGE-${s}`;
}

/** True for a well-formed code like FORGE-AB2K9P (used when adding by code). */
export function isFriendCode(input: string): boolean {
  return /^FORGE-[A-Z0-9]{4,8}$/i.test(input.trim());
}
