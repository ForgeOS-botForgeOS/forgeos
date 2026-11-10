import { describe, expect, it } from 'vitest';
import { formatElapsed } from './elapsed';

describe('formatElapsed', () => {
  it('formats minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(59 * 60_000 + 59_000)).toBe('59:59');
  });
  it('adds hours past sixty minutes', () => {
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });
  it('reads a clock that is ahead, or a broken date, as zero', () => {
    expect(formatElapsed(-5000)).toBe('0:00');
    expect(formatElapsed(Number.NaN)).toBe('0:00');
  });
});
