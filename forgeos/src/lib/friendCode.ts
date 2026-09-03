import { randomToken } from './rand';

// A friend code uniquely identifies a user so others can add them. It used to
// be derived from the profile id, but in mock/offline mode every install shares
// id 'me' — so everyone ended up with the same code. Each user now gets their
// own random code, stored on the profile and generated once.

// A friend code is a bearer token: whoever types it gets added. So it is drawn
// from the platform CSPRNG, never Math.random — codes are meant to be shared,
// and shared Math.random output is the raw material for predicting the next one.
//
// 8 characters of a 31-letter alphabet is ~40 bits (≈8.5×10^11 codes). At six
// it was 8.9×10^8, small enough that guessing *somebody's* code is realistic
// once enough people are enrolled. Codes minted at the old length keep working.
const LEN = 8;

export function generateFriendCode(): string {
  return `FORGE-${randomToken(LEN)}`;
}

/** True for a well-formed code like FORGE-AB2K9P (used when adding by code). */
export function isFriendCode(input: string): boolean {
  return /^FORGE-[A-Z0-9]{4,8}$/i.test(input.trim());
}
