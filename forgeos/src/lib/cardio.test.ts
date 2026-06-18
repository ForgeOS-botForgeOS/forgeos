import { describe, it, expect } from 'vitest';
import { speedKmh, paceLabel, durationFromSpeed } from './cardio';

describe('cardio conversions', () => {
  it('computes speed in km/h', () => {
    expect(speedKmh(10, 60)).toBe(10);
    expect(speedKmh(5, 30)).toBe(10);
    expect(speedKmh(21.1, 120)).toBeCloseTo(10.6, 1);
  });

  it('returns 0 speed for missing inputs', () => {
    expect(speedKmh(0, 30)).toBe(0);
    expect(speedKmh(5, 0)).toBe(0);
  });

  it('formats pace as m:ss /km', () => {
    expect(paceLabel(10, 50)).toBe('5:00 /km');
    expect(paceLabel(5, 27.5)).toBe('5:30 /km');
    expect(paceLabel(0, 30)).toBe('—');
  });

  it('carries pace rounding past 60s', () => {
    // 5.999 min/km should render 6:00, never 5:60
    expect(paceLabel(1, 5.999)).toBe('6:00 /km');
  });

  it('back-fills duration from distance + speed', () => {
    expect(durationFromSpeed(10, 10)).toBe(60);
    expect(durationFromSpeed(5, 12)).toBe(25);
    expect(durationFromSpeed(0, 10)).toBe(0);
  });
});
