import { describe, expect, it } from 'vitest';
import { coerceDesign } from './settingsStore';

// Nova and Bolt were folded into Tempo. A phone that saved either — or the
// older 'forge'/'aurora' values, or nothing — must wake up in Tempo, never in
// a look that no longer has any CSS behind it.
describe('coerceDesign', () => {
  it('moves every retired look to Tempo', () => {
    for (const old of ['nova', 'bolt', 'forge', 'aurora']) expect(coerceDesign(old)).toBe('v2');
  });

  it('treats missing or garbage values as Tempo', () => {
    for (const bad of [undefined, null, '', 42, {}]) expect(coerceDesign(bad)).toBe('v2');
  });

  it('keeps an explicit Legacy choice and Tempo itself', () => {
    expect(coerceDesign('classic')).toBe('classic');
    expect(coerceDesign('v2')).toBe('v2');
  });
});
