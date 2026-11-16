// Chapters 1 to 4: Train, Rank up, Food, AI trainer.
// The numbers are the app's own: 58 XP for 100 kg x 8 (xpForSet), Silver III
// starts at 8,671 XP and Gold I at 14,040 (ranks.ts), 2,500 exercises,
// 107 recipes, and the trainer prompt is one of the app's suggestion chips.
import { BrainCircuit, Check, ChefHat, Coins, Dumbbell, Flame, ListChecks, PencilLine, ScanBarcode, Send, Sparkles, Timer, Trophy } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { clamp, countUp, easeOutBack, easeOutCubic, kf, prog, pulse, sweep, typeOn, wordsOn } from '../../lib/promo/motion';
import { CUE, sceneById } from '../../lib/promo/schedule';
import { GOLD, HEAT, MUTED, TEAL, VIOLET, kickerText, useFmt } from './kit';
import { Chip, Headline, Meter, Phone, Sparks, Stamp } from './parts';

interface SceneProps {
  time: number;
  calm: boolean;
  names: Partial<Record<string, string>>;
}

// ---- 01 Train -----------------------------------------------------------

const SETS = [
  { kg: 100, reps: 8, at: CUE.sets[0] },
  { kg: 100, reps: 8, at: CUE.sets[1] },
  { kg: 100, reps: 8, at: CUE.sets[2] },
  { kg: 102.5, reps: 6, at: CUE.pr, pr: true },
] as const;

function SetRow({ time, i }: { time: number; i: number }) {
  const fmt = useFmt();
  const set = SETS[i];
  const color = 'pr' in set ? HEAT : TEAL;
  const p = sweep(prog(time, set.at - 0.14, 0.2));
  const done = time >= set.at;
  const pop = done ? kf(time - set.at, [[0, 0.4], [0.18, 1, easeOutBack(2)]]) : 0;
  const xpRise = prog(time, set.at, 0.6);
  return (
    <div className="promo-row" style={{ top: 94 + i * 46, borderColor: done ? `${color}88` : undefined }}>
      <div className="promo-abs" style={{ width: '100%', height: '100%', background: color, opacity: 0.2, transformOrigin: '0 50%', transform: `scaleX(${p})` }} />
      {p > 0 && p < 1 && <div className="promo-abs" style={{ left: `${p * 100}%`, width: 2, height: '100%', background: color }} />}
      <div className="promo-num" style={{ width: 20, height: 20, borderRadius: 4, background: '#1e2530', fontSize: 11, display: 'grid', placeItems: 'center', color: done ? color : MUTED, zIndex: 1 }}>{i + 1}</div>
      <div className="promo-num" style={{ fontSize: 13, color: done ? color : '#edf1f6', zIndex: 1 }}>{fmt(set.kg, set.kg % 1 ? 1 : 0)} kg</div>
      <div className="promo-num" style={{ fontSize: 13, color: MUTED, zIndex: 1 }}>× {set.reps}</div>
      <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${done ? color : '#2a3340'}`, display: 'grid', placeItems: 'center', zIndex: 1 }}>
        {done && (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'grid', placeItems: 'center', transform: `scale(${pop})` }}>
            <Check size={12} strokeWidth={3.4} color="#0e1116" aria-hidden="true" />
          </div>
        )}
      </div>
      {done && xpRise < 1 && (
        <div className="promo-num promo-abs" style={{ left: 96, top: 2, fontSize: 10, color, opacity: 1 - xpRise, transform: `translateY(${-22 * easeOutCubic(xpRise)}px)` }}>
          +{'pr' in set ? 47 : 58} XP
        </div>
      )}
    </div>
  );
}

function WorkoutScreen({ time }: { time: number }) {
  const tr = useT();
  const s = sceneById('train');
  const elapsed = 32 * 60 + 14 + Math.floor(time - s.start);
  const rest = prog(time, CUE.sets[2] + 0.1, 0.3);
  const left = Math.max(0, 90 - Math.floor(Math.max(0, time - CUE.sets[2])));
  return (
    <>
      <div className="promo-abs" style={{ left: 14, top: 36, width: 156, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, opacity: 0.5 + 0.5 * Math.sin(time * 8) }} />
        <span className="promo-label" style={{ fontSize: 8 }}>{tr('Workout')}</span>
        <span className="promo-num" style={{ marginLeft: 'auto', fontSize: 10, color: TEAL }}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
      </div>
      <div className="promo-abs promo-display" style={{ left: 14, top: 52, fontSize: 22 }}>{tr('Bench press')}</div>
      <div className="promo-abs" style={{ left: 14, top: 76, fontSize: 9, color: MUTED }}>4 × 8 · 90 s</div>
      {SETS.map((_, i) => <SetRow key={i} time={time} i={i} />)}
      {rest > 0 && (
        <div className="promo-abs" style={{ left: 14, top: 284, display: 'flex', alignItems: 'center', gap: 8, opacity: rest, transform: `translateY(${(1 - rest) * 8}px)` }}>
          <svg width={26} height={26} viewBox="0 0 26 26" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx={13} cy={13} r={10} fill="none" stroke="#1e2530" strokeWidth={3} />
            <circle cx={13} cy={13} r={10} fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray={62.8} strokeDashoffset={62.8 * (1 - left / 90)} />
          </svg>
          <span className="promo-num" style={{ fontSize: 15 }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
          <span className="promo-label" style={{ fontSize: 8 }}>{tr('Rest timer')}</span>
        </div>
      )}
      <div className="promo-abs promo-display" style={{ left: 14, top: 324, width: 156, height: 30, borderRadius: 6, border: `1.5px solid ${TEAL}`, color: TEAL, display: 'grid', placeItems: 'center', fontSize: 14 }}>
        {tr('Finish workout')}
      </div>
    </>
  );
}

export function TrainScene({ time, calm, names }: SceneProps) {
  const tr = useT();
  const fmt = useFmt();
  const s = sceneById('train');
  const enter = calm ? 1 : sweep(prog(time, s.start + 0.02, 0.6));
  const drift = prog(time, s.start, s.end - s.start);
  const exercises = countUp(time, CUE.chipsTrain[0], 0.7, 0, 2500, sweep, 10);
  return (
    <>
      <div className="promo-abs promo-display" style={{ left: -10, top: 500, fontSize: 150, color: 'transparent', WebkitTextStroke: '1px rgb(237 241 246 / 0.07)', transform: `translateX(${-30 + drift * 40}px)` }}>
        {fmt(102.5, 1)}
      </div>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(1, names.train)} lines={[tr('Log every set'), tr('in one swipe.')]} />
      <Phone x={164} y={206 + (1 - enter) * 70} ry={-26 + 12 * enter - 3 * drift} rx={16 - 11 * enter} opacity={clamp((time - s.start) / 0.12)}>
        <WorkoutScreen time={time} />
      </Phone>
      <Chip time={time} start={CUE.chipsTrain[0]} x={14} y={300} icon={Dumbbell} label={`${fmt(exercises)} ${tr('exercises')}`} />
      <Chip time={time} start={CUE.chipsTrain[1]} x={14} y={352} icon={Timer} label={tr('Rest timer')} />
      <Chip time={time} start={CUE.chipsTrain[2]} x={14} y={404} icon={ListChecks} label={tr('Routines')} />
      <Stamp time={time} start={CUE.pr} x={22} y={462} color={HEAT}>
        {tr('New PR')} · {fmt(102.5, 1)} kg
      </Stamp>
      {!calm && <Sparks time={time} start={CUE.pr} x={250} y={458} opts={{ count: 30, speed: 380, gravity: 700, life: 0.75, seed: 13 }} />}
    </>
  );
}

// ---- 02 Rank up ---------------------------------------------------------

const SILVER_III = 8671;
const GOLD_I = 14040;
const GOLD_II = 22362;
const XP_STEPS = [
  { at: 0, xp: 13540 },
  { at: CUE.xp[0], xp: 13790 },
  { at: CUE.xp[1], xp: 13910 },
  { at: CUE.rankUp, xp: 14060 },
] as const;

function xpAt(time: number): number {
  let xp: number = XP_STEPS[0].xp;
  let from = xp;
  let at = 0;
  for (const step of XP_STEPS) {
    if (time >= step.at) {
      from = xp;
      xp = step.xp;
      at = step.at;
    }
  }
  return Math.round(from + (xp - from) * sweep(prog(time, at, 0.3)));
}

function RankCard({ time }: { time: number }) {
  const tr = useT();
  const fmt = useFmt();
  const xp = xpAt(time);
  const gold = time >= CUE.rankUp;
  const flipOut = kf(time, [[CUE.rankUp - 0.1, 0], [CUE.rankUp, 90]]);
  const flipIn = kf(time, [[CUE.rankUp, -90], [CUE.rankUp + 0.14, 0, easeOutCubic]]);
  const meter = gold ? kf(time, [[CUE.rankUp, 1], [CUE.rankUp + 0.3, (xp - GOLD_I) / (GOLD_II - GOLD_I), easeOutCubic]]) : (xp - SILVER_III) / (GOLD_I - SILVER_III);
  const color = gold ? GOLD : '#c0c0c0';
  const nextName = gold ? tr('Gold II') : tr('Gold I');
  return (
    <div className="promo-panel" style={{ left: 22, top: 214, width: 316, height: 170, borderColor: gold ? `${GOLD}77` : undefined }}>
      <div className="promo-label" style={{ position: 'absolute', left: 14, top: 14 }}>{tr('Rank')}</div>
      <div className="promo-display" style={{ position: 'absolute', right: 16, top: 12, fontSize: 34, color }}>{gold ? 7 : 6}</div>
      <div style={{ position: 'absolute', left: 14, top: 34, perspective: 400 }}>
        <div className="promo-display" style={{ fontSize: 46, color, transform: `rotateX(${gold ? flipIn : flipOut}deg)`, transformOrigin: '50% 60%', textShadow: gold ? `0 0 22px ${GOLD}66` : undefined }}>
          {gold ? tr('Gold I') : tr('Silver III')}
        </div>
      </div>
      <div className="promo-num" style={{ position: 'absolute', left: 14, top: 90, fontSize: 15 }}>{fmt(xp)} XP</div>
      <div style={{ position: 'absolute', left: 14, top: 118 }}>
        <Meter p={Math.min(1, meter)} width={288} color={color} />
      </div>
      <div style={{ position: 'absolute', left: 14, top: 140, fontSize: 11, color: MUTED }}>
        {tr('{xp} XP to {rank}', { xp: fmt((gold ? GOLD_II : GOLD_I) - xp), rank: nextName })}
      </div>
    </div>
  );
}

function StatPanel({ time, start, x, icon: Icon, tone, value, label }: { time: number; start: number; x: number; icon: typeof Flame; tone: string; value: string; label: string }) {
  if (time < start) return null;
  const p = sweep(prog(time, start, 0.35));
  return (
    <div className="promo-panel" style={{ left: x, top: 398, width: 152, height: 84, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, transform: `translateY(${(1 - p) * 10}px)` }}>
      <Icon size={22} color={tone} strokeWidth={2.2} style={{ position: 'absolute', left: 14, top: 16 }} aria-hidden="true" />
      <div className="promo-display" style={{ position: 'absolute', left: 46, top: 12, fontSize: 34 }}>{value}</div>
      <div style={{ position: 'absolute', left: 14, top: 56, fontSize: 11, color: MUTED }}>{label}</div>
    </div>
  );
}

export function LevelScene({ time, calm, names }: SceneProps) {
  const tr = useT();
  const fmt = useFmt();
  const s = sceneById('level');
  const coins = countUp(time, CUE.coins, 0.5, 1180, 1240);
  const pops = [
    { at: CUE.xp[0], text: '+250 XP' },
    { at: CUE.xp[1], text: '+120 XP' },
    { at: CUE.rankUp, text: '+150 XP' },
  ];
  return (
    <>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(2, names.level)} lines={[tr('Every workout'), tr('levels you up.')]} accent={GOLD} />
      <RankCard time={time} />
      {pops.map((pp, i) => {
        const r = prog(time, pp.at, 0.5);
        if (time < pp.at || r >= 1) return null;
        return (
          <div key={pp.at} className="promo-abs promo-display" style={{ left: 196 + (i % 2) * 34, top: 302, fontSize: 26, color: TEAL, opacity: 1 - r * r, transform: `translateY(${-56 * easeOutCubic(r)}px) scale(${kf(r, [[0, 0.6], [0.2, 1, easeOutBack(2)]])})` }}>
            {pp.text}
          </div>
        );
      })}
      <StatPanel time={time} start={CUE.streak} x={22} icon={Flame} tone={TEAL} value="12" label={tr('week streak')} />
      <StatPanel time={time} start={CUE.coins} x={186} icon={Coins} tone={HEAT} value={fmt(coins)} label={tr('Forge Coins')} />
      <Chip time={time} start={CUE.rankUp + 0.25} x={22} y={500} icon={ListChecks} label={tr('Daily quests')} tone={GOLD} />
      <Chip time={time} start={CUE.achievements} x={22} y={546} icon={Trophy} label={tr('50+ achievements')} tone={GOLD} fromRight />
      <Stamp time={time} start={CUE.rankUp} x={196} y={196} color={GOLD} rotate={-8}>
        {tr('Rank up')}
      </Stamp>
      {!calm && <Sparks time={time} start={CUE.rankUp} x={110} y={276} opts={{ count: 34, speed: 420, gravity: 650, life: 0.8, seed: 17 }} colors={[GOLD, '#ffffff', '#ffe08a']} />}
    </>
  );
}

// ---- 03 Food ------------------------------------------------------------

function Plate() {
  return (
    <svg className="promo-abs" style={{ left: 22, top: 96 }} width={140} height={140} viewBox="0 0 140 140" aria-hidden="true">
      <circle cx={70} cy={70} r={66} fill="#dfe4ea" />
      <circle cx={70} cy={70} r={55} fill="#f3f5f8" />
      <g transform="rotate(-18 82 52)">
        <rect x={56} y={36} width={58} height={30} rx={11} fill="#ff7a59" />
        <rect x={56} y={36} width={58} height={13} rx={9} fill="#ff9a7a" opacity={0.75} />
        {[68, 80, 92, 104].map((x) => <line key={x} x1={x} y1={39} x2={x - 6} y2={63} stroke="#ffe1d6" strokeWidth={2} opacity={0.85} />)}
      </g>
      {[[38, 82], [48, 92], [36, 96], [52, 80], [44, 104], [58, 100]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={9} ry={6} fill="#fbfaf6" stroke="#e4ddcc" strokeWidth={1} />
      ))}
      {[[92, 96, 10, '#3f9d4b'], [104, 88, 9, '#57b85f'], [100, 106, 8, '#2f7f3a'], [86, 108, 7, '#4caa55']].map(([x, y, r, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} />
      ))}
      <path d="M30 52 a14 14 0 0 1 26 -6 z" fill="#ffd24a" />
    </svg>
  );
}

const DETECTIONS = [
  { box: [70, 118, 74, 46], name: 'Salmon', grams: 150 },
  { box: [44, 168, 52, 46], name: 'Rice', grams: 180 },
  { box: [100, 176, 52, 44], name: 'Broccoli', grams: 90 },
] as const;

function Viewfinder({ time, calm }: { time: number; calm: boolean }) {
  const tr = useT();
  const fmt = useFmt();
  const names = [tr('Salmon'), tr('Rice'), tr('Broccoli')];
  const brackets = sweep(prog(time, 9.6, 0.3));
  const scan = prog(time, CUE.shutter + 0.05, 0.45);
  const shutter = calm ? 0 : pulse(time, CUE.shutter, 0.16, 0.9);
  return (
    <>
      <div className="promo-abs" style={{ inset: 5, width: 174, height: 362, borderRadius: 25, background: 'linear-gradient(180deg, #0b0f14, #141a22 60%, #0b0f14)' }} />
      <div className="promo-abs promo-label" style={{ top: 36, width: 184, textAlign: 'center', color: TEAL, fontSize: 8 }}>{tr('Scan a meal')}</div>
      <Plate />
      {[[18, 90, 0], [166, 90, 90], [166, 242, 180], [18, 242, 270]].map(([x, y, r]) => (
        <div
          key={r}
          className="promo-abs"
          style={{ left: x - 1, top: y - 1, width: 18, height: 18, borderTop: `2px solid ${TEAL}`, borderLeft: `2px solid ${TEAL}`, transformOrigin: '1px 1px', opacity: brackets, transform: `rotate(${r}deg) translate(${(1 - brackets) * -10}px, ${(1 - brackets) * -10}px)` }}
        />
      ))}
      {scan > 0 && scan < 1 && (
        <div className="promo-abs" style={{ left: 18, top: 90 + scan * 152 - 40, width: 148, height: 42, background: `linear-gradient(180deg, transparent, ${TEAL}33)`, borderBottom: `2px solid ${TEAL}`, boxShadow: `0 6px 14px ${TEAL}55` }} />
      )}
      {DETECTIONS.map((d, i) => {
        const at = CUE.detect[i];
        if (time < at) return null;
        const pop = kf(time - at, [[0, 0.8], [0.18, 1, easeOutBack(2)]]);
        const [x, y, w, h] = d.box;
        return (
          <div key={d.name} className="promo-abs" style={{ left: x, top: y, width: w, height: h, border: `1.5px solid ${TEAL}`, borderRadius: 5, transform: `scale(${pop})`, boxShadow: `0 0 12px ${TEAL}44` }}>
            <div className="promo-num" style={{ position: 'absolute', left: -2, top: -15, padding: '1px 5px', borderRadius: 3, background: TEAL, color: '#0e1116', fontSize: 8 }}>
              {names[i]} {fmt(d.grams)} g
            </div>
          </div>
        );
      })}
      {shutter > 0 && <div className="promo-abs" style={{ inset: 5, width: 174, height: 362, borderRadius: 25, background: '#ffffff', opacity: shutter }} />}
      <div className="promo-abs" style={{ left: 72, top: 298, width: 40, height: 40, borderRadius: '50%', border: '3px solid #edf1f6', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#edf1f6', transform: `scale(${1 - pulse(time, CUE.shutter, 0.2, 0.25)})` }} />
      </div>
    </>
  );
}

function MacroCard({ time }: { time: number }) {
  const tr = useT();
  const fmt = useFmt();
  if (time < CUE.macros) return null;
  const p = sweep(prog(time, CUE.macros, 0.4));
  const kcal = countUp(time, CUE.macros, 0.5, 0, 577);
  const macros = [
    { label: tr('Protein'), g: 37, k: 0.52, c: TEAL },
    { label: tr('Carbs'), g: 56, k: 0.78, c: GOLD },
    { label: tr('Fat'), g: 21, k: 0.66, c: HEAT },
  ];
  return (
    <div className="promo-panel" style={{ left: 118, top: 446, width: 226, height: 136, background: '#1e2530', boxShadow: '0 24px 50px rgb(0 0 0 / 0.6)', opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 36}px)` }}>
      <div style={{ position: 'absolute', left: 14, top: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="promo-display" style={{ fontSize: 38 }}>{fmt(kcal)}</span>
        <span style={{ fontSize: 13, color: MUTED }}>kcal</span>
      </div>
      {macros.map((m, i) => {
        const fill = sweep(prog(time, CUE.macros + 0.1 + i * 0.06, 0.45));
        return (
          <div key={m.label} style={{ position: 'absolute', left: 14, top: 58 + i * 24, width: 198 }}>
            <div style={{ display: 'flex', fontSize: 10, color: MUTED }}>
              <span>{m.label}</span>
              <span className="promo-num" style={{ marginLeft: 'auto', color: '#edf1f6', fontSize: 10 }}>{fmt(Math.round(m.g * fill))} g</span>
            </div>
            <div style={{ marginTop: 3, height: 4, borderRadius: 2, background: '#161b22' }}>
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: m.c, transformOrigin: '0 50%', transform: `scaleX(${m.k * fill})` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FoodScene({ time, calm, names }: SceneProps) {
  const tr = useT();
  const s = sceneById('food');
  const enter = calm ? 1 : sweep(prog(time, s.start, 0.55));
  const bump = calm ? 0 : pulse(time, CUE.shutter, 0.25, 0.03);
  return (
    <>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(3, names.food)} lines={[tr('Snap your meal.'), tr('Get the macros.')]} accent="#34d399" />
      <Phone x={12} y={206 + (1 - enter) * 60} ry={24 - 12 * enter} rx={12 - 8 * enter} scale={1 - bump} glow="#34d399">
        <Viewfinder time={time} calm={calm} />
      </Phone>
      <MacroCard time={time} />
      <Chip time={time} start={CUE.chipsFood[0]} x={14} y={220} icon={ScanBarcode} label={tr('Barcode scanner')} tone="#34d399" fromRight />
      <Chip time={time} start={CUE.chipsFood[1]} x={14} y={272} icon={ChefHat} label={tr('{n} recipes', { n: 107 })} tone="#34d399" fromRight />
      <Chip time={time} start={CUE.chipsFood[2]} x={14} y={324} icon={PencilLine} label={tr('Or just describe it')} tone="#34d399" fromRight />
    </>
  );
}

// ---- 04 AI trainer ------------------------------------------------------

export function CoachScene({ time, names }: SceneProps) {
  const tr = useT();
  const s = sceneById('coach');
  const question = tr('My bench has stalled. What now?');
  const answer = tr('Deload to 72.5 kg, then add 2.5 kg a week.');
  const words = answer.split(' ');
  const shown = wordsOn(words.length, time, CUE.reply, 11);
  const typed = time < CUE.send ? typeOn(question, time, CUE.ask, 64) : '';
  const tabs = [tr('Strength'), tr('Nutrition'), tr('Recovery'), tr('App guide')];
  const sent = time >= CUE.send;
  const sentPop = sent ? kf(time - CUE.send, [[0, 0.85], [0.2, 1, easeOutBack(1.8)]]) : 0;
  const typing = time >= CUE.send + 0.1 && time < CUE.reply;
  const panel = sweep(prog(time, s.start, 0.45));
  return (
    <>
      <Headline time={time} start={s.start + 0.05} kicker={kickerText(4, names.coach)} lines={[tr('An AI trainer'), tr('in your pocket.')]} accent={VIOLET} />
      <div className="promo-panel" style={{ left: 16, top: 206, width: 328, height: 372, overflow: 'hidden', opacity: panel, transform: `translateY(${(1 - panel) * 40}px)` }}>
        <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#a78bfa22', display: 'grid', placeItems: 'center' }}>
            <BrainCircuit size={17} color={VIOLET} aria-hidden="true" />
          </div>
          <div className="promo-display" style={{ fontSize: 19 }}>{tr('Talk to your trainer')}</div>
        </div>
        <div style={{ position: 'absolute', left: 14, right: 14, top: 58, display: 'flex', borderBottom: '1px solid #2a3340' }}>
          {tabs.map((tab, i) => {
            const p = sweep(prog(time, s.start + 0.1 + i * 0.05, 0.3));
            return (
              <div key={tab} className="promo-label" style={{ flex: 1, textAlign: 'center', paddingBottom: 8, fontSize: 8, letterSpacing: '0.1em', color: i === 0 ? '#edf1f6' : MUTED, opacity: p, position: 'relative' }}>
                {tab}
                {i === 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: VIOLET, transformOrigin: '0 50%', transform: `scaleX(${sweep(prog(time, s.start + 0.3, 0.4))})` }} />}
              </div>
            );
          })}
        </div>
        {sent && (
          <div className="promo-bubble" style={{ right: 14, top: 96, maxWidth: 230, background: TEAL, color: '#0e1116', fontWeight: 600, borderBottomRightRadius: 4, transform: `scale(${sentPop})`, transformOrigin: '100% 100%' }}>
            {question}
          </div>
        )}
        {typing && (
          <div className="promo-bubble" style={{ left: 14, top: 160, background: '#1e2530', display: 'flex', gap: 4 }}>
            {[0, 1, 2].map((d) => <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: MUTED, transform: `translateY(${-3 * Math.max(0, Math.sin(time * 14 - d * 0.9))}px)` }} />)}
          </div>
        )}
        {time >= CUE.reply && (
          <div className="promo-bubble" style={{ left: 14, top: 160, maxWidth: 260, background: '#1e2530', borderBottomLeftRadius: 4 }}>
            {words.map((w, i) => (
              <span key={i} style={{ opacity: i < shown ? 1 : 0 }}>{w}{i < words.length - 1 ? ' ' : ''}</span>
            ))}
          </div>
        )}
        {time >= CUE.reply + 0.6 && (
          <div style={{ position: 'absolute', left: 16, top: 234, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: MUTED, opacity: prog(time, CUE.reply + 0.6, 0.3) }}>
            <Sparkles size={11} color={VIOLET} aria-hidden="true" /> {tr('Based on your last 6 sessions')}
          </div>
        )}
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, height: 40, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, borderRadius: 6, border: '1px solid #2a3340', background: '#0e1116', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 12, color: typed ? '#edf1f6' : MUTED, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {typed || tr('Ask your trainer…')}
            {typed && <span style={{ width: 1.5, height: 14, marginLeft: 1, background: TEAL, opacity: Math.sin(time * 18) > 0 ? 1 : 0 }} />}
          </div>
          <div style={{ width: 40, borderRadius: 6, background: '#1d6f61', display: 'grid', placeItems: 'center', transform: `scale(${1 + pulse(time, CUE.send, 0.2, 0.12)})` }}>
            <Send size={16} color="#0e1116" aria-hidden="true" />
          </div>
        </div>
      </div>
      <Chip time={time} start={CUE.chipCoach} x={22} y={498} icon={Sparkles} label={tr('Knows your numbers')} tone={VIOLET} fromRight />
    </>
  );
}
