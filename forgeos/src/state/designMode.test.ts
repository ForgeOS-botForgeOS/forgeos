import { describe, expect, it } from 'vitest';
import { coerceDesign } from './settingsStore';

// Tempo, Nova, Bolt and Legacy are all offered, so a saved choice of any of
// them must survive a reload. Only retired or garbage values fall back to
// Tempo, never to a look with no CSS behind it.
describe('coerceDesign', () => {
  it('keeps every look that is still offered', () => {
    for (const mode of ['v2', 'nova', 'bolt', 'classic']) expect(coerceDesign(mode)).toBe(mode);
  });

  it('moves the old retired looks to Tempo', () => {
    for (const old of ['forge', 'aurora']) expect(coerceDesign(old)).toBe('v2');
  });

  it('treats missing or garbage values as Tempo', () => {
    for (const bad of [undefined, null, '', 42, {}, 'NOVA']) expect(coerceDesign(bad)).toBe('v2');
  });
});
