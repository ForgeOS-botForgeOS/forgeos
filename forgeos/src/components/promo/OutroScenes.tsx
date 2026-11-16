// 0:24.5 to the end. A wall of every feature speeding past (a speed ramp into
// the pre-drop gap, where it freezes), then the finale: the logo slams back,
// "Free. No ads. No account needed.", and the Download ForgeOS now button.
// After 0:30 the finale stays on screen and keeps breathing until the visitor
// chooses: download, use it in the browser, or watch again.
import { useMemo, type Ref } from 'react';
import { Download, Globe, RotateCcw } from 'lucide-react';
import { ForgeLogo } from '../ForgeLogo';
import { useT } from '../../lib/i18n';
import { clamp, easeInCubic, easeOutBack, kf, prog, pulse, rng, sweep } from '../../lib/promo/motion';
import { BEAT, CUE } from '../../lib/promo/schedule';
import { HEAT, MUTED, TEAL, fitDisplay, useFmt } from './kit';
import { Shockwave, Sparks } from './parts';

function useFeatureWords(): string[] {
  const tr = useT();
  const fmt = useFmt();
  return [
    tr('Workout log'), `${fmt(2500)} ${tr('exercises')}`, tr('Routines'), tr('Rest timer'), tr('PR Hall'),
    tr('XP and ranks'), tr('Daily quests'), tr('50+ achievements'), tr('Forge Coins'), tr('Week streaks'),
    tr('Meal scanner'), tr('Barcode scanner'), tr('{n} recipes', { n: 107 }), tr('Nutrition plans'), tr('Supplements'),
    tr('AI trainer'), tr('Live race'), tr('Weekly duels'), tr('Friend feed'), tr('Invite links'),
    tr('Garmin sync'), tr('Readiness'), tr('Wrapped'), tr('Share cards'), tr('Progress photos'),
    tr('Weigh-ins'), tr('Cardio scan'), tr('Gym check-in'), tr('{n} themes', { n: 20 }), tr('Apprentice Mode'),
    tr('App search'), tr('Works offline'), 'Slovenčina', tr('App lock'), tr('Plan import'),
  ];
}

export function WallScene({ time, calm }: { time: number; calm: boolean }) {
  const tr = useT();
  const words = useFeatureWords();
  const rows = useMemo(() => {
    const rand = rng(31);
    return Array.from({ length: 9 }, (_, i) => ({
      words: Array.from({ length: 7 }, (_, k) => words[(i * 4 + k * 3) % words.length]),
      offset: -60 - rand() * 220,
      dir: i % 2 ? 1 : -1,
      hot: Math.floor(rand() * 7),
    }));
  }, [words]);
  const lt = Math.min(time, CUE.gap) - CUE.wall;
  const travel = calm ? lt * 40 : 90 * lt + 300 * lt * lt;
  const frozen = time >= CUE.gap;
  const push = calm ? 0 : easeInCubic(prog(time, CUE.gap, CUE.impact - CUE.gap));
  const title = tr('And so much more.');
  const titleSize = fitDisplay(title, 46, 300);
  const titleIn = kf(time - CUE.wall, [[0.05, 0], [0.25, 1, easeOutBack(1.6)]]);
  return (
    <>
      <div className="promo-abs" style={{ left: -120, top: -60, width: 600, height: 780, transform: `rotate(-9deg) scale(${1 + push * 0.5})`, transformOrigin: '300px 380px', opacity: frozen ? 0.55 : 1 }}>
        {rows.map((r, i) => (
          <div key={i} className="promo-display" style={{ position: 'absolute', left: 0, top: i * 84, fontSize: 38, display: 'flex', gap: 18, transform: `translateX(${r.offset + r.dir * travel}px)` }}>
            {r.words.map((w, k) => (
              <span key={k} style={{ color: k === r.hot ? (i % 3 ? TEAL : HEAT) : 'rgb(237 241 246 / 0.16)' }}>
                {w}
                <span style={{ color: TEAL, opacity: 0.6, marginLeft: 18 }}>/</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        className="promo-abs promo-display"
        style={{
          top: 296,
          left: 18,
          width: 324,
          padding: '14px 0 12px',
          textAlign: 'center',
          fontSize: titleSize,
          background: 'rgb(14 17 22 / 0.88)',
          borderTop: `2px solid ${TEAL}`,
          borderBottom: `2px solid ${TEAL}`,
          transform: `scale(${titleIn * (1 + push * 0.25)})`,
          opacity: clamp(titleIn * 2),
        }}
      >
        {title}
      </div>
    </>
  );
}

export interface FinaleProps {
  time: number;
  calm: boolean;
  capture: boolean;
  onDownload: () => void;
  onClose: () => void;
  onReplay: () => void;
  ctaRef?: Ref<HTMLButtonElement>;
}

function Claims({ time }: { time: number }) {
  const tr = useT();
  const items = [tr('Free.'), tr('No ads.'), tr('No account needed.')];
  return (
    <div className="promo-abs" style={{ top: 366, width: 360, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 9 }} aria-hidden="true">
      {items.map((c, i) => {
        const p = sweep(prog(time, CUE.claims + i * 0.12, 0.35));
        return (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
            {i > 0 && <span style={{ width: 4, height: 4, background: TEAL }} />}
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{c}</span>
          </span>
        );
      })}
    </div>
  );
}

function CtaButton({ time, capture, onDownload, ctaRef }: Pick<FinaleProps, 'time' | 'capture' | 'onDownload' | 'ctaRef'>) {
  const tr = useT();
  const label = tr('Download ForgeOS now');
  const p = sweep(prog(time, CUE.cta, 0.42));
  const beat = CUE.cta + Math.floor(Math.max(0, time - CUE.cta) / BEAT) * BEAT;
  const glow = 14 + 16 * pulse(time, beat, 0.45);
  const bandP = ((time - CUE.cta - 0.35) % 2.2) / 0.7;
  const size = fitDisplay(label, 23, 232);
  const style = {
    left: 32,
    top: 410,
    width: 296,
    height: 62,
    clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 6px)`,
    boxShadow: `0 0 ${glow}px rgb(47 230 196 / 0.45), 0 14px 30px rgb(0 0 0 / 0.5)`,
    fontSize: size,
    transform: `scale(${0.94 + 0.06 * p})`,
  };
  const inner = (
    <>
      <Download size={22} strokeWidth={2.6} aria-hidden="true" />
      <span>{label}</span>
      {time > CUE.cta + 0.35 && bandP < 1 && (
        <span aria-hidden="true" style={{ position: 'absolute', top: -20, bottom: -20, width: 46, left: -60 + bandP * 420, background: 'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.55), transparent)', transform: 'rotate(18deg)' }} />
      )}
    </>
  );
  if (capture) return <div className="promo-cta" style={style}>{inner}</div>;
  return (
    <button ref={ctaRef} type="button" className="promo-cta" style={style} onClick={onDownload}>
      {inner}
    </button>
  );
}

export function FinaleScene({ time, calm, capture, onDownload, onClose, onReplay, ctaRef }: FinaleProps) {
  const tr = useT();
  const lt = time - CUE.impact;
  const logo = calm ? 1 : kf(lt, [[0, 2.2], [0.18, 1, easeOutBack(1.6)]]) * (1 + pulse(time, CUE.finalHit, 0.35, 0.06));
  const word = calm ? 1 : kf(lt, [[0.06, 1.3], [0.24, 1, easeOutBack(1.4)]]);
  const wordIn = clamp((lt - 0.06) / 0.06);
  const breathe = (time - CUE.impact) % 2;
  const sub = sweep(prog(time, CUE.ctaSub, 0.4));
  const extras = sweep(prog(time, CUE.ctaSub + 0.25, 0.4));
  return (
    <>
      <div aria-hidden="true">
        {!calm && breathe < 1.4 && lt > 1 && <Shockwave time={time} start={time - breathe} x={180} y={232} color="rgb(47 230 196 / 0.35)" size={300} />}
        {!calm && <Shockwave time={time} start={CUE.impact} x={180} y={232} />}
        {!calm && <Sparks time={time} start={CUE.impact} x={180} y={232} opts={{ count: 44, speed: 600, gravity: 950, life: 1, seed: 41 }} />}
        <div className="promo-abs" style={{ left: 132, top: 184, width: 96, height: 96, borderRadius: 12, overflow: 'hidden', transform: `scale(${logo})`, boxShadow: '0 0 70px rgb(47 230 196 / 0.4)' }}>
          <ForgeLogo size={96} tile mode="v2" />
        </div>
        <div className="promo-abs promo-display" style={{ top: 294, width: 360, textAlign: 'center', fontSize: 60, opacity: wordIn, transform: `scale(${word})` }}>
          FORGE<span style={{ color: TEAL }}>OS</span>
        </div>
        <Claims time={time} />
      </div>
      {time >= CUE.cta && <CtaButton time={time} capture={capture} onDownload={onDownload} ctaRef={ctaRef} />}
      {time >= CUE.ctaSub && (
        <div className="promo-abs" style={{ top: 484, width: 360, textAlign: 'center', fontSize: 12, color: MUTED, opacity: sub }} aria-hidden="true">
          {tr('Android, iPhone and desktop')}
        </div>
      )}
      {capture && time >= CUE.ctaSub + 0.25 && (
        <div className="promo-abs" style={{ top: 532, width: 360, textAlign: 'center', fontSize: 12, letterSpacing: '0.04em', color: '#edf1f6', opacity: extras }} aria-hidden="true">
          forgeos-botforgeos.github.io/forgeos
        </div>
      )}
      {!capture && time >= CUE.ctaSub + 0.25 && (
        <>
          <button type="button" className="promo-btn" style={{ left: 22, top: 518, opacity: extras }} onClick={onClose}>
            <Globe size={15} aria-hidden="true" /> {tr('Use it in the browser')}
          </button>
          <button type="button" className="promo-btn" style={{ right: 22, top: 518, opacity: extras }} onClick={onReplay}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('Watch again')}
          </button>
        </>
      )}
    </>
  );
}
