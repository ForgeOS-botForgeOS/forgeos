// The edit's grammar as pure functions: how a scene enters and leaves at each
// cut (whips, zooms, glitch slices, irises, hard cuts), and the camera shake
// and beat bounce. Components only apply the styles these return.
import type { CSSProperties } from 'react';
import { clamp, easeInCubic, easeInExpo, easeOutExpo, prog, pulse, shake, sweep, type Hit } from './motion';
import { BEAT, CUE, cutAt, type CutKind, type Scene } from './schedule';

interface Acc {
  tx: number;
  ty: number;
  sc: number;
  skx: number;
  sky: number;
  blur: number;
  op: number;
  clip?: string;
}

/** Strips revealed from the left at staggered speeds: the glitch-slice wipe, as one polygon. */
export function staircase(p: number): string {
  const n = 8;
  const pts = ['0% 0%'];
  for (let i = 0; i < n; i++) {
    const lag = (i % 2 ? 0.14 : 0) + ((i * 5) % 3) * 0.04;
    const w = sweep(clamp((p - lag) / 0.7)) * 100;
    pts.push(`${w}% ${(i / n) * 100}%`, `${w}% ${((i + 1) / n) * 100}%`);
  }
  pts.push('0% 100%');
  return `polygon(${pts.join(', ')})`;
}

function whip(kind: CutKind, amount: number, a: Acc): void {
  if (kind === 'whip') {
    a.tx += 400 * amount;
    a.skx -= 16 * amount;
  } else {
    a.ty += 720 * amount;
    a.sky += 5 * amount;
  }
  a.blur += 7 * Math.abs(amount);
}

function applyIn(kind: CutKind, rel: number, a: Acc, iris: string): void {
  switch (kind) {
    case 'whip':
    case 'whipUp':
      whip(kind, 1 - sweep(prog(rel, -0.06, 0.36)), a);
      if (rel < -0.06) a.op = 0;
      return;
    case 'zoom': {
      const p = easeOutExpo(prog(rel, 0, 0.45));
      a.sc *= 0.7 + 0.3 * p;
      a.blur += 8 * (1 - p);
      a.op *= clamp(rel / 0.08);
      return;
    }
    case 'slice': {
      const p = prog(rel, -0.08, 0.32);
      if (rel < -0.08) a.op = 0;
      else if (p < 1) a.clip = staircase(p);
      return;
    }
    case 'iris': {
      const p = easeOutExpo(prog(rel, 0, 0.42));
      if (rel < 0) a.op = 0;
      else if (p < 1) a.clip = `circle(${(p * 125).toFixed(2)}% at ${iris})`;
      return;
    }
    case 'cut':
      if (rel < 0) a.op = 0;
      else a.sc *= 1 + 0.07 * (1 - easeOutExpo(prog(rel, 0, 0.35)));
      return;
    case 'slam':
      if (rel < 0) a.op = 0;
  }
}

function applyOut(kind: CutKind, rel: number, a: Acc, iris: string): void {
  switch (kind) {
    case 'whip':
    case 'whipUp':
      whip(kind, -easeInCubic(prog(rel, -0.14, 0.2)), a);
      if (rel > 0.06) a.op = 0;
      return;
    case 'zoom': {
      const p = easeInExpo(prog(rel, -0.22, 0.22));
      a.sc *= 1 + 2.2 * p;
      a.blur += 6 * p;
      a.op *= rel >= 0 ? 0 : 1 - p * 0.9;
      return;
    }
    case 'slice':
      if (rel > -0.1 && rel < 0.24) a.tx += Math.sin(rel * 170) * 5;
      if (rel >= 0.24) a.op = 0;
      return;
    case 'iris': {
      const p = easeInCubic(prog(rel, -0.32, 0.32));
      if (rel >= 0) a.op = 0;
      else if (p > 0) a.clip = `circle(${((1 - p) * 125).toFixed(2)}% at ${iris})`;
      a.sc *= 1 - 0.06 * p;
      return;
    }
    case 'cut':
    case 'slam':
      if (rel >= 0) a.op = 0;
  }
}

export interface FrameOptions {
  /** The scene stages its own entrance or exit (the hook, the logo, the finale). */
  ownIn?: boolean;
  ownOut?: boolean;
  /** Where an iris cut closes and reopens, as "x% y%". */
  iris?: string;
}

/** Transform, opacity, blur and clip for a scene at `time`, from the cuts at its two ends. */
export function frameStyle(s: Scene, time: number, calm: boolean, o: FrameOptions = {}): CSSProperties {
  const a: Acc = { tx: 0, ty: 0, sc: 1, skx: 0, sky: 0, blur: 0, op: 1 };
  const iris = o.iris ?? '50% 50%';
  const enter = cutAt(s.start);
  const exit = cutAt(s.end);
  const relIn = time - s.start;
  const relOut = time - s.end;
  if (calm) {
    if (enter) a.op *= prog(relIn, -0.15, 0.3);
    if (exit) a.op *= 1 - prog(relOut, -0.15, 0.3);
  } else {
    if (enter && o.ownIn) a.op = relIn < 0 ? 0 : a.op;
    else if (enter) applyIn(enter.kind, relIn, a, iris);
    if (exit && o.ownOut) a.op = relOut >= 0 ? 0 : a.op;
    else if (exit) applyOut(exit.kind, relOut, a, iris);
  }
  return {
    opacity: a.op,
    transform: `translate(${a.tx.toFixed(2)}px, ${a.ty.toFixed(2)}px) scale(${a.sc.toFixed(4)}) skew(${a.skx.toFixed(2)}deg, ${a.sky.toFixed(2)}deg)`,
    filter: a.blur > 0.3 ? `blur(${a.blur.toFixed(2)}px)` : undefined,
    clipPath: a.clip,
    WebkitClipPath: a.clip,
  };
}

/** Impacts that shake the camera, from the same cues the score hits. */
export const HITS: readonly Hit[] = [
  ...CUE.words.map((at) => ({ at, amp: 2.5, dur: 0.22 })),
  { at: CUE.forged, amp: 4, dur: 0.3 },
  { at: CUE.logo, amp: 9, dur: 0.55 },
  { at: CUE.pr, amp: 4, dur: 0.35 },
  { at: CUE.rankUp, amp: 3, dur: 0.3 },
  { at: CUE.win, amp: 3, dur: 0.3 },
  { at: 22.5, amp: 3, dur: 0.25 },
  { at: CUE.impact, amp: 11, dur: 0.7 },
  { at: CUE.finalHit, amp: 3, dur: 0.3 },
];

/** Shake on impacts plus a small bounce on every kick of the groove. Calm mode holds still. */
export function cameraStyle(time: number, calm: boolean): CSSProperties | undefined {
  if (calm) return undefined;
  const s = shake(time, HITS);
  let bounce = 0;
  if (time >= CUE.drop && time < CUE.gap) {
    const beat = CUE.drop + Math.floor((time - CUE.drop) / BEAT) * BEAT;
    bounce = pulse(time, beat, 0.2, 0.007);
  }
  return { transform: `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) rotate(${s.r.toFixed(3)}deg) scale(${1 + bounce})` };
}
