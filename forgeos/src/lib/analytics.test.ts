import { describe, expect, it } from 'vitest';
import { weeksSpanned } from './analytics';

const NOW = new Date('2026-11-10T12:00:00Z').getTime();
const daysAgo = (d: number) => ({ date: new Date(NOW - d * 86400000).toISOString() });

describe('weeksSpanned', () => {
  it('counts the weeks the sessions really cover, not four sessions per week', () => {
    // Three sessions a week for four weeks: 12 sessions over 27 days.
    const sessions = Array.from({ length: 12 }, (_, i) => daysAgo(1 + i * 2.3));
    expect(weeksSpanned(sessions, NOW)).toBe(4);
  });
  it('is never less than one week', () => {
    expect(weeksSpanned([daysAgo(0)], NOW)).toBe(1);
    expect(weeksSpanned([], NOW)).toBe(1);
  });
  it('ignores unreadable dates', () => {
    expect(weeksSpanned([{ date: 'nope' }, daysAgo(10)], NOW)).toBe(2);
  });
});
