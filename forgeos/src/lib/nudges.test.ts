import { describe, it, expect } from 'vitest';
import { weekendNudge, mondayOf } from './nudges';

// 2026-07-06 is a Monday; the same week runs to Sunday 2026-07-12.
const MON = new Date('2026-07-06T12:00:00Z');
const FRI = new Date('2026-07-10T12:00:00Z');
const SUN = new Date('2026-07-12T12:00:00Z');
const WEEK = mondayOf(FRI); // '2026-07-06'

const base = { weekStart: WEEK, weekSessions: 0, weekStreak: 5, weeklyGoal: 4 };

describe('weekendNudge', () => {
  it('stays quiet early in the week', () => {
    expect(weekendNudge({ ...base, now: MON })).toBeNull();
  });

  it('warns on Friday when a streak is on the line', () => {
    const n = weekendNudge({ ...base, now: FRI })!;
    expect(n.kind).toBe('streak');
    expect(n.message).toContain('5-week streak');
  });

  it('treats a stale weekStart as zero sessions this week', () => {
    const n = weekendNudge({ ...base, weekStart: '2026-06-29', weekSessions: 3, now: SUN })!;
    expect(n.kind).toBe('streak');
  });

  it('has no streak message for brand-new users', () => {
    expect(weekendNudge({ ...base, weekStreak: 0, now: FRI })).toBeNull();
  });

  it('nudges toward the weekly goal while still winnable', () => {
    const n = weekendNudge({ ...base, weekSessions: 2, now: FRI })!;
    expect(n.kind).toBe('goal');
    expect(n.message).toContain('2 more sessions');
  });

  it('goes quiet when the goal is out of reach', () => {
    // Sunday, 1 of 4 done — 3 sessions can't fit in 1 day.
    expect(weekendNudge({ ...base, weekSessions: 1, now: SUN })).toBeNull();
  });

  it('congratulates by silence once the goal is met', () => {
    expect(weekendNudge({ ...base, weekSessions: 4, now: SUN })).toBeNull();
  });
});
