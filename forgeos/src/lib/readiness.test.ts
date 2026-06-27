import { describe, it, expect } from 'vitest';
import { computeReadiness, readinessFromDays, median, trainingGuidance, recoveryTrend } from './readiness';
import type { HealthDay } from '../types';

const day = (over: Partial<HealthDay>): HealthDay => ({ date: '2026-06-26', source: 'manual', updatedAt: 0, ...over });

describe('median', () => {
  it('odd length', () => expect(median([5, 1, 3])).toBe(3));
  it('even length', () => expect(median([1, 2, 3, 4])).toBe(2.5));
});

describe('computeReadiness', () => {
  it('returns null with no signals', () => {
    expect(computeReadiness(day({ steps: 9000 }))).toBeNull();
  });

  it('rates a great night as primed/ready', () => {
    const r = computeReadiness(day({ sleepScore: 92, bodyBattery: 88, restingHr: 50 }), 52)!;
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.level).toBe('primed');
  });

  it('flags an elevated resting HR as fatigue', () => {
    const good = computeReadiness(day({ sleepMinutes: 360, restingHr: 52 }), 52)!;
    const bad = computeReadiness(day({ sleepMinutes: 360, restingHr: 64 }), 52)!;
    expect(bad.score).toBeLessThan(good.score);
  });

  it('produces a low tier on poor recovery', () => {
    const r = computeReadiness(day({ sleepMinutes: 240, bodyBattery: 15, restingHr: 70 }), 52)!;
    expect(['rundown', 'rest']).toContain(r.level);
    expect(r.factors.length).toBeGreaterThan(0);
  });
});

describe('trainingGuidance', () => {
  it('scales load up when primed and to zero on rest', () => {
    expect(trainingGuidance('primed').multiplier).toBeGreaterThan(1);
    expect(trainingGuidance('ready').multiplier).toBe(1);
    expect(trainingGuidance('rundown').multiplier).toBeLessThan(1);
    expect(trainingGuidance('rest').multiplier).toBe(0);
  });
});

describe('recoveryTrend', () => {
  const week: HealthDay[] = [
    day({ date: '2026-06-20', sleepMinutes: 420, restingHr: 50 }),
    day({ date: '2026-06-21', sleepMinutes: 400, restingHr: 51 }),
    day({ date: '2026-06-22', sleepMinutes: 360, restingHr: 52 }),
    day({ date: '2026-06-23', sleepMinutes: 300, restingHr: 55 }),
    day({ date: '2026-06-24', sleepMinutes: 480, restingHr: 54 }),
  ];

  it('accumulates sleep debt vs the 8h target', () => {
    const t = recoveryTrend(week);
    // shortfalls: 60+80+120+180+0 = 440
    expect(t.sleepDebtMin).toBe(440);
  });

  it('produces a score series and averages', () => {
    const t = recoveryTrend(week);
    expect(t.scores.length).toBe(5);
    expect(t.avgScore).not.toBeNull();
    expect(t.avgSleepMin).toBe(392);
  });

  it('reports resting-HR drift vs baseline', () => {
    const t = recoveryTrend(week);
    expect(typeof t.rhrDrift).toBe('number');
  });
});

describe('readinessFromDays', () => {
  it('uses prior days for the RHR baseline and reads the latest day', () => {
    const days: HealthDay[] = [
      day({ date: '2026-06-20', restingHr: 51 }),
      day({ date: '2026-06-21', restingHr: 52 }),
      day({ date: '2026-06-22', restingHr: 53 }),
      day({ date: '2026-06-26', sleepScore: 80, restingHr: 51 }),
    ];
    const r = readinessFromDays(days)!;
    expect(r.date).toBe('2026-06-26');
    expect(r.score).toBeGreaterThan(0);
  });
});
