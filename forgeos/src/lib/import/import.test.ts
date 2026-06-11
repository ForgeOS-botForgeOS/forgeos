import { describe, it, expect } from 'vitest';
import { normalizeStructured } from './normalize';
import { validate } from './validate';
import { verify } from './verify';
import { decideStreak } from './streak';
import { mapToForge } from './mapToForge';
import { betterScalar, mergePrs, unionByDate } from './mergeRules';
import type { PR } from '../../types';

describe('normalize (arbitrary keys → canonical)', () => {
  it('maps differently-named fields from any app', () => {
    const raw = {
      profile: { current_streak: 247, longestStreak: 300, joined: '2022-06-01', points: 12400, gems: 800 },
      lastSession: '2025-01-01',
      activities: [{ date: '2024-12-30', volume: 9000 }, { date: '2024-12-31', distance: 5 }],
      records: [{ exercise: 'Bench Press', weight: 100, reps: 5 }],
      badges: ['Early Bird', 'Night Owl'],
    };
    const c = normalizeStructured(raw, 'TestApp', 'high');
    expect(c.streak?.current).toBe(247);
    expect(c.streak?.longest).toBe(300);
    expect(c.totals?.xp).toBe(12400);
    expect(c.currency?.coins).toBe(800);
    expect(c.memberSince?.slice(0, 10)).toBe('2022-06-01');
    expect(c.history?.length).toBe(2);
    expect(c.personalBests?.[0].name).toMatch(/bench/i);
    expect((c.achievements?.length ?? 0)).toBeGreaterThanOrEqual(2);
  });
});

describe('streak continuity (timezone-aware)', () => {
  const now = new Date('2025-01-10T23:00:00Z');
  it('keeps a recent streak alive with grace', () => {
    const d = decideStreak({ current: 50, longest: 60, lastActive: '2025-01-10' }, 'UTC', now);
    expect(d.continuity).toBe('continue');
    expect(d.keptCurrent).toBe(50);
    expect(d.graceFreeze).toBe(true);
  });
  it('demotes a stale streak to a record only', () => {
    const d = decideStreak({ current: 50, longest: 60, lastActive: '2024-12-01' }, 'UTC', now);
    expect(d.continuity).toBe('longest-only');
    expect(d.keptCurrent).toBe(0);
    expect(d.recordLongest).toBe(60);
  });
});

describe('verify (light checks)', () => {
  it('clamps an impossible streak vs account age', () => {
    const c = normalizeStructured({ currentStreak: 1000, memberSince: '2025-01-01' }, 'X', 'high');
    const { canonical, report } = verify(c);
    const ageDays = Math.floor((Date.now() - Date.parse('2025-01-01')) / 86400000);
    expect(canonical.streak?.current).toBeLessThanOrEqual(ageDays + 1);
    expect(report.warnings.length).toBeGreaterThan(0);
  });
  it('quarantines coins above the low-trust cap', () => {
    const c = normalizeStructured({ coins: 999999 }, 'X', 'low');
    const { canonical, report } = verify(c);
    expect(canonical.currency?.coins).toBe(800);
    expect(report.quarantined.length).toBe(1);
  });
  it('rejects a too-low-confidence screenshot', () => {
    const c = { source: 'X', trust: 'low' as const, confidence: { a: 0.2 }, streak: { current: 5 } };
    expect(verify(c).report.rejected).toBe(true);
  });
});

describe('validate (skip bad rows, never throw)', () => {
  it('drops invalid dates but keeps good rows', () => {
    const c = { source: 'X', trust: 'file' as const, confidence: {}, history: [{ date: 'not-a-date', volumeKg: 1 }, { date: '2025-01-01', volumeKg: 2 }] };
    const { clean, issues } = validate(c);
    expect(clean.history?.length).toBe(1);
    expect(issues.length).toBe(1);
  });
});

describe('mapToForge', () => {
  it('turns a PB into a PR with an estimated 1RM', () => {
    const c = normalizeStructured({ records: [{ exercise: 'Squat', weight: 140, reps: 3 }] }, 'X', 'high');
    const patch = mapToForge(c, decideStreak(undefined, 'UTC'));
    expect(patch.prs.length).toBe(1);
    expect(patch.prs[0].e1rm).toBeGreaterThan(140);
  });
});

describe('never-worse-off merge rules', () => {
  it('scalars take the higher value', () => {
    expect(betterScalar(100, 50)).toBe(100);
    expect(betterScalar(100, 500)).toBe(500);
  });
  it('keeps the higher PR per exercise (never demotes)', () => {
    const existing: PR[] = [{ id: 'a', exerciseId: 'squat', exerciseName: 'Squat', weightKg: 150, reps: 1, e1rm: 150, date: '' }];
    const incoming: PR[] = [{ id: 'b', exerciseId: 'squat', exerciseName: 'Squat', weightKg: 120, reps: 1, e1rm: 120, date: '' }];
    expect(mergePrs(existing, incoming)[0].e1rm).toBe(150);
  });
  it('union by date is idempotent and keeps existing data', () => {
    const existing = [{ date: '2025-01-01', weightKg: 80 }];
    const incoming = [{ date: '2025-01-01', weightKg: 99 }, { date: '2025-01-02', weightKg: 81 }];
    const once = unionByDate(existing, incoming);
    const twice = unionByDate(once, incoming);
    expect(once.length).toBe(2);
    expect(once.find((x) => x.date === '2025-01-01')?.weightKg).toBe(80); // existing wins
    expect(twice.length).toBe(2); // idempotent
  });
});
