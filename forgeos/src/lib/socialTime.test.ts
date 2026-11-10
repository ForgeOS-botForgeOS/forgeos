import { describe, expect, it } from 'vitest';
import { daysLeft, timeAgo } from './socialTime';

const NOW = new Date('2026-11-10T12:00:00Z').getTime();
const ago = (mins: number) => new Date(NOW - mins * 60000).toISOString();

describe('timeAgo', () => {
  it('steps from minutes to hours to days', () => {
    expect(timeAgo(ago(5), NOW)).toBe('5m ago');
    expect(timeAgo(ago(180), NOW)).toBe('3h ago');
    expect(timeAgo(ago(60 * 48), NOW)).toBe('2d ago');
  });
  it('never goes negative for a clock that is ahead', () => {
    expect(timeAgo(ago(-30), NOW)).toBe('0m ago');
  });
});

describe('daysLeft', () => {
  const t = (key: string, p?: Record<string, string | number>) => (p ? `${key}:${p.n}` : key);
  it('counts whole days up', () => {
    expect(daysLeft(t, new Date(NOW + 36 * 3600000).toISOString(), NOW)).toBe('duel.daysLeft:2');
  });
  it('says ending once the time is up', () => {
    expect(daysLeft(t, new Date(NOW - 1000).toISOString(), NOW)).toBe('duel.ending');
  });
});
