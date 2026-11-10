import { describe, expect, it } from 'vitest';
import { shortDate } from './shortDate';

describe('shortDate', () => {
  it('puts the day first', () => {
    expect(shortDate('2026-09-26')).toMatch(/^26 Sep/);
    expect(shortDate('2026-09-26T23:30:00.000Z')).toMatch(/^26 Sep/);
  });
  it('uses numbers in Slovak', () => {
    expect(shortDate('2026-09-26', 'sk-SK').replace(/\s/g, '')).toBe('26.9.');
  });
  it('returns unreadable input unchanged', () => {
    expect(shortDate('nope')).toBe('nope');
  });
});
