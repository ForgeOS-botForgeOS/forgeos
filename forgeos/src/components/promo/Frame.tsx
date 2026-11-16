// The frame around the edit: the scene container that applies each cut
// (lib/promo/transitions.ts), and everything laid over the whole picture:
// flashes, streaks, glitch bars, film grain, vignette, the ambient glow, the
// rising embers and the telemetry HUD.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { clamp, prog, pulse, rng, sweep } from '../../lib/promo/motion';
import { CHAPTERS, CUE, CUTS, GLOW, SCENES, isLive, sceneAt, type Scene, type SceneId } from '../../lib/promo/schedule';
import { buildScore, type Voice } from '../../lib/promo/score';
import { frameStyle, type FrameOptions } from '../../lib/promo/transitions';
import { GOLD, HEAT, TEAL } from './kit';

interface SceneFrameProps {
  s: Scene;
  time: number;
  calm: boolean;
  opts?: FrameOptions;
  /** Decorative motion is hidden from screen readers; the finale (with its buttons) is not. */
  hidden?: boolean;
  children: ReactNode;
}

/** A scene container: mounted only around its window, styled by its cuts. */
export function SceneFrame({ s, time, calm, opts, hidden = true, children }: SceneFrameProps) {
  if (!isLive(s, time)) return null;
  const style = frameStyle(s, time, calm, opts);
  if (style.opacity === 0) return null;
  return (
    <div className="promo-scene" style={style} aria-hidden={hidden || undefined}>
      {children}
    </div>
  );
}

// ---- Overlays -----------------------------------------------------------

interface Flash {
  at: number;
  color: string;
  peak: number;
  dur: number;
}

const FLASHES: readonly Flash[] = [
  { at: CUE.forged, color: '#ffffff', peak: 0.25, dur: 0.18 },
  { at: CUE.logo, color: '#ffffff', peak: 0.85, dur: 0.3 },
  { at: CUE.pr, color: HEAT, peak: 0.35, dur: 0.3 },
  { at: CUE.rankUp, color: GOLD, peak: 0.3, dur: 0.3 },
  { at: CUE.win, color: TEAL, peak: 0.22, dur: 0.25 },
  { at: 22.5, color: '#ffffff', peak: 0.35, dur: 0.2 },
  { at: CUE.impact, color: '#ffffff', peak: 0.9, dur: 0.4 },
];

let grainUrl: string | null = null;

/** A tile of seeded noise, generated once, for the film grain. */
function grainTile(): string | null {
  if (grainUrl !== null) return grainUrl;
  try {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(96, 96);
    const rand = rng(3);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainUrl = c.toDataURL('image/png');
  } catch {
    grainUrl = null;
  }
  return grainUrl;
}

/** The teal panel that the logo zoom turns into, sweeping off to reveal chapter one. */
function TealWipe({ time }: { time: number }) {
  if (time < 3.9 || time > 4.42) return null;
  const rel = time - CUE.drop;
  const p = sweep(prog(rel, 0.02, 0.34));
  return (
    <div
      className="promo-abs"
      style={{
        width: 460,
        height: 640,
        left: -50,
        background: TEAL,
        opacity: clamp((time - 3.9) / 0.06),
        transform: `translateX(${-p * 112}%) skewX(-12deg)`,
      }}
    />
  );
}

/** A bright streak crossing the frame on whip cuts: the motion-blur "swish". */
function Streaks({ time }: { time: number }) {
  return (
    <>
      {CUTS.filter((c) => (c.kind === 'whip' || c.kind === 'whipUp') && Math.abs(time - c.at) < 0.16).map((c) => {
        const p = prog(time, c.at - 0.16, 0.32);
        const horizontal = c.kind === 'whip';
        const style: CSSProperties = horizontal
          ? { left: 0, top: 260, width: 360, height: 140, background: 'linear-gradient(90deg, transparent, rgb(237 241 246 / 0.22), transparent)', transform: `translateX(${(1 - p * 2) * 360}px) skewX(-20deg)` }
          : { left: 0, top: 0, width: 360, height: 220, background: 'linear-gradient(180deg, transparent, rgb(237 241 246 / 0.2), transparent)', transform: `translateY(${(1 - p * 2) * 640}px)` };
        return <div key={c.at} className="promo-abs" style={{ ...style, opacity: Math.sin(p * Math.PI) }} />;
      })}
    </>
  );
}

/** Thin coloured bars that flicker across the glitch cuts. */
function GlitchBars({ time }: { time: number }) {
  const cut = CUTS.find((c) => c.kind === 'slice' && time > c.at - 0.06 && time < c.at + 0.22);
  if (!cut) return null;
  const frame = Math.floor(time * 30);
  const rand = rng(frame);
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="promo-abs"
          style={{
            top: rand() * 620,
            left: rand() * 120 - 60,
            width: 200 + rand() * 260,
            height: 2 + rand() * 6,
            background: i % 2 ? HEAT : TEAL,
            opacity: 0.55,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </>
  );
}

/** Everything laid over the scenes: flashes, streaks, grain, vignette. */
/** Transition effects drawn inside the 9:16 frame, where the scenes are. */
export function Overlays({ time, calm }: { time: number; calm: boolean }) {
  if (calm) return null;
  return (
    <>
      <TealWipe time={time} />
      <Streaks time={time} />
      <GlitchBars time={time} />
    </>
  );
}

/**
 * Flashes, film grain and vignette over the whole screen, not just the frame:
 * on a tall phone or a wide monitor the 9:16 frame has room around it, and a
 * flash that stopped at its edge would show the frame as a grey rectangle.
 */
export function ScreenFx({ time, calm }: { time: number; calm: boolean }) {
  const [grain, setGrain] = useState<string | null>(null);
  useEffect(() => setGrain(grainTile()), []);
  const flash = calm ? null : FLASHES.find((f) => pulse(time, f.at, f.dur) > 0);
  const frame = Math.floor(time * 24);
  const full: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };
  return (
    <div style={full} aria-hidden="true">
      {flash && <div style={{ ...full, background: flash.color, opacity: pulse(time, flash.at, flash.dur, flash.peak) }} />}
      {grain && (
        <div
          style={{
            ...full,
            opacity: 0.07,
            mixBlendMode: 'overlay',
            backgroundImage: `url(${grain})`,
            backgroundPosition: calm ? '0 0' : `${(frame * 37) % 96}px ${(frame * 53) % 96}px`,
          }}
        />
      )}
      <div style={{ ...full, background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgb(0 0 0 / 0.55) 100%)' }} />
    </div>
  );
}

// ---- Backdrop -----------------------------------------------------------

/** The glow behind everything, crossfading between scene palettes at each cut. Fills the whole screen. */
export function Ambient({ time }: { time: number }) {
  const s = sceneAt(time);
  const i = SCENES.indexOf(s);
  const prev = SCENES[i - 1];
  const mix = prev ? clamp((time - s.start + 0.25) / 0.5) : 1;
  const glow = (id: SceneId, k: number) =>
    `radial-gradient(55% 40% at 22% 18%, rgb(${GLOW[id][0]} / ${0.2 * k}), transparent 70%), radial-gradient(60% 45% at 80% 88%, rgb(${GLOW[id][1]} / ${0.14 * k}), transparent 72%)`;
  const intro = time < 0.6 ? clamp(time / 0.6) : 1;
  const layers = [glow(s.id, mix * intro)];
  if (prev && mix < 1) layers.push(glow(prev.id, 1 - mix));
  return (
    <div className="promo-ambient" style={{ background: `${layers.join(', ')}, #0e1116` }}>
      <div className="promo-scanlines" />
    </div>
  );
}

/** Rising embers and viewfinder corners: the stage's own atmosphere. */
export function Atmosphere({ time }: { time: number }) {
  const embers = useMemo(() => {
    const rand = rng(21);
    return Array.from({ length: 18 }, () => ({ x: rand() * 360, speed: 14 + rand() * 26, phase: rand(), size: 1.2 + rand() * 2.2, sway: rand() * 6 }));
  }, []);
  const corners = clamp((time - CUE.drop + 0.1) / 0.3);
  return (
    <>
      {embers.map((e, i) => {
        const y = 660 - ((time * e.speed + e.phase * 700) % 700);
        const flicker = 0.25 + 0.25 * Math.sin(time * 6 + i * 1.7);
        return (
          <div
            key={i}
            className="promo-abs"
            style={{
              width: e.size,
              height: e.size,
              borderRadius: '50%',
              background: i % 3 ? HEAT : GOLD,
              boxShadow: `0 0 6px ${i % 3 ? HEAT : GOLD}`,
              opacity: flicker * clamp(time / 0.5),
              transform: `translate(${e.x + Math.sin(time * 1.3 + i) * e.sway}px, ${y}px)`,
            }}
          />
        );
      })}
      {corners > 0 &&
        [[14, 14, 0], [346, 14, 90], [346, 626, 180], [14, 626, 270]].map(([x, y, r]) => (
          <div
            key={r}
            className="promo-abs"
            style={{
              left: x - 1,
              top: y - 1,
              width: 14,
              height: 14,
              borderTop: '1.5px solid rgb(237 241 246 / 0.35)',
              borderLeft: '1.5px solid rgb(237 241 246 / 0.35)',
              transformOrigin: '1px 1px',
              opacity: corners,
              transform: `rotate(${r}deg) scale(${0.6 + 0.4 * corners})`,
            }}
          />
        ))}
    </>
  );
}

// ---- HUD ----------------------------------------------------------------

const EQ_GROUPS: readonly (readonly Voice[])[] = [['kick', 'impact'], ['clap'], ['hat', 'crash'], ['bass', 'pad'], ['blip', 'tick', 'chime', 'pluck', 'anvil']];

let eqIndex: number[][] | null = null;

function eqLevel(group: number, time: number): number {
  if (!eqIndex) {
    const score = buildScore();
    eqIndex = EQ_GROUPS.map((voices) => score.filter((e) => voices.includes(e.voice)).map((e) => e.at));
  }
  const times = eqIndex[group];
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= time) lo = mid + 1;
    else hi = mid;
  }
  const last = times[lo - 1];
  return last === undefined ? 0 : pulse(time, last, 0.28);
}

/** Lower-third telemetry: the chapter and a little equaliser that dances to the score. */
export function Hud({ time, names }: { time: number; names: Partial<Record<SceneId, string>> }) {
  const s = sceneAt(time);
  const n = CHAPTERS[s.id];
  if (!n) return null;
  const inP = clamp((time - s.start - 0.15) / 0.25);
  const outP = clamp((s.end - time - 0.05) / 0.12);
  const k = Math.min(inP, outP);
  const p = prog(time, s.start, s.end - s.start);
  return (
    <div className="promo-abs" style={{ left: 22, top: 598, width: 316, height: 24, opacity: k }}>
      <div className="promo-label" style={{ color: '#edf1f6', fontSize: 9 }}>
        <span style={{ color: TEAL }}>{String(n).padStart(2, '0')}</span> / 08 · {names[s.id]}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 18, width: 120, height: 1, background: 'rgb(237 241 246 / 0.15)' }}>
        <div style={{ width: '100%', height: 1, background: TEAL, transformOrigin: '0 50%', transform: `scaleX(${p})` }} />
      </div>
      <div style={{ position: 'absolute', right: 0, top: 2, display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
        {EQ_GROUPS.map((_, g) => (
          <div key={g} style={{ width: 3, height: 14, background: TEAL, transformOrigin: '50% 100%', transform: `scaleY(${0.15 + 0.85 * eqLevel(g, time)})` }} />
        ))}
      </div>
    </div>
  );
}
