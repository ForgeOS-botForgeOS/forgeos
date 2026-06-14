import { describe, it, expect } from 'vitest';
import { ingestApi, ingestManual } from './lanes';
import { buildPreview } from './pipeline';
import { EXAMPLE_EXPORT } from './aiBridge';

// End-to-end exercise of the whole pipeline (ingest → normalize → validate →
// verify → streak → map) the way the screen actually drives it, on realistic
// shapes from different apps. These catch "nothing recognised" dead-ends.

const today = new Date().toISOString().slice(0, 10);

describe('import pipeline — realistic payloads', () => {
  it('reads a Duolingo-style streak export and keeps it alive', () => {
    const p = buildPreview(ingestApi(JSON.stringify({ currentStreak: 247, longestStreak: 300, lastActive: today, xp: 12400, memberSince: '2022-01-04' })), 'Duolingo');
    expect(p.rejected).toBe(false);
    expect(p.patch.streakDays).toBe(247);
    expect(p.patch.bestStreak).toBeGreaterThanOrEqual(300);
    expect(p.patch.xp).toBe(12400);
    expect(p.streak.continuity).toBe('continue');
  });

  it('reads a Hevy-style nested export (workouts + PRs)', () => {
    const p = buildPreview(ingestApi(JSON.stringify({
      profile: { joined: '2021-06-01' },
      stats: { total_workouts: 412, points: 88000 },
      personalRecords: [
        { exercise: 'Bench Press', weight: 120, reps: 3 },
        { exercise: 'Back Squat', weight: 180, reps: 1 },
      ],
      workouts: [
        { date: '2026-05-01', volume: 8200 },
        { date: '2026-05-03', volume: 9100 },
      ],
    })), 'Hevy');
    expect(p.rejected).toBe(false);
    expect(p.patch.prs.length).toBe(2);
    expect(p.patch.importedDays.length).toBe(2);
    expect(p.patch.xp).toBe(88000);
  });

  it('does not reject a plain typed-stats (manual) entry', () => {
    const p = buildPreview(ingestManual({ currentStreak: 50, xp: 5000, memberSince: '2024-01-01' }), 'My old app');
    expect(p.rejected).toBe(false);
    expect(p.patch.xp).toBe(5000);
  });

  it('preserves an old streak as a record when last-active is stale', () => {
    const p = buildPreview(ingestApi(JSON.stringify({ currentStreak: 90, lastActive: '2025-01-01' })), 'Strava');
    expect(p.streak.continuity).toBe('longest-only');
    expect(p.patch.streakDays).toBe(0);
    expect(p.patch.bestStreak).toBe(90);
  });

  it('clamps an impossible streak that exceeds account age', () => {
    const p = buildPreview(ingestApi(JSON.stringify({ currentStreak: 99999, memberSince: today, lastActive: today })), 'Sketchy');
    expect(p.report.warnings.some((w) => /exceeds account age/.test(w))).toBe(true);
    expect(p.patch.streakDays).toBeLessThan(99999);
  });

  it('the AI-bridge example (what we tell users to produce) imports cleanly', () => {
    const p = buildPreview(ingestApi(JSON.stringify(EXAMPLE_EXPORT)), EXAMPLE_EXPORT.app);
    expect(p.rejected).toBe(false);
    expect(p.patch.xp).toBe(EXAMPLE_EXPORT.xp);
    expect(p.patch.coins).toBe(EXAMPLE_EXPORT.coins);
    expect(p.patch.prs.length).toBe(EXAMPLE_EXPORT.personalBests.length);
    expect(p.patch.importedDays.length).toBe(EXAMPLE_EXPORT.history.length);
    expect(p.patch.bodyStats.length).toBe(EXAMPLE_EXPORT.bodyStats.length);
    expect(p.patch.achievementsImported).toBe(EXAMPLE_EXPORT.achievements.length);
    expect(p.patch.weeklyGoal).toBe(EXAMPLE_EXPORT.weeklyGoal);
  });

  it('finds SOMETHING in a flat camelCase export with odd keys', () => {
    const p = buildPreview(ingestApi(JSON.stringify({ daily_streak: 12, experiencePoints: 999, gold: 300 })), 'Random');
    expect(p.rejected).toBe(false);
    const hasAnything = p.patch.xp > 0 || p.patch.coins > 0 || p.patch.bestStreak > 0 || p.patch.streakDays > 0;
    expect(hasAnything).toBe(true);
  });
});
