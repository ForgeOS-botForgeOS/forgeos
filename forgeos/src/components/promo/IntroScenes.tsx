// 0:00 to 0:04. The hook ("Every rep. Every meal. Every PR. Forged into one
// app."), each word struck on an anvil hit, then everything implodes into a
// spark and the logo slams in. The logo then zooms through itself into the
// teal panel that opens chapter one.
import { ForgeLogo } from '../ForgeLogo';
import { useT } from '../../lib/i18n';
import {
  clamp, easeInExpo, easeOutBack, easeOutCubic, easeOutExpo, kf, prog, pulse, sweep,
} from '../../lib/promo/motion';
import { CUE } from '../../lib/promo/schedule';
import { HEAT, MUTED, TEAL, fitDisplay } from './kit';
import { Shockwave, Sparks } from './parts';

interface SceneProps {
  time: number;
  calm: boolean;
}

/** The index of the latest cue already reached, or -1. */
function lastReached(cues: readonly number[], time: number): number {
  let idx = -1;
  cues.forEach((c, i) => {
    if (time >= c) idx = i;
  });
  return idx;
}

/** A word that lands like a hammer: overscaled and blurred for two frames, then a slow push. */
function slam(time: number, at: number, calm: boolean): { transform: string; filter?: string; opacity: number } {
  const lt = time - at;
  if (calm) return { transform: 'none', opacity: clamp(lt / 0.15) };
  const s = kf(lt, [[0, 1.34], [0.12, 1, easeOutCubic], [0.5, 1.045]]);
  const blur = kf(lt, [[0, 7], [0.09, 0]]);
  return { transform: `scale(${s})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, opacity: clamp(lt / 0.04) };
}

function Crosshair({ time, calm }: SceneProps) {
  const grow = easeOutExpo(prog(time, 0, 0.5)) * (1 - easeInExpo(prog(time, CUE.implode, 0.4)));
  const flash = calm ? 0 : Math.max(...CUE.words.map((w) => pulse(time, w, 0.3)), pulse(time, CUE.forged, 0.35));
  const alpha = 0.1 + 0.35 * flash;
  return (
    <>
      <div className="promo-abs" style={{ left: 0, top: 320, width: 360, height: 1, background: `rgb(237 241 246 / ${alpha})`, transform: `scaleX(${grow})` }} />
      <div className="promo-abs" style={{ left: 180, top: 0, width: 1, height: 640, background: `rgb(237 241 246 / ${alpha * 0.8})`, transform: `scaleY(${grow})` }} />
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} className="promo-abs" style={{ left: 12 + i * 24, top: 317, width: 1, height: i % 5 === 2 ? 8 : 5, background: 'rgb(237 241 246 / 0.3)', opacity: grow }} />
      ))}
    </>
  );
}

function Phrase({ time, calm, text, at, heat }: SceneProps & { text: string; at: number; heat: boolean }) {
  const [first, ...rest] = text.split(' ');
  const big = rest.join(' ');
  const size = fitDisplay(big, 132, 312);
  const st = slam(time, at, calm);
  const color = heat ? HEAT : '#edf1f6';
  return (
    <div className="promo-abs" style={{ left: 0, top: 0, width: 360, height: 640, ...st, transformOrigin: '180px 320px' }}>
      <div className="promo-display" style={{ position: 'absolute', top: 222, width: 360, textAlign: 'center', fontSize: 30, fontWeight: 600, color: MUTED, letterSpacing: '0.14em' }}>
        {first}
      </div>
      <div
        className="promo-display"
        style={{ position: 'absolute', top: 320 - size * 0.42, width: 360, textAlign: 'center', fontSize: size, color, textShadow: heat ? '0 0 28px rgb(255 90 60 / 0.55)' : undefined }}
      >
        {big}
      </div>
    </div>
  );
}

function Forged({ time, calm }: SceneProps) {
  const tr = useT();
  const word = tr('Forged');
  const sub = tr('into one app.');
  const size = fitDisplay(word, 128, 318);
  const st = slam(time, CUE.forged, calm);
  const subP = sweep(prog(time, CUE.forgedSub, 0.3));
  return (
    <div className="promo-abs" style={{ width: 360, height: 640, ...st, transformOrigin: '180px 320px' }}>
      <div
        className="promo-display"
        style={{
          position: 'absolute',
          top: 300 - size * 0.62,
          width: 360,
          textAlign: 'center',
          fontSize: size,
          backgroundImage: 'linear-gradient(180deg, #ffe08a 0%, #ffd24a 22%, #ff5a3c 62%, #a8261a 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 0 18px rgb(255 90 60 / 0.45))',
        }}
      >
        {word}
      </div>
      <div className="promo-mask" style={{ position: 'absolute', top: 340, width: 360, paddingRight: 0 }}>
        <div className="promo-display" style={{ textAlign: 'center', fontSize: fitDisplay(sub, 36, 320), transform: `translateY(${(1 - subP) * 110}%)` }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

export function Hook({ time, calm }: SceneProps) {
  const tr = useT();
  const phrases = [tr('Every rep.'), tr('Every meal.'), tr('Every PR.')];
  const idx = lastReached(CUE.words, time);
  const implode = calm ? prog(time, CUE.implode, 0.45) : easeInExpo(prog(time, CUE.implode, 0.45));
  const core = calm ? 0 : prog(time, CUE.logo - 0.25, 0.25);
  const ember = prog(time, 0, 0.55);
  return (
    <>
      <Crosshair time={time} calm={calm} />
      {ember < 1 && (
        <div className="promo-abs" style={{ width: 5, height: 5, borderRadius: '50%', background: HEAT, boxShadow: `0 0 12px ${HEAT}`, transform: `translate(178px, ${600 - 280 * easeOutCubic(ember)}px)`, opacity: 1 - ember * 0.6 }} />
      )}
      <div
        className="promo-abs"
        style={{
          width: 360,
          height: 640,
          transformOrigin: '180px 320px',
          transform: `scale(${1 - implode * 0.97}) rotate(${-7 * implode}deg)`,
          opacity: 1 - prog(time, CUE.implode + 0.36, 0.09),
          filter: implode > 0.05 && !calm ? `blur(${implode * 4}px)` : undefined,
        }}
      >
        {idx >= 0 && time < CUE.forged && <Phrase time={time} calm={calm} text={phrases[idx]} at={CUE.words[idx]} heat={idx === 2} />}
        {time >= CUE.forged && <Forged time={time} calm={calm} />}
      </div>
      {idx === 2 && time < CUE.forged && !calm && (
        <Sparks time={time} start={CUE.words[2]} x={180} y={320} opts={{ count: 26, speed: 320, gravity: 520, life: 0.5, seed: 5 }} />
      )}
      {core > 0 && (
        <div
          className="promo-abs"
          style={{ left: 180 - 14, top: 320 - 14, width: 28, height: 28, borderRadius: '50%', background: '#ffffff', boxShadow: `0 0 30px 10px ${TEAL}`, transform: `scale(${0.1 + core})` }}
        />
      )}
    </>
  );
}

const WORDMARK = 'FORGE';

export function Logo({ time, calm }: SceneProps) {
  const tr = useT();
  const lt = time - CUE.logo;
  const slamScale = calm ? 1 : kf(lt, [[0, 1.9], [0.17, 1, easeOutBack(1.5)]]);
  const zoom = calm ? 1 : 1 + 13 * easeInExpo(prog(time, CUE.zoomThrough, 0.24));
  const fadeText = 1 - prog(time, CUE.zoomThrough, 0.1);
  const split = calm ? 0 : 1 - prog(lt, 0, 0.16);
  const shine = prog(time, CUE.logo + 0.45, 0.45);
  const tag = sweep(prog(time, CUE.tagline, 0.5));
  const letters = [...WORDMARK, 'O', 'S'];
  return (
    <div className="promo-abs" style={{ width: 360, height: 640, transformOrigin: '180px 238px', transform: `scale(${zoom})`, opacity: calm ? 1 - prog(time, 3.85, 0.15) : 1 }}>
      {split > 0 && (
        <>
          <div className="promo-abs" style={{ left: 124 - 7 * split, top: 182, width: 112, height: 112, border: `2px solid ${HEAT}`, borderRadius: 14, opacity: split * 0.8 }} />
          <div className="promo-abs" style={{ left: 124 + 7 * split, top: 182, width: 112, height: 112, border: `2px solid ${TEAL}`, borderRadius: 14, opacity: split * 0.8 }} />
        </>
      )}
      <div className="promo-abs" style={{ left: 124, top: 182, width: 112, height: 112, transform: `scale(${slamScale})`, overflow: 'hidden', borderRadius: 14, boxShadow: '0 0 60px rgb(47 230 196 / 0.35)' }}>
        <ForgeLogo size={112} tile mode="v2" />
        {shine > 0 && shine < 1 && (
          <div className="promo-abs" style={{ width: 60, height: 160, top: -24, background: 'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.55), transparent)', transform: `translateX(${-70 + shine * 220}px) rotate(20deg)` }} />
        )}
      </div>
      {!calm && <Shockwave time={time} start={CUE.logo} x={180} y={238} />}
      {!calm && <Sparks time={time} start={CUE.logo} x={180} y={238} opts={{ count: 38, speed: 560, gravity: 900, life: 0.9, seed: 9 }} />}
      <div className="promo-abs" style={{ top: 316, width: 360, display: 'flex', justifyContent: 'center', opacity: fadeText }}>
        {letters.map((ch, i) => {
          const p = sweep(prog(time, CUE.wordmark + i * 0.035, 0.32));
          return (
            <div key={i} className="promo-mask" style={{ paddingRight: 0 }}>
              <div className="promo-display" style={{ fontSize: 66, color: i >= WORDMARK.length ? TEAL : '#edf1f6', transform: `translateY(${(1 - p) * 110}%)`, paddingRight: 1 }}>
                {ch}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="promo-abs"
        style={{ top: 398, width: 360, textAlign: 'center', fontSize: 15, fontWeight: 500, color: MUTED, opacity: tag * fadeText, letterSpacing: `${0.06 + (1 - tag) * 0.4}em` }}
      >
        {tr('ob.tagline')}
      </div>
    </div>
  );
}
