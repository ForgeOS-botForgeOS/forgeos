// The trailer's soundtrack as data: a list of timed notes and hits.
//
// It is synthesised in the browser (synth.ts) instead of shipped as an audio
// file, which keeps it tiny, licence-free, and in sync by construction: every
// hit is placed from the same cue table the picture uses (schedule.ts).
//
// Arrangement: a ticking intro with an anvil strike on each word, a riser into
// the logo slam, a four-on-the-floor groove from the drop (A minor:
// Am F C G), a snare roll and half a beat of silence before the final impact,
// then a sustained chord under the call to action.

import { BEAT, CUE, CUTS, DURATION } from './schedule';

export type Voice =
  | 'kick'
  | 'clap'
  | 'hat'
  | 'crash'
  | 'bass'
  | 'pad'
  | 'pluck'
  | 'blip'
  | 'tick'
  | 'anvil'
  | 'impact'
  | 'riser'
  | 'whoosh'
  | 'reverse'
  | 'shutter'
  | 'chime';

export interface SoundEvent {
  /** Seconds on the trailer timeline. */
  at: number;
  voice: Voice;
  /** Length in seconds, for sustained voices. */
  dur?: number;
  /** MIDI note numbers (one for a note, several for a chord or a chime arpeggio). */
  notes?: readonly number[];
  /** Level relative to the voice's own default. */
  gain?: number;
}

/** The groove runs from the drop until the pre-drop gap. */
export const GROOVE_START = CUE.drop;
export const GROOVE_END = CUE.gap;

interface Chord {
  at: number;
  dur: number;
  root: number;
  notes: readonly number[];
}

const AM = { root: 45, notes: [57, 60, 64] };
const F = { root: 41, notes: [57, 60, 65] };
const C = { root: 48, notes: [55, 60, 64] };
const G = { root: 43, notes: [55, 59, 62] };
const E = { root: 40, notes: [56, 59, 64] };

/** One chord per bar (two seconds), with a dominant turn in the build. */
export const CHORDS: readonly Chord[] = [
  ...[AM, F, C, G, AM, F, C, G, AM, F].map((c, i) => ({ at: GROOVE_START + i * 2, dur: 2, ...c })),
  { at: 24, dur: 1, ...G },
  { at: 25, dur: 0.5, ...E },
  { at: CUE.impact, dur: DURATION - CUE.impact, root: 45, notes: [57, 60, 64, 71] },
];

function chordAt(t: number): Chord {
  let current = CHORDS[0];
  for (const c of CHORDS) if (c.at <= t + 1e-9) current = c;
  return current;
}

/** Times from `start` (inclusive) to `end` (exclusive) every `step`, kept on a clean grid. */
function grid(start: number, end: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; start + i * step < end - 1e-9; i++) out.push(Math.round((start + i * step) * 1000) / 1000);
  return out;
}

function intro(): SoundEvent[] {
  const ev: SoundEvent[] = grid(0, CUE.forged, BEAT / 2).map((at) => ({ at, voice: 'tick', gain: at < 0.5 ? 0.5 : 0.8 }));
  const pitches = [81, 84, 88];
  CUE.words.forEach((at, i) => {
    ev.push({ at, voice: 'kick', gain: 0.8 }, { at, voice: 'anvil', notes: [pitches[i]], gain: 0.75 });
  });
  ev.push(
    { at: CUE.forged, voice: 'kick' },
    { at: CUE.forged, voice: 'anvil', notes: [69], gain: 1 },
    { at: CUE.forged, voice: 'crash', gain: 0.5 },
    { at: CUE.forged, voice: 'riser', dur: CUE.logo - CUE.forged },
    { at: CUE.logo, voice: 'impact', gain: 1 },
    { at: CUE.logo, voice: 'anvil', notes: [57], gain: 0.9 },
    { at: CUE.logo, voice: 'pad', dur: CUE.drop - CUE.logo, notes: AM.notes, gain: 0.7 },
    { at: CUE.zoomThrough - 0.25, voice: 'reverse', dur: CUE.drop - CUE.zoomThrough + 0.25 },
  );
  for (const at of grid(3.5, CUE.drop, BEAT / 4)) ev.push({ at, voice: 'hat', gain: 0.25 + (at - 3.5) });
  return ev;
}

function drums(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  for (const at of grid(GROOVE_START, GROOVE_END, BEAT)) ev.push({ at, voice: 'kick' });
  for (const at of grid(GROOVE_START + BEAT, CUE.wall, BEAT * 2)) ev.push({ at, voice: 'clap' });
  for (const at of grid(GROOVE_START + BEAT / 2, CUE.wall, BEAT)) ev.push({ at, voice: 'hat' });
  // Second half gets busier: sixteenth ghost hats from the food chapter on.
  for (const at of grid(CUE.shutter - BEAT, CUE.wall, BEAT / 2)) ev.push({ at: at + BEAT / 4, voice: 'hat', gain: 0.4 });
  for (const at of [CUE.drop, 9.5, 15, 20]) ev.push({ at, voice: 'crash', gain: 0.7 });
  return ev;
}

function bassline(): SoundEvent[] {
  // Driving octave eighths that follow the chords.
  return grid(GROOVE_START, GROOVE_END, BEAT / 2).map((at, i) => {
    const { root } = chordAt(at);
    return { at, voice: 'bass' as const, notes: [i % 2 === 0 ? root : root + 12], dur: 0.2 };
  });
}

function pads(): SoundEvent[] {
  return CHORDS.filter((c) => c.at < CUE.gap || c.at >= CUE.impact).map((c) => ({
    at: c.at,
    voice: 'pad' as const,
    dur: Math.min(c.dur, c.at < CUE.gap ? CUE.gap - c.at : c.dur),
    notes: c.notes,
    gain: c.at >= CUE.impact ? 1.2 : 1,
  }));
}

function arps(): SoundEvent[] {
  // A plucked arpeggio lifts the second half (AI trainer onwards).
  return grid(CUE.ask - BEAT / 2, CUE.wall, BEAT / 2).map((at, i) => {
    const { notes } = chordAt(at);
    const pattern = [0, 1, 2, 1];
    return { at, voice: 'pluck' as const, notes: [notes[pattern[i % 4]] + 12], gain: 0.8 };
  });
}

const blip = (at: number, note: number, gain = 1): SoundEvent => ({ at, voice: 'blip', notes: [note], gain });
const tick = (at: number, gain = 0.6): SoundEvent => ({ at, voice: 'tick', gain });
const chime = (at: number, notes: readonly number[], gain = 1): SoundEvent => ({ at, voice: 'chime', notes, gain });

function trainAndRank(): SoundEvent[] {
  return [
    ...CUE.sets.map((at, i) => blip(at, [81, 84, 88][i])),
    ...CUE.chipsTrain.map((at) => tick(at, 0.45)),
    { at: CUE.pr, voice: 'anvil', notes: [81], gain: 0.8 },
    chime(CUE.pr, [81, 84, 88, 93]),
    ...CUE.xp.map((at, i) => blip(at, [88, 91][i])),
    tick(CUE.streak),
    blip(CUE.coins + 0.06, 96, 0.7),
    blip(CUE.coins + 0.12, 100, 0.6),
    chime(CUE.rankUp, [81, 84, 88, 93, 96], 1.1),
    { at: CUE.rankUp, voice: 'crash', gain: 0.6 },
    blip(CUE.achievements, 93, 0.8),
  ];
}

function foodAndCoach(): SoundEvent[] {
  return [
    { at: CUE.shutter, voice: 'shutter' },
    { at: CUE.shutter + 0.05, voice: 'whoosh', dur: 0.45, gain: 0.35 },
    ...CUE.detect.map((at, i) => blip(at, [76, 79, 83][i])),
    chime(CUE.macros, [88, 93], 0.8),
    ...CUE.chipsFood.map((at) => tick(at, 0.45)),
    ...grid(CUE.ask, CUE.send - 0.05, 0.065).map((at) => tick(at, 0.3)),
    blip(CUE.send, 84),
    ...grid(CUE.reply, CUE.reply + 0.8, 0.16).map((at) => tick(at, 0.35)),
    tick(CUE.chipCoach, 0.45),
  ];
}

function socialAndRecovery(): SoundEvent[] {
  return [
    ...grid(CUE.raceStart, CUE.win, BEAT / 2).map((at) => tick(at, 0.3)),
    ...CUE.chipsSocial.map((at) => tick(at, 0.45)),
    chime(CUE.win, [81, 88, 93], 1.1),
    { at: CUE.ring, voice: 'riser', dur: CUE.tier - CUE.ring, gain: 0.45 },
    tick(CUE.chipRecover, 0.45),
    chime(CUE.tier, [88, 93]),
    ...CUE.stats.slice(1).map((at) => tick(at, 0.5)),
    chime(CUE.notify, [88, 93], 0.7),
  ];
}

function progressAndLooks(): SoundEvent[] {
  return [
    { at: CUE.chart, voice: 'whoosh', dur: 0.6, gain: 0.3 },
    ...CUE.prMarks.map((at, i) => blip(at, [88, 93][i])),
    { at: CUE.wrapped - 0.1, voice: 'whoosh', dur: 0.3, gain: 0.5 },
    blip(CUE.wrapped + 0.1, 96, 0.7),
    ...CUE.chipsProgress.map((at) => tick(at, 0.45)),
    ...CUE.looks.map((at, i) => blip(at, [81, 84, 88, 91][i])),
    ...CUE.chipsYours.map((at) => tick(at, 0.4)),
  ];
}

function transitions(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  for (const c of CUTS) {
    if (c.kind === 'slam') continue; // the intro and finale stage their own impacts
    if (c.kind === 'cut') ev.push({ at: c.at, voice: 'impact', gain: 0.45 });
    else if (c.kind === 'zoom' && c.at === CUE.drop) continue; // the reverse swell leads in
    else ev.push({ at: c.at - 0.2, voice: 'whoosh', dur: 0.4 });
  }
  return ev;
}

function buildAndFinale(): SoundEvent[] {
  const roll = grid(CUE.wall, CUE.gap, BEAT / 4).map((at) => ({
    at,
    voice: 'clap' as const,
    gain: 0.25 + 0.75 * ((at - CUE.wall) / (CUE.gap - CUE.wall)),
  }));
  return [
    ...roll,
    { at: CUE.wall, voice: 'riser', dur: CUE.gap - CUE.wall, gain: 1.1 },
    { at: CUE.gap + 0.1, voice: 'reverse', dur: CUE.impact - CUE.gap - 0.1, gain: 1 },
    { at: CUE.impact, voice: 'impact', gain: 1.15 },
    { at: CUE.impact, voice: 'anvil', notes: [57], gain: 1 },
    { at: CUE.impact, voice: 'crash' },
    tick(CUE.claims, 0.5),
    chime(CUE.cta, [81, 88, 93, 100], 1.1),
    { at: CUE.ctaSub, voice: 'kick', gain: 0.6 },
    { at: CUE.finalHit, voice: 'anvil', notes: [69], gain: 0.8 },
    { at: CUE.finalHit, voice: 'kick', gain: 0.8 },
    { at: CUE.finalHit, voice: 'crash', gain: 0.5 },
  ];
}

/** The whole soundtrack, sorted by time. */
export function buildScore(): SoundEvent[] {
  return [
    ...intro(),
    ...drums(),
    ...bassline(),
    ...pads(),
    ...arps(),
    ...trainAndRank(),
    ...foodAndCoach(),
    ...socialAndRecovery(),
    ...progressAndLooks(),
    ...transitions(),
    ...buildAndFinale(),
  ]
    .filter((e) => e.at >= 0 && e.at < DURATION)
    .sort((a, b) => a.at - b.at);
}

/** Kick times, once each, for the sidechain "pump" the synth applies to bass and pads. */
export function kickTimes(score: readonly SoundEvent[]): number[] {
  return [...new Set(score.filter((e) => e.voice === 'kick' || e.voice === 'impact').map((e) => e.at))];
}

/** MIDI note number to frequency in Hz. */
export function midiHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
