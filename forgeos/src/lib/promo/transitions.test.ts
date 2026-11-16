import { describe, expect, it } from 'vitest';
import { cameraStyle, frameStyle, staircase } from './transitions';
import { CUE, SCENES } from './schedule';

const IDENTITY = 'translate(0.00px, 0.00px) scale(1.0000) skew(0.00deg, 0.00deg)';

describe('scene transitions', () => {
  it('hands every cut over cleanly: the old scene is gone and the new one has settled', () => {
    for (let i = 1; i < SCENES.length; i++) {
      const [before, after] = [SCENES[i - 1], SCENES[i]];
      expect(frameStyle(before, after.start + 0.3, false).opacity, `${before.id} gone`).toBe(0);
      const settled = frameStyle(after, after.start + 0.6, false);
      expect(settled.opacity, `${after.id} visible`).toBe(1);
      expect(settled.transform, `${after.id} at rest`).toBe(IDENTITY);
      expect(settled.clipPath).toBeUndefined();
      expect(settled.filter).toBeUndefined();
    }
  });

  it('keeps a scene still and fully visible through the middle of its window', () => {
    for (const s of SCENES) {
      const mid = frameStyle(s, (s.start + s.end) / 2, false);
      expect(mid.opacity).toBe(1);
      expect(mid.transform).toBe(IDENTITY);
    }
  });

  it('only ever fades in calm mode: no movement, blur or clipping', () => {
    for (const s of SCENES) {
      for (let t = s.start - 0.2; t < s.end + 0.25; t += 0.05) {
        const st = frameStyle(s, t, true);
        expect(st.transform).toBe(IDENTITY);
        expect(st.filter).toBeUndefined();
        expect(st.clipPath).toBeUndefined();
      }
    }
  });

  it('lets a scene that stages its own entrance stay hidden until its cut', () => {
    const train = SCENES.find((s) => s.id === 'train')!;
    expect(frameStyle(train, train.start - 0.01, false, { ownIn: true }).opacity).toBe(0);
    expect(frameStyle(train, train.start, false, { ownIn: true }).opacity).toBe(1);
  });

  it('wipes the glitch slice from nothing to the whole frame', () => {
    expect(staircase(0)).not.toMatch(/[1-9]\d*(\.\d+)?% \d/);
    expect(staircase(1).match(/100% /g)?.length).toBe(16);
  });
});

describe('camera', () => {
  it('shakes on the logo slam and the finale impact, and holds still in calm mode', () => {
    expect(cameraStyle(CUE.logo + 0.05, false)?.transform).not.toContain('translate(0.00px, 0.00px)');
    expect(cameraStyle(CUE.impact + 0.05, false)?.transform).not.toContain('translate(0.00px, 0.00px)');
    expect(cameraStyle(CUE.impact + 0.05, true)).toBeUndefined();
  });

  it('comes to rest once the last hit has decayed', () => {
    expect(cameraStyle(29.9, false)?.transform).toBe('translate(0.00px, 0.00px) rotate(0.000deg) scale(1)');
  });
});
