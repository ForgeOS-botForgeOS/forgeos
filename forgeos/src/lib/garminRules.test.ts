import { describe, it, expect } from 'vitest';
import { decideImport, importLabel, importXp, type ExistingWorkout } from './garminRules';
import type { GarminWorkout } from '../types';

const gw = (over: Partial<GarminWorkout> = {}): GarminWorkout => ({
  id: 'hc-1',
  type: 'running',
  start: '2026-07-06T07:30:00Z',
  date: '2026-07-06',
  durationMin: 35,
  ...over,
});

const inApp = (date: string): ExistingWorkout => ({ date, isCardio: false, fromWatch: false });

describe('decideImport', () => {
  it('imports a run as cardio with streak credit', () => {
    const d = decideImport(gw(), []);
    expect(d.kind).toBe('cardio');
    expect(d.countsSession).toBe(true);
    expect(d.xp).toBeGreaterThan(0);
  });

  it('ignores sessions under 10 minutes as noise', () => {
    const d = decideImport(gw({ durationMin: 6 }), []);
    expect(d.kind).toBe('skip');
    expect(d.xp).toBe(0);
  });

  it('imports watch strength when nothing was logged in-app that day', () => {
    const d = decideImport(gw({ type: 'strength', durationMin: 50 }), [inApp('2026-07-05T18:00:00Z')]);
    expect(d.kind).toBe('strength');
    expect(d.countsSession).toBe(true);
  });

  it('skips watch strength when an in-app session exists the same day', () => {
    const d = decideImport(gw({ type: 'strength' }), [inApp('2026-07-06T18:00:00Z')]);
    expect(d.kind).toBe('skip');
    expect(d.reason).toContain('already logged');
  });

  it('does not treat a previous watch import as an in-app session', () => {
    const watch: ExistingWorkout = { date: '2026-07-06T07:00:00Z', isCardio: false, fromWatch: true };
    const d = decideImport(gw({ type: 'strength' }), [watch]);
    expect(d.kind).toBe('strength');
  });

  it('keeps long walks as activity without streak credit', () => {
    const d = decideImport(gw({ type: 'walking', durationMin: 45 }), []);
    expect(d.kind).toBe('activity');
    expect(d.countsSession).toBe(false);
  });

  it('drops short auto-detected walks entirely', () => {
    const d = decideImport(gw({ type: 'walking', durationMin: 18 }), []);
    expect(d.kind).toBe('skip');
  });
});

describe('importXp', () => {
  it('scales with duration and is capped at 50', () => {
    expect(importXp('cardio', 30)).toBe(30);
    expect(importXp('cardio', 300)).toBe(50);
    expect(importXp('activity', 40)).toBeLessThan(importXp('cardio', 40));
  });
});

describe('importLabel', () => {
  it('prefers the Garmin title and always marks the watch', () => {
    expect(importLabel(gw({ title: 'Morning Run' }))).toBe('⌚ Morning Run');
    expect(importLabel(gw({ title: '  ' }))).toBe('⌚ Run');
    expect(importLabel(gw({ type: 'somethingnew' }))).toBe('⌚ Workout');
  });
});
