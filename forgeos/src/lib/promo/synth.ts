// Web Audio voices for the trailer score (score.ts).
//
// Everything is synthesised: an anvil made of inharmonic partials, a kick from
// a falling sine, claps and hats from filtered noise, detuned-saw pads with a
// sidechain pump. No audio files, no licences, a few kilobytes of code.
//
// Two ways to play it:
//   createLiveAudio()  schedules just ahead of the visual clock (lookahead), so
//                      pause, skip and sound toggles stay sample-tight;
//   renderScoreWav()   renders all 30 seconds offline into a WAV, for the MP4.

import { rng } from './motion';
import { buildScore, kickTimes, midiHz, type SoundEvent } from './score';
import { DURATION } from './schedule';

interface Buses {
  ctx: BaseAudioContext;
  drums: GainNode;
  music: GainNode;
  fx: GainNode;
  verb: GainNode;
  noise: AudioBuffer;
}

const LEVEL: Record<SoundEvent['voice'], number> = {
  kick: 0.95, clap: 0.42, hat: 0.13, crash: 0.22, bass: 0.3, pad: 0.075, pluck: 0.06,
  blip: 0.16, tick: 0.09, anvil: 0.26, impact: 0.9, riser: 0.2, whoosh: 0.22,
  reverse: 0.32, shutter: 0.35, chime: 0.11,
};

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rand = rng(7);
  for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

function impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const rand = rng(11);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

/** Master chain: a glue compressor into the output. Returns the node voices feed. */
function createMaster(ctx: BaseAudioContext, destination: AudioNode): GainNode {
  const input = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 8;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  input.connect(comp).connect(out).connect(destination);
  return input;
}

function createBuses(ctx: BaseAudioContext, into: AudioNode): Buses {
  const mk = () => {
    const g = ctx.createGain();
    g.connect(into);
    return g;
  };
  const verb = ctx.createGain();
  verb.gain.value = 0.3;
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx, 2.4);
  verb.connect(conv).connect(into);
  return { ctx, drums: mk(), music: mk(), fx: mk(), verb, noise: noiseBuffer(ctx) };
}

/** An exponential decay envelope on a fresh gain node. */
function env(b: Buses, when: number, peak: number, attack: number, decay: number): GainNode {
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  return g;
}

function osc(b: Buses, type: OscillatorType, freq: number, when: number, stop: number): OscillatorNode {
  const o = b.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.start(when);
  o.stop(stop);
  return o;
}

function noise(b: Buses, when: number, dur: number): AudioBufferSourceNode {
  const s = b.ctx.createBufferSource();
  s.buffer = b.noise;
  s.loop = true;
  s.start(when, (when * 0.37) % 0.9);
  s.stop(when + dur);
  return s;
}

function filter(b: Buses, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = b.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function kick(b: Buses, when: number, gain: number, deep = false): void {
  const o = osc(b, 'sine', deep ? 120 : 150, when, when + (deep ? 1.1 : 0.45));
  o.frequency.exponentialRampToValueAtTime(deep ? 30 : 42, when + (deep ? 0.35 : 0.13));
  o.connect(env(b, when, gain, 0.004, deep ? 1 : 0.4)).connect(b.drums);
  noise(b, when, 0.02).connect(filter(b, 'highpass', 3000)).connect(env(b, when, gain * 0.2, 0.001, 0.015)).connect(b.drums);
}

function clap(b: Buses, when: number, gain: number): void {
  const bp = filter(b, 'bandpass', 1500, 0.9);
  bp.connect(b.drums);
  bp.connect(b.verb);
  for (const [dt, len, k] of [[0, 0.03, 1], [0.011, 0.03, 0.8], [0.023, 0.18, 0.9]] as const) {
    noise(b, when + dt, len + 0.02).connect(env(b, when + dt, gain * k, 0.001, len)).connect(bp);
  }
}

function hat(b: Buses, when: number, gain: number, len: number): void {
  noise(b, when, len + 0.02).connect(filter(b, 'highpass', 7500)).connect(env(b, when, gain, 0.001, len)).connect(b.drums);
}

function bass(b: Buses, when: number, note: number, dur: number, gain: number): void {
  const lp = filter(b, 'lowpass', 300, 6);
  lp.frequency.setValueAtTime(300, when);
  lp.frequency.exponentialRampToValueAtTime(1500, when + 0.02);
  lp.frequency.exponentialRampToValueAtTime(380, when + dur);
  const g = env(b, when, gain, 0.005, dur);
  lp.connect(g).connect(b.music);
  for (const cents of [-6, 6]) {
    const o = osc(b, 'sawtooth', midiHz(note), when, when + dur + 0.05);
    o.detune.value = cents;
    o.connect(lp);
  }
  osc(b, 'sine', midiHz(note - 12), when, when + dur + 0.05).connect(g);
}

function pad(b: Buses, when: number, notes: readonly number[], dur: number, gain: number): void {
  const lp = filter(b, 'lowpass', 1100, 0.5);
  const g = b.ctx.createGain();
  const release = Math.min(0.6, dur * 0.4);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + Math.min(0.25, dur * 0.3));
  g.gain.setValueAtTime(gain, when + dur - release);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  lp.connect(g);
  g.connect(b.music);
  g.connect(b.verb);
  for (const n of notes) {
    for (const cents of [-9, 8]) {
      const o = osc(b, 'sawtooth', midiHz(n), when, when + dur + 0.05);
      o.detune.value = cents;
      o.connect(lp);
    }
  }
}

function tone(b: Buses, when: number, note: number, gain: number, decay: number, out: AudioNode, type: OscillatorType = 'sine'): void {
  const g = env(b, when, gain, 0.003, decay);
  g.connect(out);
  g.connect(b.verb);
  osc(b, type, midiHz(note), when, when + decay + 0.05).connect(g);
}

function anvil(b: Buses, when: number, note: number, gain: number): void {
  // Inharmonic partials of a struck metal bar: the "clang" of the forge.
  const partials = [[1, 1, 1.3], [2.76, 0.55, 0.75], [5.4, 0.35, 0.45], [8.93, 0.22, 0.3], [13.34, 0.12, 0.2]] as const;
  const f0 = midiHz(note);
  for (const [ratio, amp, decay] of partials) {
    const g = env(b, when, gain * amp, 0.002, decay);
    g.connect(b.fx);
    g.connect(b.verb);
    osc(b, 'sine', f0 * ratio, when, when + decay + 0.05).connect(g);
  }
  noise(b, when, 0.03).connect(filter(b, 'bandpass', 3200, 1.5)).connect(env(b, when, gain * 0.5, 0.001, 0.025)).connect(b.fx);
}

function crash(b: Buses, when: number, gain: number, len = 1.3): void {
  const hp = filter(b, 'highpass', 3800);
  hp.connect(env(b, when, gain, 0.002, len)).connect(b.drums);
  noise(b, when, len + 0.05).connect(hp);
}

function impact(b: Buses, when: number, gain: number): void {
  kick(b, when, gain, true);
  const sub = osc(b, 'sine', 55, when, when + 1.5);
  sub.frequency.exponentialRampToValueAtTime(32, when + 1.4);
  sub.connect(env(b, when, gain * 0.7, 0.005, 1.4)).connect(b.drums);
  const lp = filter(b, 'lowpass', 9000);
  lp.frequency.setValueAtTime(9000, when);
  lp.frequency.exponentialRampToValueAtTime(400, when + 1.2);
  const g = env(b, when, gain * 0.5, 0.002, 1.2);
  lp.connect(g);
  g.connect(b.drums);
  g.connect(b.verb);
  noise(b, when, 1.3).connect(lp);
}

function sweepNoise(b: Buses, when: number, dur: number, gain: number, from: number, to: number, rising: boolean): void {
  const bp = filter(b, 'bandpass', from, rising ? 3 : 1.2);
  bp.frequency.setValueAtTime(from, when);
  bp.frequency.exponentialRampToValueAtTime(to, when + dur);
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  if (rising) {
    g.gain.exponentialRampToValueAtTime(gain, when + dur);
    g.gain.setValueAtTime(0.0001, when + dur + 0.005);
  } else {
    g.gain.linearRampToValueAtTime(gain, when + dur * 0.55);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
  }
  bp.connect(g).connect(b.fx);
  noise(b, when, dur + 0.02).connect(bp);
}

function riser(b: Buses, when: number, dur: number, gain: number): void {
  sweepNoise(b, when, dur, gain, 300, 7000, true);
  const o = osc(b, 'sawtooth', 110, when, when + dur);
  o.frequency.exponentialRampToValueAtTime(880, when + dur);
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain * 0.35, when + dur);
  o.connect(filter(b, 'lowpass', 2200)).connect(g).connect(b.fx);
}

function shutter(b: Buses, when: number, gain: number): void {
  for (const dt of [0, 0.045]) {
    noise(b, when + dt, 0.03).connect(filter(b, 'highpass', 2000)).connect(env(b, when + dt, gain, 0.001, 0.02)).connect(b.fx);
  }
  osc(b, 'sine', 120, when, when + 0.06).connect(env(b, when, gain * 0.6, 0.002, 0.04)).connect(b.fx);
}

function playEvent(b: Buses, e: SoundEvent, when: number): void {
  const gain = LEVEL[e.voice] * (e.gain ?? 1);
  const notes = e.notes ?? [69];
  const dur = e.dur ?? 0.25;
  switch (e.voice) {
    case 'kick': return kick(b, when, gain);
    case 'clap': return clap(b, when, gain);
    case 'hat': return hat(b, when, gain, 0.045);
    case 'crash': return crash(b, when, gain);
    case 'bass': return bass(b, when, notes[0], dur, gain);
    case 'pad': return pad(b, when, notes, dur, gain);
    case 'pluck': return tone(b, when, notes[0], gain, 0.18, b.music, 'triangle');
    case 'blip': return tone(b, when, notes[0], gain, 0.14, b.fx);
    case 'tick': return tone(b, when, 103, gain, 0.018, b.fx, 'square');
    case 'anvil': return anvil(b, when, notes[0], gain);
    case 'impact': return impact(b, when, gain);
    case 'riser': return riser(b, when, dur, gain);
    case 'whoosh': return sweepNoise(b, when, dur, gain, 500, 3500, false);
    case 'reverse': return sweepNoise(b, when, dur, gain, 200, 8000, true);
    case 'shutter': return shutter(b, when, gain);
    case 'chime':
      notes.forEach((n, i) => tone(b, when + i * 0.06, n, gain, 0.7, b.fx));
      return;
  }
}

/** Sidechain pump: bass and pads duck under every kick, the EDM breathing. */
function pump(b: Buses, kickAt: number): void {
  const g = b.music.gain;
  g.setValueAtTime(0.3, kickAt);
  g.linearRampToValueAtTime(1, kickAt + 0.22);
}

export interface LiveAudio {
  /** Starts the score in step with the visual clock; `now` reads the trailer time. */
  start(now: () => number): void;
  /** Silences everything scheduled and stops scheduling (pause, skip, sound off). */
  stop(): void;
  close(): void;
}

type AudioCtor = typeof AudioContext;

/** A live player, or null where Web Audio is missing. Create it inside a tap (autoplay rules). */
export function createLiveAudio(): LiveAudio | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor({ latencyHint: 'interactive' });
  const input = createMaster(ctx, ctx.destination);
  const score = buildScore();
  const kicks = new Set(kickTimes(score));
  let timer: number | undefined;
  let session: GainNode | null = null;
  let generation = 0;

  const stop = () => {
    generation += 1;
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    const s = session;
    session = null;
    if (!s) return;
    s.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    window.setTimeout(() => s.disconnect(), 200);
  };

  const start = (now: () => number) => {
    stop();
    const mine = generation;
    void ctx.resume().then(() => {
      if (mine !== generation) return; // stopped again before the device woke up
      const s = ctx.createGain();
      s.connect(input);
      session = s;
      const buses = createBuses(ctx, s);
      const latency = ctx.outputLatency || ctx.baseLatency || 0;
      const from = now();
      const base = ctx.currentTime - latency;
      let i = score.findIndex((e) => e.at >= from);
      if (i < 0) i = score.length;
      const schedule = () => {
        const horizon = ctx.currentTime + 0.25;
        while (i < score.length && base + (score[i].at - from) < horizon) {
          const e = score[i++];
          const when = Math.max(ctx.currentTime, base + (e.at - from));
          playEvent(buses, e, when);
          if (kicks.has(e.at)) pump(buses, when);
        }
      };
      schedule();
      timer = window.setInterval(schedule, 40);
    }).catch(() => {
      /* closed or interrupted before the device woke up: stay silent */
    });
  };

  return { start, stop, close: () => { stop(); void ctx.close().catch(() => undefined); } };
}

/** Renders the whole score offline and returns a 16-bit stereo WAV file. */
export async function renderScoreWav(sampleRate = 48000): Promise<ArrayBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * sampleRate), sampleRate);
  const buses = createBuses(ctx, createMaster(ctx, ctx.destination));
  const score = buildScore();
  for (const e of score) playEvent(buses, e, e.at);
  for (const k of kickTimes(score)) pump(buses, k);
  return encodeWav(await ctx.startRendering());
}

function encodeWav(buf: AudioBuffer): ArrayBuffer {
  const ch = buf.numberOfChannels;
  const len = buf.length;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  out.setUint32(4, 36 + len * ch * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, len * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out.buffer;
}
