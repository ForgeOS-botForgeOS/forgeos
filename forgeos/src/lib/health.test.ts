import { describe, it, expect } from 'vitest';
import { parseHealthText, sleepToMinutes, normDate } from './health';

describe('sleepToMinutes', () => {
  it('reads hours as a plain number', () => expect(sleepToMinutes(7.5)).toBe(450));
  it('reads minutes when > 24', () => expect(sleepToMinutes(450)).toBe(450));
  it('reads seconds when very large', () => expect(sleepToMinutes(27000)).toBe(450));
  it('parses "7h 30m"', () => expect(sleepToMinutes('7h 30m')).toBe(450));
  it('parses "7:30"', () => expect(sleepToMinutes('7:30')).toBe(450));
  it('returns undefined for junk', () => expect(sleepToMinutes('zzz')).toBeUndefined());
});

describe('normDate', () => {
  it('keeps ISO', () => expect(normDate('2026-06-25T22:00:00Z')).toBe('2026-06-25'));
  it('handles MM/DD/YYYY', () => expect(normDate('06/25/2026')).toBe('2026-06-25'));
});

describe('parseHealthText', () => {
  it('parses a flexible CSV', () => {
    const csv = 'date,sleep,steps,restingHR\n2026-06-25,7h 32m,9450,52';
    const { days } = parseHealthText(csv);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ date: '2026-06-25', sleepMinutes: 452, steps: 9450, restingHr: 52 });
  });

  it('parses a JSON array', () => {
    const { days } = parseHealthText('[{"date":"2026-06-26","steps":11200,"sleepScore":81}]');
    expect(days[0]).toMatchObject({ date: '2026-06-26', steps: 11200, sleepScore: 81 });
  });

  it('detects a Garmin sleep export', () => {
    const json = JSON.stringify([{ calendarDate: '2026-06-25', sleepTimeInSeconds: 27000 }]);
    const { days, format } = parseHealthText(json);
    expect(format).toMatch(/Garmin/);
    expect(days[0]).toMatchObject({ date: '2026-06-25', sleepMinutes: 450, source: 'garmin' });
  });

  it('skips rows with only a date', () => {
    const { days } = parseHealthText('date,steps\n2026-06-25,\n2026-06-26,8000');
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-06-26');
  });
});
