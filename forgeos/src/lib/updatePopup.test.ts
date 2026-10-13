import { describe, it, expect } from 'vitest';
import { GAP_MS, MAX_SHOWS, parseMemory, recordShown, shouldShowUpdatePopup } from './updatePopup';

const NOW = 1_800_000_000_000;

describe('shouldShowUpdatePopup', () => {
  it('shows the first time a version is seen', () => {
    expect(shouldShowUpdatePopup(null, '1.0.120', NOW, false)).toBe(true);
  });

  it('never shows during a workout', () => {
    expect(shouldShowUpdatePopup(null, '1.0.120', NOW, true)).toBe(false);
  });

  it('waits a full day after "Later" before asking again', () => {
    const mem = recordShown(null, '1.0.120', NOW);
    expect(shouldShowUpdatePopup(mem, '1.0.120', NOW + 60_000, false)).toBe(false);
    expect(shouldShowUpdatePopup(mem, '1.0.120', NOW + GAP_MS - 1, false)).toBe(false);
    expect(shouldShowUpdatePopup(mem, '1.0.120', NOW + GAP_MS, false)).toBe(true);
  });

  it('gives up on a version after MAX_SHOWS', () => {
    let mem = null;
    for (let i = 0; i < MAX_SHOWS; i++) mem = recordShown(mem, '1.0.120', NOW + i * GAP_MS);
    expect(mem?.shown).toBe(MAX_SHOWS);
    expect(shouldShowUpdatePopup(mem, '1.0.120', NOW + 30 * GAP_MS, false)).toBe(false);
  });

  it('a newer release is new news and resets the count', () => {
    let mem = null;
    for (let i = 0; i < MAX_SHOWS; i++) mem = recordShown(mem, '1.0.120', NOW);
    expect(shouldShowUpdatePopup(mem, '1.0.121', NOW + 1000, false)).toBe(true);
    expect(recordShown(mem, '1.0.121', NOW).shown).toBe(1);
  });
});

describe('parseMemory', () => {
  it('round-trips a stored record', () => {
    const mem = recordShown(null, '1.0.120', NOW);
    expect(parseMemory(JSON.stringify(mem))).toEqual(mem);
  });

  it('treats junk as never shown', () => {
    expect(parseMemory(null)).toBeNull();
    expect(parseMemory('{not json')).toBeNull();
    expect(parseMemory('{"version":1,"shown":1,"lastShown":2}')).toBeNull();
    expect(parseMemory('{"version":"x","shown":"a","lastShown":2}')).toBeNull();
  });
});
