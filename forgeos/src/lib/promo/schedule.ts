// The trailer's edit decision list: every scene, cut and cue, in seconds.
//
// The picture (components/promo) and the soundtrack (score.ts) both read from
// this one table, so a cut can never drift off its beat: moving a cue here
// moves the visual moment and its sound together.
//
// 120 BPM, so one beat is half a second and every cut lands on the beat grid.

export const DURATION = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;

/** The stage is designed at 360 x 640 (9:16) and scaled to fit the screen. */
export const STAGE_W = 360;
export const STAGE_H = 640;

export type SceneId =
  | 'hook'
  | 'logo'
  | 'train'
  | 'level'
  | 'food'
  | 'coach'
  | 'social'
  | 'recover'
  | 'progress'
  | 'yours'
  | 'wall'
  | 'finale';

export interface Scene {
  id: SceneId;
  start: number;
  end: number;
}

export const SCENES: readonly Scene[] = [
  { id: 'hook', start: 0, end: 3 },
  { id: 'logo', start: 3, end: 4 },
  { id: 'train', start: 4, end: 7 },
  { id: 'level', start: 7, end: 9.5 },
  { id: 'food', start: 9.5, end: 12.5 },
  { id: 'coach', start: 12.5, end: 15 },
  { id: 'social', start: 15, end: 17.5 },
  { id: 'recover', start: 17.5, end: 20 },
  { id: 'progress', start: 20, end: 22.5 },
  { id: 'yours', start: 22.5, end: 24.5 },
  { id: 'wall', start: 24.5, end: 26 },
  { id: 'finale', start: 26, end: DURATION },
];

/**
 * How each cut is made. `slam` is an impact the scenes stage themselves,
 * `zoom` pushes through the frame, `whip`/`whipUp` are motion-blurred pans,
 * `slice` is a glitch wipe in strips, `iris` closes on a circle and reopens,
 * `cut` is a hard cut with a flash. Calm mode turns all of them into fades.
 */
export type CutKind = 'slam' | 'zoom' | 'whip' | 'whipUp' | 'slice' | 'iris' | 'cut';

export interface Cut {
  at: number;
  kind: CutKind;
}

export const CUTS: readonly Cut[] = [
  { at: 3, kind: 'slam' },
  { at: 4, kind: 'zoom' },
  { at: 7, kind: 'whip' },
  { at: 9.5, kind: 'slice' },
  { at: 12.5, kind: 'whipUp' },
  { at: 15, kind: 'whip' },
  { at: 17.5, kind: 'zoom' },
  { at: 20, kind: 'iris' },
  { at: 22.5, kind: 'cut' },
  { at: 24.5, kind: 'slice' },
  { at: 26, kind: 'slam' },
];

/** Every visual moment that has a sound. Absolute seconds. */
export const CUE = {
  // Hook: "Every rep. Every meal. Every PR. Forged into one app."
  words: [0.5, 1, 1.5],
  forged: 2,
  forgedSub: 2.25,
  implode: 2.5,
  // Logo slam and the zoom through it
  logo: 3,
  wordmark: 3.25,
  tagline: 3.5,
  zoomThrough: 3.75,
  // 01 Train
  drop: 4,
  sets: [4.5, 5, 5.5],
  chipsTrain: [4.75, 5.25, 5.75],
  pr: 6,
  // 02 Rank up
  xp: [7.5, 8],
  streak: 7.75,
  coins: 8,
  rankUp: 8.5,
  achievements: 9,
  // 03 Food
  shutter: 10,
  detect: [10.5, 10.75, 11],
  macros: 11.25,
  chipsFood: [11.5, 11.75, 12],
  // 04 AI trainer
  ask: 12.75,
  send: 13.25,
  reply: 13.75,
  chipCoach: 14.25,
  // 05 Social
  raceStart: 15.25,
  chipsSocial: [16, 16.5],
  win: 17,
  // 06 Recovery
  ring: 17.75,
  chipRecover: 18,
  tier: 18.5,
  stats: [18.5, 18.75, 19],
  notify: 19.25,
  // 07 Progress
  chart: 20.25,
  prMarks: [20.75, 21],
  wrapped: 21.25,
  chipsProgress: [21.75, 22],
  // 08 Yours: one look per beat
  looks: [22.5, 23, 23.5, 24],
  chipsYours: [22.75, 23.25, 23.75, 24.25],
  // The wall of features, the pre-drop gap and the finale
  wall: 24.5,
  gap: 25.5,
  impact: 26,
  claims: 26.375,
  cta: 26.75,
  ctaSub: 27,
  finalHit: 28,
} as const;

/** Where "Skip" jumps to: the finale's impact, one beat before the button appears. */
export const SKIP_TO = CUE.impact;

/** Seconds a scene stays rendered before its start and after its end, for transitions to overlap. */
export const PREROLL = 0.2;
export const POSTROLL = 0.25;

export function sceneById(id: SceneId): Scene {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
}

/** The scene playing at `t` (the finale holds after the end). */
export function sceneAt(t: number): Scene {
  for (const s of SCENES) if (t < s.end) return s;
  return SCENES[SCENES.length - 1];
}

/** Whether a scene must be mounted at `t`, including its transition overlap. */
export function isLive(s: Scene, t: number): boolean {
  const last = s === SCENES[SCENES.length - 1];
  return t >= s.start - PREROLL && (last || t < s.end + POSTROLL);
}

export function cutAt(time: number): Cut | undefined {
  return CUTS.find((c) => Math.abs(c.at - time) < 1e-9);
}

/** Feature chapters, numbered as they appear (the HUD and the kickers read this). */
export const CHAPTERS: Partial<Record<SceneId, number>> = {
  train: 1,
  level: 2,
  food: 3,
  coach: 4,
  social: 5,
  recover: 6,
  progress: 7,
  yours: 8,
};

/** The ambient glow behind each scene, as two "r g b" colours (Tempo palette). */
export const GLOW: Record<SceneId, readonly [string, string]> = {
  hook: ['255 90 60', '14 17 22'],
  logo: ['47 230 196', '255 90 60'],
  train: ['47 230 196', '56 189 248'],
  level: ['255 210 74', '47 230 196'],
  food: ['52 211 153', '47 230 196'],
  coach: ['124 109 242', '47 230 196'],
  social: ['255 90 60', '47 230 196'],
  recover: ['52 211 153', '56 189 248'],
  progress: ['47 230 196', '255 90 60'],
  yours: ['236 72 153', '34 211 238'],
  wall: ['47 230 196', '255 90 60'],
  finale: ['47 230 196', '255 90 60'],
};
