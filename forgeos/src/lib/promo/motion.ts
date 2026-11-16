// Motion maths for the ForgeOS trailer.
//
// Every frame of the trailer is a pure function of time `t` (seconds). That is
// what lets the same component play live in the browser, scrub, skip, and be
// captured frame by frame into an MP4 with identical results. Nothing in here
// reads a clock, the DOM or Math.random: randomness comes from a seeded PRNG.

export type Ease = (p: number) => number;

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

/** 0→1 progress of `t` through the window that opens at `start` and lasts `dur`. */
export function prog(t: number, start: number, dur: number): number {
  if (dur <= 0) return t >= start ? 1 : 0;
  return clamp((t - start) / dur);
}

export const linear: Ease = (p) => p;
export const easeInCubic: Ease = (p) => p * p * p;
export const easeOutCubic: Ease = (p) => 1 - (1 - p) ** 3;
export const easeInOutCubic: Ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
export const easeOutExpo: Ease = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
export const easeInExpo: Ease = (p) => (p <= 0 ? 0 : 2 ** (10 * p - 10));
export const easeOutQuart: Ease = (p) => 1 - (1 - p) ** 4;

/** Overshoots past 1 and settles back: the "slam" landing. */
export function easeOutBack(overshoot = 1.70158): Ease {
  return (p) => 1 + (overshoot + 1) * (p - 1) ** 3 + overshoot * (p - 1) ** 2;
}

/**
 * CSS-compatible cubic-bezier timing function, so motion here matches the
 * app's own `--v2-ease-sweep` exactly. Newton steps with a bisection fallback.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const solveU = (x: number): number => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(u) - x;
      if (Math.abs(err) < 1e-6) return u;
      const d = slopeX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = x;
    for (let i = 0; i < 30; i++) {
      const v = sampleX(u);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : sampleY(solveU(p)));
}

/** Tempo's sweep curve (`--v2-ease-sweep` in index.css). */
export const sweep: Ease = cubicBezier(0.22, 1, 0.36, 1);

/** A keyframe: at `time`, the value is `value`; `ease` shapes the segment arriving at it. */
export type Key = readonly [time: number, value: number, ease?: Ease];

/** Piecewise interpolation through keys sorted by time. Holds the end values outside them. */
export function kf(t: number, keys: readonly Key[]): number {
  if (keys.length === 0) return 0;
  // Strictly before the first key: a zero-length pair at the start is a jump, and at its instant the jump has happened.
  if (t < keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease = linear] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return lerp(v0, v1, ease(p));
    }
  }
  return keys[keys.length - 1][1];
}

/** A one-shot envelope: jumps to `peak` at `at`, decays quadratically to 0 over `dur`. */
export function pulse(t: number, at: number, dur: number, peak = 1): number {
  const dt = t - at;
  if (dt < 0 || dt > dur) return 0;
  return peak * (1 - dt / dur) ** 2;
}

export interface Hit {
  at: number;
  amp: number;
  dur: number;
}

/** Camera shake summed over impacts: a decaying, deterministic jitter in px and degrees. */
export function shake(t: number, hits: readonly Hit[]): { x: number; y: number; r: number } {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const h of hits) {
    const dt = t - h.at;
    if (dt < 0 || dt > h.dur) continue;
    const k = h.amp * (1 - dt / h.dur) ** 2;
    x += k * Math.sin(dt * 63 + h.at * 1.3);
    y += k * Math.sin(dt * 71 + h.at * 2.9);
    r += k * 0.08 * Math.sin(dt * 47 + h.at);
  }
  return { x, y, r };
}

/** Seeded PRNG (mulberry32): the same seed always gives the same sequence. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** The part of `text` typed so far, at `cps` characters per second from `start`. */
export function typeOn(text: string, t: number, start: number, cps: number): string {
  const chars = [...text];
  const n = Math.floor(Math.max(0, t - start) * cps);
  return chars.slice(0, Math.min(chars.length, n)).join('');
}

/** How many of `words` have streamed in, at `wps` words per second from `start`. */
export function wordsOn(words: number, t: number, start: number, wps: number): number {
  return Math.min(words, Math.max(0, Math.floor((t - start) * wps)));
}

/** A number counting from `from` to `to` over the window, rounded to `step`. */
export function countUp(t: number, start: number, dur: number, from: number, to: number, ease: Ease = easeOutExpo, step = 1): number {
  const v = lerp(from, to, ease(prog(t, start, dur)));
  return Math.round(v / step) * step;
}

/**
 * Largest font size, up to `max`, at which `text` fits `width`. `measure`
 * returns the rendered width at a given size (a canvas measureText in the
 * browser); without one, a per-character estimate keeps it testable.
 */
export function fitFont(
  text: string,
  max: number,
  width: number,
  measure?: (text: string, size: number) => number,
  emPerChar = 0.5,
): number {
  const natural = measure ? measure(text, max) : [...text].length * emPerChar * max;
  if (natural <= width || natural <= 0) return max;
  return Math.floor((max * width) / natural);
}

export interface Particle {
  x: number;
  y: number;
  /** Direction of travel in degrees, for drawing a streak. */
  angle: number;
  len: number;
  alpha: number;
  hue: number;
}

export interface BurstOptions {
  count: number;
  speed: number;
  gravity: number;
  life: number;
  seed: number;
  /** Centre direction (degrees, 0 = right, 90 = down) and total spread. */
  dir?: number;
  spread?: number;
}

/** Sparks flying from an impact at time `at`, positions solved analytically. */
export function burst(t: number, at: number, o: BurstOptions): Particle[] {
  const tau = t - at;
  if (tau < 0) return [];
  const rand = rng(o.seed);
  const out: Particle[] = [];
  const spread = ((o.spread ?? 360) * Math.PI) / 180;
  const centre = ((o.dir ?? -90) * Math.PI) / 180;
  for (let i = 0; i < o.count; i++) {
    const a = centre + (rand() - 0.5) * spread;
    const v = o.speed * (0.35 + 0.65 * rand());
    const life = o.life * (0.55 + 0.45 * rand());
    const hue = rand();
    if (tau > life) continue;
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v + o.gravity * tau;
    out.push({
      x: Math.cos(a) * v * tau,
      y: Math.sin(a) * v * tau + 0.5 * o.gravity * tau * tau,
      angle: (Math.atan2(vy, vx) * 180) / Math.PI,
      len: Math.max(2, Math.hypot(vx, vy) * 0.03),
      alpha: (1 - tau / life) ** 1.4,
      hue,
    });
  }
  return out;
}
