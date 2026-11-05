import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildWorkoutWrap, type WorkoutWrap, type WrapSlide } from './workoutWrap';
import { buildRecap, RECAP_MAX_PRS, type Recap } from './wrapRecap';
import { dataUrlToFile, shareImage } from './shareImage';
import { WRAP_EN, WRAP_SK } from './wrapCopy';
import type { PR, Workout } from '../types';

const tFor = (dict: Record<string, string>) => (k: string, p?: Record<string, string | number>) =>
  (dict[k] ?? k).replace(/\{(\w+)\}/g, (_, name: string) => String(p?.[name] ?? `{${name}}`));
const t = tFor(WRAP_EN);
const recapOf = (wrap: WorkoutWrap, tr = t) => buildRecap(wrap, tr, 'en', 'Tue, 3 Nov', '🏆');

let n = 0;
const lift = (date: string, blocks: [string, [number, number][]][], over: Partial<Workout> = {}): Workout => ({
  id: `r${++n}`, name: 'Push Day', date, completed: true, durationSec: 50 * 60,
  exercises: blocks.map(([exerciseId, sets], b) => ({
    id: `e${n}-${b}`, exerciseId, sets: sets.map(([kg, reps], i) => ({ id: `s${n}-${b}-${i}`, weightKg: kg, reps, completed: true })),
  })),
  ...over,
});
const pr = (name: string, exerciseId: string, kg: number, date: string): PR => ({ id: `p${++n}`, exerciseId, exerciseName: name, weightKg: kg, reps: 1, e1rm: kg, date });

// Which part of the recap carries each story slide.
const carried = (r: Recap, slide: WrapSlide): boolean => {
  const kinds = r.sections.map((s) => s.kind);
  switch (slide) {
    case 'intro': return !!r.title && !!r.line && !!r.meta;
    case 'number': return r.big.unit.includes('kg') && r.stats.length >= 3;
    case 'hero': return kinds.includes('top');
    case 'prs': return kinds.includes('prs');
    case 'muscles': return kinds.includes('muscles');
    case 'versus': return kinds.includes('versus');
    case 'comeback': return kinds.includes('comeback');
    case 'cardio': return r.big.unit === 'km' && r.stats.length > 0;
    case 'outro': return true;
  }
};

describe('wrap recap: every slide on one page', () => {
  const prev = lift('2026-11-01T18:00:00', [['pow-3', [[80, 8], [80, 8]]]]);
  const today = lift('2026-11-03T18:00:00', [['pow-3', [[100, 3], [90, 8]]], ['pow-1', [[120, 5], [120, 5]]]]);
  const prs = [pr('Bench Press', 'pow-3', 100, '2026-11-03T18:30:00')];

  it('carries the content of every slide the story showed', () => {
    const wrap = buildWorkoutWrap(today, [prev, today], prs);
    expect(wrap.slides).toEqual(['intro', 'number', 'hero', 'prs', 'muscles', 'versus', 'outro']);
    const r = recapOf(wrap);
    for (const s of wrap.slides) expect(carried(r, s), s).toBe(true);
  });

  it('shows the real numbers, not placeholders', () => {
    const r = recapOf(buildWorkoutWrap(today, [prev, today], prs));
    expect(r.title).toBe('Record Breaker');
    expect(r.name).toBe('Push Day');
    expect(r.big.value).toBe('2,220');
    expect(r.big.caption).toMatch(/grand piano|grizzly bear|family car/);
    expect(r.stats.map((s) => `${s.value} ${s.label}`)).toEqual(['4 sets', '21 reps', '2 exercises', '50 minutes']);
    expect(r.sections.find((s) => s.kind === 'top')).toMatchObject({ exercise: 'Back Squat', value: '120 kg × 5' });
    expect(r.sections.find((s) => s.kind === 'prs')).toMatchObject({ items: [{ name: 'Bench Press', value: '100 kg × 1' }], more: 0 });
    expect(r.sections.find((s) => s.kind === 'versus')).toMatchObject({ value: '+73%' });
    expect(r.meta).toBe('Tue, 3 Nov · Evening session 🌆 · Session #2');
  });

  it('lists at most three PRs and counts the rest', () => {
    const many = lift('2026-11-03T18:00:00', [['pow-1', [[100, 5]]], ['pow-2', [[140, 5]]], ['pow-3', [[90, 5]]], ['pow-4', [[130, 5]]], ['pow-5', [[80, 5]]]]);
    const all = ['pow-1', 'pow-2', 'pow-3', 'pow-4', 'pow-5'].map((id, i) => pr(`Lift ${i}`, id, 100 + i, '2026-11-03T18:40:00'));
    const s = recapOf(buildWorkoutWrap(many, [prev, many], all)).sections.find((x) => x.kind === 'prs');
    expect(s).toMatchObject({ more: 2 });
    expect(s && s.kind === 'prs' && s.items.length).toBe(RECAP_MAX_PRS);
  });

  it('a comeback day says how long the break was', () => {
    const back = lift('2026-11-20T18:00:00', [['pow-3', [[70, 8]]]]);
    const wrap = buildWorkoutWrap(back, [prev, back], []);
    expect(wrap.slides).toContain('comeback');
    expect(recapOf(wrap).sections[0]).toMatchObject({ kind: 'comeback', value: '19 days off' });
  });

  it('a run leads with distance and keeps pace and the change since last time', () => {
    const run = (date: string, km: number, min: number): Workout => ({ id: `c${++n}`, name: 'Run', date, completed: true, exercises: [], cardio: { machine: 'Treadmill', distanceKm: km, durationMin: min, calories: 380 } });
    const a = run('2026-11-01T07:00:00', 5, 30);
    const b = run('2026-11-03T07:00:00', 6, 33);
    const wrap = buildWorkoutWrap(b, [a, b], []);
    const r = recapOf(wrap);
    for (const s of wrap.slides) expect(carried(r, s), s).toBe(true);
    expect(r.big).toMatchObject({ value: '6', unit: 'km', caption: 'Treadmill' });
    expect(r.stats.map((s) => s.value)).toEqual(['33', '5:30', '10.9', '380']);
    expect(r.sections).toEqual([{ kind: 'cardio', label: 'Treadmill', value: '20% further than last time' }]);
  });

  it('a watch-only session is just its minutes', () => {
    const watch: Workout = { id: 'g9', name: 'Garmin strength', date: '2026-11-02T18:00:00', completed: true, exercises: [], durationSec: 42 * 60 };
    const r = recapOf(buildWorkoutWrap(watch, [prev, watch], []));
    expect(r.big).toEqual({ value: '42', unit: 'minutes' });
    expect(r.stats).toEqual([]);
    expect(r.sections).toEqual([]);
  });

  it('every string resolves in Slovak too', () => {
    const r = recapOf(buildWorkoutWrap(today, [prev, today], prs), tFor(WRAP_SK));
    expect(JSON.stringify(r)).not.toMatch(/ww\.|\{\w+\}/);
    expect(r.title).toBe('Lámač rekordov');
  });
});

describe('sharing the recap picture', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  afterEach(() => vi.unstubAllGlobals());

  it('turns the card into a named PNG file', () => {
    const f = dataUrlToFile(png, 'wrap.png')!;
    expect(f.name).toBe('wrap.png');
    expect(f.type).toBe('image/png');
    expect(f.size).toBe(8);
    expect(dataUrlToFile('not a data url', 'x.png')).toBeNull();
  });

  it('shares the picture with the link in the text where files can be shared', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareImage(png, 'wrap.png', 'Record Breaker', 'Push Day\nhttps://x/#/import-workout?w=1')).toBe('shared');
    expect(share.mock.calls[0][0].files[0].name).toBe('wrap.png');
    expect(share.mock.calls[0][0].text).toContain('import-workout');
  });

  it('reports unsupported in the Android WebView, so the link is shared instead', async () => {
    vi.stubGlobal('navigator', {});
    expect(await shareImage(png, 'wrap.png', 't', 'x')).toBe('unsupported');
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => false });
    expect(await shareImage(png, 'wrap.png', 't', 'x')).toBe('unsupported');
  });

  it('does nothing more when the user closes the share sheet', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' });
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort), canShare: () => true });
    expect(await shareImage(png, 'wrap.png', 't', 'x')).toBe('cancelled');
  });
});
