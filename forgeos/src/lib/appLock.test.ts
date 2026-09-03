import { describe, expect, it } from 'vitest';
import { hashPasscode, isLegacyPasscode, parseSecret, verifyPasscode } from './appLock';

describe('appLock', () => {
  it('never stores the passcode itself', async () => {
    const stored = await hashPasscode('4271');
    expect(stored).not.toContain('4271');
    const secret = parseSecret(stored);
    expect(secret?.v).toBe(1);
    expect(secret?.salt).toBeTruthy();
  });

  it('accepts the right passcode and rejects the wrong one', async () => {
    const stored = await hashPasscode('4271');
    expect(await verifyPasscode('4271', stored)).toBe(true);
    expect(await verifyPasscode('4272', stored)).toBe(false);
    expect(await verifyPasscode('', stored)).toBe(false);
    expect(await verifyPasscode('42710', stored)).toBe(false);
  });

  it('salts per device, so the same passcode never hashes alike', async () => {
    const a = await hashPasscode('1234');
    const b = await hashPasscode('1234');
    expect(a).not.toBe(b);
    expect(await verifyPasscode('1234', a)).toBe(true);
    expect(await verifyPasscode('1234', b)).toBe(true);
  });

  it('still unlocks a device that stores the old cleartext PIN', async () => {
    expect(isLegacyPasscode('4271')).toBe(true);
    expect(await verifyPasscode('4271', '4271')).toBe(true);
    expect(await verifyPasscode('9999', '4271')).toBe(false);
  });

  it('knows a hashed secret is not legacy', async () => {
    expect(isLegacyPasscode(await hashPasscode('4271'))).toBe(false);
  });

  it('treats a corrupt secret as legacy rather than crashing', () => {
    expect(parseSecret('{not json')).toBeNull();
    expect(parseSecret('{"v":2,"salt":"x","hash":"y"}')).toBeNull();
  });
});
