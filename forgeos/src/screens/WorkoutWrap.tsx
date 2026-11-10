import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Share2, Download, RotateCcw } from 'lucide-react';
import { useWorkout } from '../state/workoutStore';
import { buildWorkoutWrap, type WorkoutWrap as Wrap } from '../lib/workoutWrap';
import { buildRecap, type Recap } from '../lib/wrapRecap';
import { shareImage } from '../lib/shareImage';
import { generateWrapCard } from '../lib/wrapCard';
import { downloadDataUrl } from '../lib/shareCard';
import { shareWorkout, workoutShareUrl } from '../lib/workoutShare';
import { Slide } from '../components/wrap/WrapSlides';
import { WrapRecap } from '../components/wrap/WrapRecap';
import { ARCH_EMOJI, ARCH_PATTERN, PATTERN_SIZE } from '../components/wrap/wrapStyle';
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

  const recap = useMemo(
    () => buildRecap(wrap, t, locale, dateLabel, ARCH_EMOJI[wrap.archetype]),
    [wrap, t, locale, dateLabel],
  );
  const cardName = `forge-wrap-${wrap.workoutId}.png`;

  // The recap card is what gets shared: as a picture with the link in the text
  // where the phone can share files, otherwise the link on its own.
  async function share() {
    if (!workout) return;
    const url = workoutShareUrl(workout);
    const card = generateWrapCard(wrap, recap);
    if (card) {
      const r = await shareImage(card, cardName, recap.title, `${recap.name}: ${recap.line}\n${url}`);
      if (r === 'cancelled') return;
      if (r === 'shared') { haptic('success'); toast(t('ww.recap.shared'), 'success'); return; }
    }
    const r = await shareWorkout(workout);
    if (r === 'failed') { setManualLink(url); return; }
    toast(r === 'shared' ? t('ww.recap.shared') : t('ww.recap.copied'), 'success');
  }

  function saveCard() {
    const url = generateWrapCard(wrap, recap);
    if (!url) { toast(t('ww.cardError'), 'error'); return; }
    downloadDataUrl(url, cardName);
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

      <div className={`relative z-0 h-full flex flex-col px-7 ${isLast ? 'overflow-y-auto overscroll-contain pt-20 pb-8 px-5 [mask-image:linear-gradient(to_bottom,transparent_40px,black_80px)]' : 'justify-center pb-10 pt-16'}`}>
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
              ? <Outro recap={recap} onShare={share} onCard={saveCard} onReplay={() => { setIndex(0); setProgress(0); }} manualLink={manualLink} canShare={!!workout && (workout.exercises.length > 0 || !!workout.cardio)} />
              : <Slide slide={slide} wrap={wrap} dateLabel={dateLabel} />}
          </motion.div>
        </AnimatePresence>
        {index === 0 && <p className="absolute bottom-6 inset-x-0 text-center text-[11px] uppercase tracking-[0.3em] text-white/60">{t('ww.tapHint')}</p>}
      </div>
    </div>
  );
}

function Outro({ recap, onShare, onCard, onReplay, manualLink, canShare }: {
  recap: Recap; onShare: () => void; onCard: () => void; onReplay: () => void; manualLink: string | null; canShare: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <WrapRecap recap={recap} />
      <div className="space-y-2 pt-1">
        {canShare && (
          <button onClick={onShare} className="w-full rounded-2xl bg-white text-black font-bold py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition">
            <Share2 size={18} aria-hidden="true" /> {t('ww.recap.share')}
          </button>
        )}
        {manualLink && (
          <textarea readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} aria-label={t('Workout link')} className="w-full h-20 rounded-xl bg-black/30 p-2 text-[10px] font-mono break-all text-white" />
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCard} className="rounded-2xl bg-white/15 font-semibold py-3 flex items-center justify-center gap-2 backdrop-blur active:scale-[0.98] transition">
            <Download size={16} aria-hidden="true" /> {t('ww.outro.card')}
          </button>
          <button onClick={onReplay} className="rounded-2xl bg-white/15 font-semibold py-3 flex items-center justify-center gap-2 backdrop-blur active:scale-[0.98] transition">
            <RotateCcw size={16} aria-hidden="true" /> {t('ww.outro.replay')}
          </button>
        </div>
      </div>
    </div>
  );
}
