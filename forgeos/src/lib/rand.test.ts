import { describe, expect, it } from 'vitest';
import { randomId, randomToken, READABLE_ALPHABET } from './rand';
import { generateFriendCode, isFriendCode } from './friendCode';

describe('randomToken', () => {
  it('returns the asked-for length, from the given alphabet only', () => {
    const t = randomToken(12);
    expect(t).toHaveLength(12);
    expect([...t].every((c) => READABLE_ALPHABET.includes(c))).toBe(true);
  });

  it('does not repeat itself across many draws', () => {
    const seen = new Set(Array.from({ length: 500 }, () => randomToken(8)));
    expect(seen.size).toBe(500);
  });

  it('spreads across the alphabet rather than favouring the first letters', () => {
    // The modulo-bias bug shows up as the first (256 % 31) letters being ~1.5x
    // more common; over this many draws that gap is unmissable.
    const counts = new Map<string, number>();
    for (const c of randomToken(20000)) counts.set(c, (counts.get(c) ?? 0) + 1);
    const values = [...counts.values()];
    const expected = 20000 / READABLE_ALPHABET.length;
    expect(Math.max(...values)).toBeLessThan(expected * 1.25);
    expect(Math.min(...values)).toBeGreaterThan(expected * 0.75);
  });
});

describe('randomId', () => {
  it('is unique and long enough to be unguessable', () => {
    const ids = new Set(Array.from({ length: 500 }, randomId));
    expect(ids.size).toBe(500);
    expect(randomId().length).toBeGreaterThanOrEqual(32);
  });
});

describe('generateFriendCode', () => {
  it('mints a valid, readable code that the parser accepts', () => {
    const code = generateFriendCode();
    expect(code).toMatch(/^FORGE-[A-Z0-9]{8}$/);
    expect(isFriendCode(code)).toBe(true);
  });

  it('still accepts codes minted at the old length', () => {
    expect(isFriendCode('FORGE-AB2K9P')).toBe(true);
  });
});
