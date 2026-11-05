import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Share2, Download, RotateCcw } from 'lucide-react';
import { useWorkout } from '../state/workoutStore';
import { buildWorkoutWrap, type WorkoutWrap as Wrap } from '../lib/workoutWrap';
import { generateWrapCard } from '../lib/wrapCard';
import { downloadDataUrl } from '../lib/shareCard';
import { shareWorkout, workoutShareUrl } from '../lib/workoutShare';
import { Slide } from '../components/wrap/WrapSlides';
import { ARCH_EMOJI, ARCH_PATTERN, PATTERN_SIZE, formatPace } from '../components/wrap/wrapStyle';
import { haptic } from '../lib/haptics';
import { celebrate, toast } from '../lib/toast';
import { useLocale, useT } from '../lib/i18n';

// A single workout as a story: tap right for the next slide, left to go back,
// hold to pause. Opened from "Show wrap" in History.
const SLIDE_MS = 5500;
const TICK_MS = 50;

export default function WorkoutWrap() {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const workout = history.find((w) => w.id === id);
  const wrap = useMemo(() => (workout ? buildWorkoutWrap(workout, history, prs) : null), [workout, history, prs]);
  const close = useCallback(() => navigate(-1), [navigate]);

  const root = typeof document !== 'undefined' ? document.getElementById('phone-root') ?? document.body : null;
  if (!root) return null;
  return createPortal(
    wrap ? <Story key={wrap.workoutId} wrap={wrap} onClose={close} /> : (
      <div className="absolute inset-0 z-[70] grid place-items-center bg-bg p-8 text-center" role="dialog" aria-modal="true" aria-label={t('ww.aria.story')}>
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('ww.notFound')}</p>
          <button onClick={close} className="text-accent font-semibold">{t('common.back')}</button>
        </div>
      </div>
    ),
    root,
  );
}

function Story({ wrap, onClose }: { wrap: Wrap; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const slides = wrap.slides;
  const isLast = index === slides.length - 1;
  const workout = useWorkout((s) => s.history.find((w) => w.id === wrap.workoutId));

  const date = new Date(wrap.dateISO);
  const dateLabel = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + dir)));
    setProgress(0);
    haptic('tap');
  }, [slides.length]);

  // Auto-advance; the outro waits for the user.
  useEffect(() => {
    if (paused || isLast) return;
    const timer = setInterval(() => setProgress((p) => p + TICK_MS / SLIDE_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [paused, isLast, index]);
  useEffect(() => {
    if (progress >= 1) go(1);
  }, [progress, go]);

  useEffect(() => {
    if (slides[index] === 'outro' && (wrap.archetype === 'pr' || wrap.archetype === 'firstEver')) celebrate();
  }, [index, slides, wrap.archetype]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  async function share() {
    if (!workout) return;
    const r = await shareWorkout(workout);
    if (r === 'failed') { setManualLink(workoutShareUrl(workout)); return; }
    toast(r === 'shared' ? 'Shared!' : 'Link copied: paste it to a friend. It opens this workout for them.', 'success');
  }

  function saveCard() {
    const big = wrap.kind === 'cardio'
      ? (wrap.cardio!.distanceKm > 0 ? [`${wrap.cardio!.distanceKm}`, t('ww.cardio.km')] : [`${Math.round(wrap.cardio!.durationMin)}`, t('ww.cardio.min')])
      : wrap.kind === 'watch' ? [`${wrap.durationMin}`, t('ww.cardio.min')] : [wrap.volumeKg.toLocaleString(locale), `kg · ${t('ww.lbl.volume')}`];
    const url = generateWrapCard(wrap, ARCH_EMOJI[wrap.archetype], {
      title: t(`ww.arch.${wrap.archetype}.title`),
      line: t(`ww.arch.${wrap.archetype}.l${wrap.variant}`),
      workoutName: wrap.name,
      dateLabel: `${dateLabel} · ${t(`ww.tod.${wrap.timeOfDay}`)}`,
      bigValue: big[0],
      bigLabel: big[1],
      stats: summaryStats(wrap, t),
      footer: 'forged with ForgeOS',
    });
    if (!url) { toast(t('ww.cardError'), 'error'); return; }
    downloadDataUrl(url, `forge-wrap-${wrap.workoutId}.png`);
    haptic('success');
    toast(t('ww.cardSaved'), 'success');
  }

  const slide = slides[index];
  return (
    <div
      className="absolute inset-0 z-[70] overflow-hidden text-white select-none"
      role="dialog"
      aria-modal="true"
      aria-label={t('ww.aria.story')}
      style={{ background: `linear-gradient(160deg, ${wrap.palette.from}, ${wrap.palette.via} 55%, ${wrap.palette.to})` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: ARCH_PATTERN[wrap.archetype], backgroundSize: PATTERN_SIZE[wrap.archetype] }}
      />
      {!reduce && (
        <>
          <motion.div aria-hidden="true" className="absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl opacity-50" style={{ background: wrap.palette.glow }}
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }} />
          <motion.div aria-hidden="true" className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full blur-3xl opacity-30 bg-white"
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }} />
        </>
      )}

      {/* progress bars */}
      <div className="absolute top-0 inset-x-0 z-20 flex gap-1 px-3 pt-[max(env(safe-area-inset-top),14px)]">
        {slides.map((s, i) => (
          <div key={s} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${i < index ? 100 : i === index ? (isLast ? 100 : Math.min(100, progress * 100)) : 0}%` }} />
          </div>
        ))}
      </div>
      <button onClick={onClose} aria-label={t('ww.aria.close')} className="absolute z-30 right-3 top-[calc(max(env(safe-area-inset-top),14px)+14px)] w-10 h-10 grid place-items-center rounded-full bg-black/25 backdrop-blur">
        <X size={20} aria-hidden="true" />
      </button>

      {/* tap zones: left third back, the rest forward; hold anywhere to pause */}
      {!isLast && (
        <div className="absolute inset-0 z-10 flex" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} onPointerCancel={() => setPaused(false)}>
          <button className="w-1/3 h-full" aria-label={t('ww.aria.prev')} onClick={() => go(-1)} />
          <button className="flex-1 h-full" aria-label={t('ww.aria.next')} onClick={() => go(1)} />
        </div>
      )}

      <div className="relative z-0 h-full flex flex-col justify-center px-7 pb-10 pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: reduce ? 0 : 0.3 }}
            className={isLast ? 'relative z-20' : ''}
          >
            {slide === 'outro'
              ? <Outro wrap={wrap} dateLabel={dateLabel} onShare={share} onCard={saveCard} onReplay={() => { setIndex(0); setProgress(0); }} manualLink={manualLink} canShare={!!workout && (workout.exercises.length > 0 || !!workout.cardio)} />
              : <Slide slide={slide} wrap={wrap} dateLabel={dateLabel} />}
          </motion.div>
        </AnimatePresence>
        {index === 0 && <p className="absolute bottom-6 inset-x-0 text-center text-[11px] uppercase tracking-[0.3em] text-white/60">{t('ww.tapHint')}</p>}
      </div>
    </div>
  );
}

function summaryStats(wrap: Wrap, t: (k: string, p?: Record<string, string | number>) => string): [string, string][] {
  if (wrap.kind === 'cardio') {
    const c = wrap.cardio!;
    return [
      [String(Math.round(c.durationMin)), t('ww.lbl.time')],
      ...(c.paceSecPerKm ? [[formatPace(c.paceSecPerKm), t('ww.cardio.pace')] as [string, string]] : []),
      ...(c.calories ? [[String(c.calories), t('ww.cardio.kcal')] as [string, string]] : []),
    ];
  }
  if (wrap.kind === 'watch') return [[String(wrap.durationMin), t('ww.lbl.time')]];
  return [
    [String(wrap.sets), t('ww.lbl.sets')],
    [String(wrap.exerciseCount), t('ww.lbl.exercises')],
    ...(wrap.durationMin ? [[String(wrap.durationMin), t('ww.lbl.time')] as [string, string]] : []),
    ...(wrap.prs.length ? [[String(wrap.prs.length), t('ww.lbl.prs')] as [string, string]] : []),
  ];
}

function Outro({ wrap, dateLabel, onShare, onCard, onReplay, manualLink, canShare }: {
  wrap: Wrap; dateLabel: string; onShare: () => void; onCard: () => void; onReplay: () => void; manualLink: string | null; canShare: boolean;
}) {
  const t = useT();
  const stats = summaryStats(wrap, t);
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <p className="text-5xl" aria-hidden="true">{ARCH_EMOJI[wrap.archetype]}</p>
        <h2 className="text-3xl font-black">{t('ww.outro.title', { name: wrap.name })}</h2>
        <p className="text-sm text-white/75">{dateLabel} · {t(`ww.arch.${wrap.archetype}.title`)}</p>
      </div>
      {wrap.kind === 'strength' && (
        <div className="rounded-3xl bg-white/15 backdrop-blur p-5 text-center">
          <p className="text-5xl font-black font-mono">{wrap.volumeKg.toLocaleString()}<span className="text-xl"> kg</span></p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">{t('ww.lbl.volume')}</p>
        </div>
      )}
      <div className={`grid gap-2 ${stats.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {stats.slice(0, 3).map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-white/10 py-3 text-center">
            <p className="text-xl font-black font-mono">{v}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/70">{l}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {canShare && (
          <button onClick={onShare} className="w-full rounded-2xl bg-white text-black font-bold py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition">
            <Share2 size={18} aria-hidden="true" /> {t('ww.outro.share')}
          </button>
        )}
        {manualLink && (
          <textarea readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} aria-label="Workout link" className="w-full h-20 rounded-xl bg-black/30 p-2 text-[10px] font-mono break-all text-white" />
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCard} className="rounded-2xl bg-white/15 font-semibold py-3 flex items-center justify-center gap-2 backdrop-blur">
            <Download size={16} aria-hidden="true" /> {t('ww.outro.card')}
          </button>
          <button onClick={onReplay} className="rounded-2xl bg-white/15 font-semibold py-3 flex items-center justify-center gap-2 backdrop-blur">
            <RotateCcw size={16} aria-hidden="true" /> {t('ww.outro.replay')}
          </button>
        </div>
      </div>
    </div>
  );
}
