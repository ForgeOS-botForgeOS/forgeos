import { describe, expect, it } from 'vitest';
import { BEAT, CHAPTERS, CUE, CUTS, DURATION, SCENES, SKIP_TO, isLive, sceneAt, sceneById } from './schedule';

const onGrid = (t: number, step: number) => Math.abs(t / step - Math.round(t / step)) < 1e-9;
const allCues = (): number[] => Object.values(CUE).flatMap((v) => (Array.isArray(v) ? v : [v as number]));

describe('the edit', () => {
  it('runs exactly 30 seconds with no gaps or overlaps between scenes', () => {
    expect(DURATION).toBe(30);
    expect(SCENES[0].start).toBe(0);
    expect(SCENES[SCENES.length - 1].end).toBe(DURATION);
    for (let i = 1; i < SCENES.length; i++) expect(SCENES[i].start).toBe(SCENES[i - 1].end);
  });

  it('cuts on the beat, once per scene change', () => {
    expect(CUTS.map((c) => c.at)).toEqual(SCENES.slice(1).map((s) => s.start));
    for (const c of CUTS) expect(onGrid(c.at, BEAT), `cut at ${c.at}`).toBe(true);
  });

  it('puts every cue on the sixteenth-note grid, inside the film', () => {
    for (const t of allCues()) {
      expect(onGrid(t, BEAT / 4), `cue at ${t}`).toBe(true);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(DURATION);
    }
  });

  it('keeps each chapter\'s moments inside its own scene', () => {
    const inside = (id: Parameters<typeof sceneById>[0], ts: readonly number[]) => {
      const s = sceneById(id);
      for (const t of ts) expect(t >= s.start && t < s.end, `${id} cue ${t}`).toBe(true);
    };
    inside('hook', [...CUE.words, CUE.forged, CUE.implode]);
    inside('train', [...CUE.sets, ...CUE.chipsTrain, CUE.pr]);
    inside('level', [...CUE.xp, CUE.rankUp, CUE.achievements]);
    inside('food', [CUE.shutter, ...CUE.detect, CUE.macros, ...CUE.chipsFood]);
    inside('coach', [CUE.ask, CUE.send, CUE.reply, CUE.chipCoach]);
    inside('social', [CUE.raceStart, ...CUE.chipsSocial, CUE.win]);
    inside('recover', [CUE.ring, CUE.tier, ...CUE.stats, CUE.notify]);
    inside('progress', [CUE.chart, ...CUE.prMarks, CUE.wrapped, ...CUE.chipsProgress]);
    inside('yours', [...CUE.looks, ...CUE.chipsYours]);
    inside('finale', [CUE.impact, CUE.cta, CUE.finalHit]);
  });

  it('numbers the eight feature chapters in order of appearance', () => {
    const order = SCENES.filter((s) => CHAPTERS[s.id]).map((s) => CHAPTERS[s.id]);
    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('skips to the finale, before the download button appears', () => {
    expect(sceneAt(SKIP_TO).id).toBe('finale');
    expect(SKIP_TO).toBeLessThan(CUE.cta);
    expect(CUE.cta).toBeLessThan(DURATION - 2);
  });

  it('keeps the finale on screen after the end, and overlaps neighbours during cuts', () => {
    expect(sceneAt(99).id).toBe('finale');
    expect(isLive(sceneById('finale'), 45)).toBe(true);
    expect(isLive(sceneById('train'), 3.9)).toBe(true);
    expect(isLive(sceneById('train'), 7.1)).toBe(true);
    expect(isLive(sceneById('train'), 8)).toBe(false);
  });
});
