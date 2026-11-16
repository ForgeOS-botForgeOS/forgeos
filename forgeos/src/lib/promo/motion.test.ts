import { describe, expect, it } from 'vitest';
import {
  burst, clamp, countUp, cubicBezier, easeOutBack, easeOutExpo, fitFont, kf, prog, pulse, rng, shake, sweep, typeOn, wordsOn,
} from './motion';

describe('timing primitives', () => {
  it('measures progress through a window and clamps outside it', () => {
    expect(prog(0.5, 1, 2)).toBe(0);
    expect(prog(2, 1, 2)).toBe(0.5);
    expect(prog(9, 1, 2)).toBe(1);
    expect(prog(1, 1, 0)).toBe(1);
    expect(clamp(-3)).toBe(0);
  });

  it('starts and ends every easing exactly at 0 and 1', () => {
    for (const ease of [easeOutExpo, sweep, easeOutBack(), cubicBezier(0.42, 0, 0.58, 1)]) {
      expect(ease(0)).toBeCloseTo(0, 6);
      expect(ease(1)).toBeCloseTo(1, 6);
    }
  });

  it('solves cubic-bezier like CSS does', () => {
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0.3)).toBeCloseTo(0.3, 4);
    // Tempo's sweep is front-loaded: most of the move happens early.
    expect(sweep(0.25)).toBeGreaterThan(0.6);
    expect(sweep(0.5)).toBeGreaterThan(sweep(0.25));
  });

  it('overshoots with the slam easing before settling', () => {
    const back = easeOutBack(2);
    const peak = Math.max(...Array.from({ length: 50 }, (_, i) => back(i / 49)));
    expect(peak).toBeGreaterThan(1);
  });
});

describe('keyframes', () => {
  const keys = [[0, 10], [1, 20], [2, 0]] as const;

  it('interpolates between keys and holds outside them', () => {
    expect(kf(-1, keys)).toBe(10);
    expect(kf(0.5, keys)).toBe(15);
    expect(kf(1.5, keys)).toBe(10);
    expect(kf(5, keys)).toBe(0);
  });

  it('copes with zero-length segments and no keys', () => {
    expect(kf(1, [[1, 0], [1, 5]])).toBe(5);
    expect(kf(1, [])).toBe(0);
  });
});

describe('impacts', () => {
  it('flashes once and decays to nothing', () => {
    expect(pulse(0.99, 1, 0.5)).toBe(0);
    expect(pulse(1, 1, 0.5, 0.8)).toBe(0.8);
    expect(pulse(1.25, 1, 0.5, 0.8)).toBeCloseTo(0.2, 6);
    expect(pulse(1.6, 1, 0.5)).toBe(0);
  });

  it('shakes only while a hit is decaying', () => {
    const hits = [{ at: 3, amp: 10, dur: 0.5 }];
    expect(shake(2.9, hits)).toEqual({ x: 0, y: 0, r: 0 });
    expect(Math.abs(shake(3.05, hits).x) + Math.abs(shake(3.05, hits).y)).toBeGreaterThan(0);
    expect(shake(3.6, hits)).toEqual({ x: 0, y: 0, r: 0 });
  });

  it('throws the same sparks for the same seed, and none before the hit', () => {
    const opts = { count: 20, speed: 200, gravity: 400, life: 1, seed: 4 };
    expect(burst(0.9, 1, opts)).toEqual([]);
    expect(burst(1.2, 1, opts)).toEqual(burst(1.2, 1, opts));
    expect(burst(1.2, 1, opts).length).toBeGreaterThan(0);
    expect(burst(3, 1, opts)).toEqual([]);
  });
});

describe('text and numbers', () => {
  it('types text on character by character, never past the end', () => {
    expect(typeOn('Hello', 1, 1, 10)).toBe('');
    expect(typeOn('Hello', 1.25, 1, 10)).toBe('He');
    expect(typeOn('Hello', 9, 1, 10)).toBe('Hello');
    expect(typeOn('Šťastie', 1.3, 1, 10)).toBe('Šťa');
  });

  it('streams words in at a steady rate', () => {
    expect(wordsOn(6, 0, 1, 5)).toBe(0);
    expect(wordsOn(6, 1.5, 1, 5)).toBe(2);
    expect(wordsOn(6, 9, 1, 5)).toBe(6);
  });

  it('counts up to the exact target', () => {
    expect(countUp(0, 1, 1, 0, 2500)).toBe(0);
    expect(countUp(2, 1, 1, 0, 2500)).toBe(2500);
    expect(countUp(5, 1, 1, 0, 100, easeOutExpo, 5) % 5).toBe(0);
  });

  it('shrinks a headline only when it would overflow', () => {
    expect(fitFont('LOG', 46, 316)).toBe(46);
    const long = fitFont('ZAPÍŠ KAŽDÚ SÉRIU JEDNÝM ŤAHOM', 46, 316);
    expect(long).toBeLessThan(46);
    expect(long * 30 * 0.5).toBeLessThanOrEqual(316);
    expect(fitFont('ABC', 40, 100, (_text, size) => size * 5)).toBe(20);
  });

  it('keeps the PRNG deterministic and inside [0, 1)', () => {
    const a = rng(42);
    const b = rng(42);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
