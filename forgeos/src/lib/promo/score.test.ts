import { describe, expect, it } from 'vitest';
import { CHORDS, GROOVE_END, GROOVE_START, buildScore, kickTimes, midiHz } from './score';
import { BEAT, CUE, CUTS, DURATION } from './schedule';

const score = buildScore();
const at = (voice: string, t: number) => score.some((e) => e.voice === voice && Math.abs(e.at - t) < 1e-9);

describe('the soundtrack', () => {
  it('is sorted and stays inside the 30 seconds', () => {
    for (let i = 1; i < score.length; i++) expect(score[i].at).toBeGreaterThanOrEqual(score[i - 1].at);
    expect(score.every((e) => e.at >= 0 && e.at < DURATION)).toBe(true);
  });

  it('hits the anvil on every hook word, the logo and the finale', () => {
    for (const t of [...CUE.words, CUE.forged, CUE.logo, CUE.impact]) expect(at('anvil', t), `anvil at ${t}`).toBe(true);
  });

  it('gives each on-screen moment its own sound at the same instant', () => {
    for (const t of CUE.sets) expect(at('blip', t)).toBe(true);
    expect(at('chime', CUE.pr)).toBe(true);
    expect(at('chime', CUE.rankUp)).toBe(true);
    expect(at('shutter', CUE.shutter)).toBe(true);
    expect(at('chime', CUE.win)).toBe(true);
    expect(at('chime', CUE.cta)).toBe(true);
    expect(at('impact', CUE.logo)).toBe(true);
    expect(at('impact', CUE.impact)).toBe(true);
  });

  it('marks every transition with a whoosh leading into it, or an impact on it', () => {
    for (const c of CUTS) {
      const near = score.some((e) => ['whoosh', 'impact', 'reverse'].includes(e.voice) && e.at <= c.at && c.at - e.at <= 0.5);
      expect(near, `cut at ${c.at}`).toBe(true);
    }
  });

  it('drives four on the floor from the drop to the build, on the beat', () => {
    const groove = score.filter((e) => e.voice === 'kick' && e.at >= GROOVE_START && e.at < GROOVE_END).map((e) => e.at);
    expect(groove.length).toBe((GROOVE_END - GROOVE_START) / BEAT);
    for (const t of groove) expect(Math.abs(t / BEAT - Math.round(t / BEAT))).toBeLessThan(1e-9);
  });

  it('pumps the sidechain once per kick, even where an impact lands on a kick', () => {
    const kicks = kickTimes(score);
    expect(new Set(kicks).size).toBe(kicks.length);
    expect(kicks).toContain(22.5);
  });

  it('leaves the pre-drop gap empty of drums and bass', () => {
    const inGap = score.filter((e) => e.at >= CUE.gap && e.at < CUE.impact);
    expect(inGap.filter((e) => ['kick', 'clap', 'hat', 'bass', 'pad', 'pluck'].includes(e.voice))).toEqual([]);
    expect(inGap.some((e) => e.voice === 'reverse')).toBe(true);
  });

  it('changes chord every bar and lands on A minor under the call to action', () => {
    expect(CHORDS[0].at).toBe(CUE.drop);
    expect(CHORDS[CHORDS.length - 1]).toMatchObject({ at: CUE.impact, root: 45 });
    expect(CHORDS[CHORDS.length - 1].at + CHORDS[CHORDS.length - 1].dur).toBe(DURATION);
  });

  it('tunes to concert pitch', () => {
    expect(midiHz(69)).toBe(440);
    expect(midiHz(57)).toBeCloseTo(220, 6);
  });
});
