// Chapters 5 to 8: Social (live race), Recovery (Garmin readiness), Progress
// (strength chart + monthly Wrapped), Make it yours (themes and design modes).
// Readiness 86 is the app's "Primed" tier and the notification carries that
// tier's real advice text (lib/readiness.ts).
import { BatteryCharging, Flag, HeartPulse, ImageIcon, Languages, Moon, Palette, Scale, Sparkles, Swords, Users, Watch, WifiOff } from 'lucide-react';
import { ForgeLogo } from '../ForgeLogo';
import { useT } from '../../lib/i18n';
import { clamp, countUp, easeOutBack, easeOutExpo, fitFont, kf, prog, sweep, type Key } from '../../lib/promo/motion';
import { BEAT, CUE, sceneById } from '../../lib/promo/schedule';
import { GOLD, GREEN, HEAT, MUTED, TEAL, VIOLET, fitDisplay, kickerText, useFmt } from './kit';
import { Chip, Headline, Phone, Ring, Sparks, Stamp } from './parts';

interface SceneProps {
  time: number;
  calm: boolean;
  names: Partial<Record<string, string>>;
}

// ---- 05 Social: live race -----------------------------------------------

const RACE_TARGET = 5000;
const LANES: readonly { initials: string; color: string; keys: readonly Key[] }[] = [
  { initials: 'YOU', color: TEAL, keys: [[CUE.raceStart, 0], [16, 0.3], [16.5, 0.6], [CUE.win, 1]] },
  { initials: 'MK', color: VIOLET, keys: [[CUE.raceStart, 0], [16, 0.42], [16.5, 0.72], [CUE.win, 0.9]] },
  { initials: 'LK', color: GOLD, keys: [[CUE.raceStart, 0], [16, 0.28], [16.5, 0.52], [CUE.win, 0.7]] },
];

/** Race progress that jumps on every eighth note (a logged set) and eases between jumps. */
function stepped(time: number, keys: readonly Key[]): number {
  const step = BEAT / 2;
  const t0 = CUE.raceStart + Math.floor((time - CUE.raceStart) / step) * step;
  const from = kf(t0, keys);
  const to = kf(t0 + step, keys);
  return from + (to - from) * easeOutExpo(clamp((time - t0) / (step * 0.6)));
}

function RacePanel({ time }: { time: number }) {
  const tr = useT();
  const fmt = useFmt();
  const s = sceneById('social');
  const panel = sweep(prog(time, s.start, 0.4));
  const won = time >= CUE.win;
  const names = [tr('You'), 'Marek', 'Lukáš'];
  return (
    <div className="promo-panel" style={{ left: 16, top: 206, width: 328, height: 246, opacity: panel, transform: `translateX(${(1 - panel) * 30}px)` }}>
      <div style={{ position: 'absolute', left: 14, right: 14, top: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, boxShadow: `0 0 ${6 + 6 * Math.sin(time * 9)}px ${TEAL}` }} />
        <span className="promo-display" style={{ fontSize: 19 }}>{tr('Live race')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: MUTED }}>{tr('First to {kg} kg', { kg: fmt(RACE_TARGET) })}</span>
      </div>
      {LANES.map((lane, i) => {
        const p = time < CUE.raceStart ? 0 : Math.min(1, stepped(time, lane.keys));
        const kg = Math.round((p * RACE_TARGET) / 50) * 50;
        const leader = won && i === 0;
        return (
          <div key={lane.initials} style={{ position: 'absolute', left: 14, right: 14, top: 58 + i * 60, height: 48 }}>
            <div className="promo-num" style={{ position: 'absolute', left: 0, top: 4, width: 38, height: 38, borderRadius: '50%', border: `2px solid ${lane.color}`, display: 'grid', placeItems: 'center', fontSize: i === 0 ? 9 : 11, color: lane.color, background: leader ? `${TEAL}22` : '#1e2530' }}>
              {i === 0 ? tr('You') : lane.initials}
            </div>
            <div style={{ position: 'absolute', left: 50, top: 2, fontSize: 12, fontWeight: 600 }}>{names[i]}</div>
            <div className="promo-num" style={{ position: 'absolute', right: 0, top: 2, fontSize: 12, color: leader ? TEAL : '#edf1f6' }}>{fmt(kg)} kg</div>
            <div style={{ position: 'absolute', left: 50, right: 0, top: 26, height: 8, borderRadius: 4, background: '#1e2530', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: 8, background: lane.color, transformOrigin: '0 50%', transform: `scaleX(${p})`, boxShadow: leader ? `0 0 12px ${TEAL}` : undefined }} />
            </div>
            {leader && (
              <Flag size={18} color={TEAL} aria-hidden="true" style={{ position: 'absolute', right: -4, top: 18, transform: `scale(${kf(time - CUE.win, [[0, 0], [0.2, 1, easeOutBack(2)]])})` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SocialScene({ time, calm, names }: SceneProps) {
  const tr = useT();
  const s = sceneById('social');
  return (
    <>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(5, names.social)} lines={[tr('Race your friends.'), tr('Live.')]} />
      <RacePanel time={time} />
      <Chip time={time} start={CUE.chipsSocial[0]} x={16} y={470} icon={Swords} label={tr('Weekly duels')} />
      <Chip time={time} start={CUE.chipsSocial[1]} x={16} y={516} icon={Users} label={tr('Friend feed')} fromRight />
      <Stamp time={time} start={CUE.win} x={196} y={150} color={TEAL} rotate={-6}>
        {tr('You win')}
      </Stamp>
      {!calm && <Sparks time={time} start={CUE.win} x={330} y={300} opts={{ count: 24, speed: 330, gravity: 620, life: 0.6, seed: 23, dir: 20, spread: 200 }} colors={[TEAL, '#ffffff', GOLD]} />}
    </>
  );
}

// ---- 06 Recovery --------------------------------------------------------

const READINESS = 86;

function ReadinessRing({ time }: { time: number }) {
  const tr = useT();
  const p = (READINESS / 100) * easeOutExpo(prog(time, CUE.ring, 0.75));
  const score = Math.round(p * 100);
  const tier = time >= CUE.tier;
  const pop = tier ? kf(time - CUE.tier, [[0, 0.5], [0.2, 1, easeOutBack(2)]]) : 0;
  const angle = (p * 360 - 90) * (Math.PI / 180);
  return (
    <div className="promo-abs" style={{ left: 82, top: 230, width: 196, height: 196 }}>
      <Ring size={196} stroke={12} p={p} color={GREEN} />
      {p > 0.01 && (
        <div className="promo-abs" style={{ left: 98 + Math.cos(angle) * 92 - 7, top: 98 + Math.sin(angle) * 92 - 7, width: 14, height: 14, borderRadius: '50%', background: '#ffffff', boxShadow: `0 0 16px 4px ${GREEN}` }} />
      )}
      <div className="promo-label" style={{ position: 'absolute', top: 50, width: 196, textAlign: 'center' }}>{tr('Readiness')}</div>
      <div className="promo-display" style={{ position: 'absolute', top: 68, width: 196, textAlign: 'center', fontSize: 70, fontStyle: 'normal' }}>{score}</div>
      {tier && (
        <div className="promo-display" style={{ position: 'absolute', top: 136, width: 196, textAlign: 'center', fontSize: 22, color: GREEN, transform: `scale(${pop})` }}>
          {tr('Primed')}
        </div>
      )}
    </div>
  );
}

function Notification({ time }: { time: number }) {
  const tr = useT();
  if (time < CUE.notify) return null;
  const p = sweep(prog(time, CUE.notify, 0.4));
  return (
    <div className="promo-panel" style={{ left: 12, top: 12, width: 336, height: 78, borderRadius: 16, background: '#1e2530', boxShadow: '0 18px 40px rgb(0 0 0 / 0.6)', transform: `translateY(${(1 - p) * -110}px)` }}>
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 18, height: 18, borderRadius: 5, overflow: 'hidden' }}>
          <ForgeLogo size={18} tile mode="v2" />
        </div>
        <span style={{ fontSize: 10, color: MUTED }}>ForgeOS · {tr('now')}</span>
      </div>
      <div style={{ position: 'absolute', left: 12, top: 34, fontSize: 13, fontWeight: 700 }}>{tr('Readiness {n}: {tier}', { n: READINESS, tier: tr('Primed') })}</div>
      <div style={{ position: 'absolute', left: 12, right: 12, top: 52, fontSize: 11, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {tr('Green light: go for a PR or your hardest session.')}
      </div>
    </div>
  );
}

export function RecoverScene({ time, names }: SceneProps) {
  const tr = useT();
  const s = sceneById('recover');
  const stats = [
    { icon: Moon, label: tr('Sleep'), value: '7h 48m' },
    { icon: HeartPulse, label: tr('Resting HR'), value: '52' },
    { icon: BatteryCharging, label: tr('Body Battery'), value: '81' },
  ];
  return (
    <>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(6, names.recover)} lines={[tr('Know when'), tr('to go heavy.')]} accent={GREEN} />
      <ReadinessRing time={time} />
      {stats.map((st, i) => {
        const at = CUE.stats[i];
        if (time < at) return null;
        const p = sweep(prog(time, at, 0.32));
        const Icon = st.icon;
        return (
          <div key={st.label} className="promo-panel" style={{ left: 16 + i * 112, top: 452, width: 104, height: 70, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 16}px)` }}>
            <Icon size={15} color={GREEN} style={{ position: 'absolute', left: 10, top: 10 }} aria-hidden="true" />
            <div className="promo-label" style={{ position: 'absolute', left: 10, top: 30, fontSize: 8, letterSpacing: '0.1em' }}>{st.label}</div>
            <div className="promo-num" style={{ position: 'absolute', left: 10, top: 44, fontSize: 16 }}>{st.value}</div>
          </div>
        );
      })}
      <Chip time={time} start={CUE.chipRecover} x={16} y={538} icon={Watch} label={tr('Garmin via Health Connect')} tone={GREEN} />
      <Notification time={time} />
    </>
  );
}

// ---- 07 Progress --------------------------------------------------------

const E1RM = [80, 82.5, 82.5, 85, 87.5, 87.5, 90, 92.5, 95, 97.5, 100, 102.5];
const PR_POINTS = [8, 11];
const CHART = { x: 30, y: 62, w: 270, h: 120, lo: 75, hi: 105 };

function chartPoint(i: number): [number, number] {
  const x = CHART.x + (i / (E1RM.length - 1)) * CHART.w;
  const y = CHART.y + CHART.h - ((E1RM[i] - CHART.lo) / (CHART.hi - CHART.lo)) * CHART.h;
  return [x, y];
}

function StrengthChart({ time }: { time: number }) {
  const tr = useT();
  const fmt = useFmt();
  const s = sceneById('progress');
  const draw = sweep(prog(time, CUE.chart, 0.75));
  const pts = E1RM.map((_, i) => chartPoint(i));
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${CHART.x + CHART.w} ${CHART.y + CHART.h} L${CHART.x} ${CHART.y + CHART.h} Z`;
  const length = pts.reduce((sum, [x, y], i) => (i ? sum + Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]) : 0), 0);
  const panel = sweep(prog(time, s.start, 0.4));
  const value = 80 + (102.5 - 80) * draw;
  return (
    <div className="promo-panel" style={{ left: 16, top: 206, width: 328, height: 214, opacity: panel, transform: `translateY(${(1 - panel) * 30}px)` }}>
      <div className="promo-display" style={{ position: 'absolute', left: 14, top: 14, fontSize: 19 }}>{tr('Bench press')}</div>
      <div className="promo-label" style={{ position: 'absolute', left: 14, top: 38, fontSize: 8 }}>{tr('Estimated max')}</div>
      <div className="promo-display" style={{ position: 'absolute', right: 14, top: 14, fontSize: 24, color: draw >= 1 ? HEAT : '#edf1f6', fontStyle: 'normal' }}>
        {fmt(Math.round(value * 2) / 2, 1)} kg
      </div>
      <svg className="promo-abs" width={328} height={214} aria-hidden="true">
        <defs>
          <linearGradient id="promo-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TEAL} stopOpacity={0.3} />
            <stop offset="1" stopColor={TEAL} stopOpacity={0} />
          </linearGradient>
          <clipPath id="promo-reveal">
            <rect x={0} y={0} width={CHART.x + CHART.w * draw} height={214} />
          </clipPath>
        </defs>
        {[80, 90, 100].map((v) => {
          const y = CHART.y + CHART.h - ((v - CHART.lo) / (CHART.hi - CHART.lo)) * CHART.h;
          return (
            <g key={v}>
              <line x1={CHART.x} x2={CHART.x + CHART.w} y1={y} y2={y} stroke="#2a3340" strokeDasharray="2 4" />
              <text x={8} y={y + 3} fill={MUTED} fontSize={8} fontFamily="Saira, sans-serif">{v}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#promo-area)" clipPath="url(#promo-reveal)" />
        <path d={line} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - draw)} />
        {PR_POINTS.map((idx, k) => {
          const at = CUE.prMarks[k];
          if (time < at) return null;
          const [x, y] = pts[idx];
          const pop = kf(time - at, [[0, 0], [0.2, 1, easeOutBack(2.2)]]);
          return (
            <g key={idx} transform={`translate(${x} ${y}) scale(${pop})`}>
              <circle r={9} fill={HEAT} opacity={0.25} />
              <circle r={4.5} fill={HEAT} />
              <text y={-12} textAnchor="middle" fill={HEAT} fontSize={9} fontWeight={700} fontFamily="Saira, sans-serif">PR</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function WrappedCard({ time }: { time: number }) {
  const tr = useT();
  const fmt = useFmt();
  if (time < CUE.wrapped) return null;
  const p = sweep(prog(time, CUE.wrapped, 0.45));
  const kg = countUp(time, CUE.wrapped + 0.1, 0.6, 0, 48250, sweep, 50);
  const rows = [
    { v: `${fmt(kg)} kg`, l: tr('lifted this month') },
    { v: '6', l: tr('new PRs') },
    { v: '14', l: tr('sessions') },
  ];
  return (
    <div className="promo-abs" style={{ left: 172, top: 430, width: 172, height: 150, padding: 1.5, borderRadius: 10, background: `linear-gradient(135deg, ${TEAL}, ${HEAT})`, transform: `perspective(800px) rotateY(${(1 - p) * 80}deg) rotate(-3deg)`, opacity: Math.min(1, p * 3), boxShadow: '0 20px 44px rgb(0 0 0 / 0.55)' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 9, background: '#161b22', position: 'relative' }}>
        <div className="promo-display" style={{ position: 'absolute', left: 12, top: 12, fontSize: fitDisplay(tr('Your month, wrapped'), 17, 146) }}>{tr('Your month, wrapped')}</div>
        {rows.map((r, i) => (
          <div key={r.l} style={{ position: 'absolute', left: 12, right: 8, top: 38 + i * 35 }}>
            <div className="promo-num" style={{ fontSize: 16, lineHeight: 1.05, color: i === 1 ? HEAT : '#edf1f6' }}>{r.v}</div>
            <div style={{ fontSize: 9, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressScene({ time, names }: SceneProps) {
  const tr = useT();
  const s = sceneById('progress');
  return (
    <>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(7, names.progress)} lines={[tr('Watch yourself'), tr('get stronger.')]} />
      <StrengthChart time={time} />
      <WrappedCard time={time} />
      <Chip time={time} start={CUE.chipsProgress[0]} x={16} y={444} icon={Scale} label={tr('Weigh-ins')} />
      <Chip time={time} start={CUE.chipsProgress[1]} x={16} y={492} icon={ImageIcon} label={tr('Progress photos')} />
    </>
  );
}

// ---- 08 Make it yours ---------------------------------------------------

interface Look {
  name: string;
  accent: string;
  bg: string;
  surface: string;
  radius: number;
  font: string;
  italic: boolean;
  upper: boolean;
}

/** The four design modes, each shown in a different colour theme. */
const LOOKS: readonly Look[] = [
  { name: 'Tempo', accent: '#2fe6c4', bg: '#0e1116', surface: '#161b22', radius: 6, font: "'Saira Condensed', sans-serif", italic: true, upper: true },
  { name: 'Nova', accent: '#ec4899', bg: '#0d081c', surface: '#1a1030', radius: 16, font: "'Plus Jakarta Sans', sans-serif", italic: false, upper: false },
  { name: 'Bolt', accent: '#facc15', bg: '#0b0b0d', surface: '#17171a', radius: 2, font: "'Space Grotesk', sans-serif", italic: false, upper: true },
  { name: 'Legacy', accent: '#ff5c35', bg: '#090b10', surface: '#12151d', radius: 14, font: "'Inter', sans-serif", italic: false, upper: false },
];

function MiniHome({ look }: { look: Look }) {
  const tr = useT();
  const head = { fontFamily: look.font, fontWeight: 800, fontStyle: look.italic ? 'italic' : 'normal', textTransform: look.upper ? 'uppercase' : 'none' } as const;
  return (
    <div className="promo-abs" style={{ left: 5, top: 5, width: 174, height: 362, borderRadius: 25, background: look.bg, overflow: 'hidden' }}>
      <div className="promo-label" style={{ position: 'absolute', left: 12, top: 34, fontSize: 7, color: look.accent }}>{tr('Today')}</div>
      <div style={{ ...head, position: 'absolute', left: 12, top: 46, fontSize: fitFont(tr('Ready to train'), 19, 150, undefined, 0.56), color: '#edf1f6', whiteSpace: 'nowrap' }}>{tr('Ready to train')}</div>
      <div style={{ ...head, position: 'absolute', left: 12, right: 12, top: 78, height: 34, borderRadius: look.radius, background: look.accent, color: '#0e1116', display: 'grid', placeItems: 'center', fontSize: 12 }}>
        {tr('Start workout')}
      </div>
      {[0, 1].map((k) => (
        <div key={k} style={{ position: 'absolute', left: 12 + k * 79, top: 126, width: 71, height: 92, borderRadius: look.radius, background: look.surface, border: '1px solid rgb(255 255 255 / 0.06)' }}>
          <div style={{ position: 'absolute', left: 13, top: 12 }}>
            <Ring size={44} stroke={5} p={k ? 0.55 : 0.72} color={look.accent} track="rgb(255 255 255 / 0.08)" />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 64, textAlign: 'center', fontSize: 8, color: MUTED }}>{k ? tr('Protein') : tr('Calories')}</div>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 12, right: 12, top: 228, height: 56, borderRadius: look.radius, background: look.surface, border: '1px solid rgb(255 255 255 / 0.06)' }}>
        <div style={{ position: 'absolute', left: 10, top: 10, width: 40, height: 6, borderRadius: 3, background: look.accent, opacity: 0.8 }} />
        <div style={{ position: 'absolute', left: 10, top: 24, right: 30, height: 5, borderRadius: 3, background: 'rgb(255 255 255 / 0.1)' }} />
        <div style={{ position: 'absolute', left: 10, top: 36, right: 60, height: 5, borderRadius: 3, background: 'rgb(255 255 255 / 0.07)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, borderTop: `1px solid ${look.accent}55`, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ width: 14, height: 14, borderRadius: look.radius > 8 ? 7 : 2, background: i === 0 ? look.accent : 'rgb(255 255 255 / 0.18)' }} />)}
      </div>
    </div>
  );
}

function lookIndex(time: number): number {
  let idx = 0;
  CUE.looks.forEach((at, i) => {
    if (time >= at) idx = i;
  });
  return idx;
}

export function YoursScene({ time, calm, names }: SceneProps) {
  const tr = useT();
  const s = sceneById('yours');
  const idx = lookIndex(time);
  const wipe = idx > 0 && !calm ? sweep(prog(time, CUE.looks[idx], 0.16)) : 1;
  const look = LOOKS[idx];
  const swap = sweep(prog(time, CUE.looks[idx], 0.2));
  return (
    <>
      <Headline time={time} start={s.start + 0.03} kicker={kickerText(8, names.yours)} lines={[tr('Make it'), tr('yours.')]} accent={look.accent} />
      <Phone x={164} y={206} ry={-14 + 4 * prog(time, s.start, 2)} rx={4} glow={look.accent}>
        {wipe < 1 && <MiniHome look={LOOKS[idx - 1]} />}
        <div className="promo-abs" style={{ inset: 0, width: 184, height: 372, clipPath: wipe < 1 ? `polygon(0 0, ${wipe * 160}% 0, ${wipe * 160 - 60}% 100%, 0 100%)` : undefined }}>
          <MiniHome look={look} />
        </div>
      </Phone>
      <Chip time={time} start={CUE.chipsYours[0]} x={14} y={230} icon={Palette} label={tr('{n} themes', { n: 20 })} tone={look.accent} />
      <Chip time={time} start={CUE.chipsYours[1]} x={14} y={278} icon={Sparkles} label={tr('{n} styles', { n: 4 })} tone={look.accent} />
      <Chip time={time} start={CUE.chipsYours[2]} x={14} y={326} icon={Languages} label="English · Slovenčina" tone={look.accent} />
      <Chip time={time} start={CUE.chipsYours[3]} x={14} y={374} icon={WifiOff} label={tr('Works offline')} tone={look.accent} />
      <div className="promo-mask promo-abs" style={{ left: 14, top: 448, paddingRight: 4 }}>
        <div className="promo-display" style={{ fontSize: 44, color: look.accent, transform: `translateY(${(1 - swap) * 100}%)`, opacity: calm ? 1 : clamp(swap * 3) }}>{look.name}</div>
      </div>
      <div className="promo-label promo-abs" style={{ left: 16, top: 496 }}>{tr('Design mode')}</div>
    </>
  );
}
