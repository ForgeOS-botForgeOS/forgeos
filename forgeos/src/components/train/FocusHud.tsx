import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Minus, Plus, X } from 'lucide-react';
import type { SetEntry } from '../../types';
import { useWorkout } from '../../state/workoutStore';
import { exerciseById } from '../../data/exercises';
import { focusProgress, focusTarget, pendingSets } from '../../lib/focus';
import { e1rm } from '../../lib/fitness';
import { haptic } from '../../lib/haptics';
import { useT } from '../../lib/i18n';

interface Props {
  open: boolean;
  onExit: () => void;
  // Completing a set must run the session's full pipeline (XP, rest timer,
  // voice cue, PR drop, race broadcast), so the HUD delegates it upward
  // instead of re-implementing any of it.
  onComplete: (workoutExerciseId: string, set: SetEntry) => void;
  onFinish: () => void;
}

/**
 * Workout Focus HUD — one set, full screen. Covers the session list and the tab
 * bar so mid-set there is nothing to read but the lift in front of you. The rest
 * pill and the music player float above it (z-40), which is the point: next set,
 * rest and music, nothing else.
 */
export function FocusHud({ open, onExit, onComplete, onFinish }: Props) {
  const active = useWorkout((s) => s.active);
  const updateSet = useWorkout((s) => s.updateSet);
  const addSet = useWorkout((s) => s.addSet);
  const lastSetFor = useWorkout((s) => s.lastSetFor);
  const t = useT();
  // Tapping another exercise's chip focuses it (supersets, an occupied rack).
  const [jumpTo, setJumpTo] = useState<string | null>(null);

  const queue = useMemo(() => pendingSets(active), [active]);
  const target = useMemo(() => focusTarget(active, jumpTo), [active, jumpTo]);
  const progress = useMemo(() => focusProgress(active), [active]);
  const upNext = target ? queue.find((p) => p.set.id !== target.set.id) : undefined;

  const exercises = active?.exercises ?? [];
  const ex = target ? exerciseById(target.exercise.exerciseId) : undefined;
  const ghost = target ? lastSetFor(target.exercise.exerciseId, target.setIndex) : undefined;

  function patch(p: Partial<SetEntry>) {
    if (!target) return;
    updateSet(target.exercise.id, target.set.id, p);
    haptic('tap');
  }

  function done() {
    if (!target) return;
    haptic('success');
    onComplete(target.exercise.id, target.set);
    // Whatever comes next takes over the screen on its own — unless you had
    // pinned this exercise and it still has sets left.
    if (target.setIndex + 1 >= target.exercise.sets.length) setJumpTo(null);
  }

  // Portal to the phone root: as a child of the session list this would inherit
  // its `space-y` margin (and any screen transform), so `inset-0` would no
  // longer be the full frame. The rest pill and CD player sit at z-40, above.
  const root = (typeof document !== 'undefined' && document.getElementById('phone-root')) || null;
  const tree = (
    <AnimatePresence>
      {open && (
    <motion.div
      data-noswipe
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="absolute inset-0 z-30 flex flex-col bg-bg px-5 pt-10 pb-5"
    >
      {/* ---- top: what you're on, and the way out ---- */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{t('focus.title')}</p>
          <h1 className="truncate text-xl font-extrabold leading-tight">{ex?.name ?? active?.name ?? '—'}</h1>
          {target && (
            <p className="mt-0.5 text-xs text-muted">
              {t('focus.exercise')} {target.exerciseIndex + 1}/{exercises.length} · {t('focus.set')} {target.setIndex + 1}/{target.exercise.sets.length}
            </p>
          )}
        </div>
        <button
          onClick={() => { haptic('tap'); onExit(); }}
          aria-label={t('focus.exit')}
          className="shrink-0 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted active:scale-90 transition"
        >
          <X size={18} />
        </button>
      </header>

      {/* ---- session progress: one segment per set ---- */}
      <div className="mt-3 flex items-center gap-1" aria-label={`${progress.doneSets}/${progress.totalSets} ${t('common.sets')}`}>
        {exercises.flatMap((we) =>
          we.sets.map((s) => (
            <span
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s.completed ? 'bg-accent' : s.id === target?.set.id ? 'bg-accent/45' : 'bg-surface-2'
              }`}
            />
          )),
        )}
      </div>

      {target ? (
        <>
          {/* ---- the set, as big as the screen allows ---- */}
          <div className="flex flex-1 flex-col justify-center py-4">
            {ghost && (
              <p className="mb-3 text-center text-[11px] text-muted/80">
                👻 {t('focus.lastTime')} {ghost.weightKg}kg × {ghost.reps}
              </p>
            )}

            <div className="flex items-end justify-center gap-4">
              <BigNumber value={target.set.weightKg} unit={t('common.kg')} onStep={(d) => patch({ weightKg: Math.max(0, target.set.weightKg + d) })} step={2.5} />
              <span className="pb-6 text-2xl font-bold text-muted/50">×</span>
              <BigNumber value={target.set.reps} unit={t('focus.reps')} onStep={(d) => patch({ reps: Math.max(0, target.set.reps + d) })} step={1} />
            </div>

            <p className="mt-3 text-center font-mono text-xs text-accent-2">
              e1RM {e1rm(target.set.weightKg, target.set.reps)} {t('common.kg')}
            </p>

            {/* RPE stays reachable — one drag, no card to find */}
            <div className="mt-5 flex items-center gap-3">
              <span className="w-8 text-[10px] font-semibold uppercase tracking-wide text-muted">{t('focus.rpe')}</span>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={target.set.rpe ?? 7}
                onChange={(e) => updateSet(target.exercise.id, target.set.id, { rpe: Number(e.target.value) })}
                className="h-1.5 flex-1 accent-[rgb(var(--accent-2))]"
              />
              <span className="w-7 text-right font-mono text-sm font-bold">{target.set.rpe ?? 7}</span>
            </div>
          </div>

          {/* ---- the only button that matters ---- */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={done}
            className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-success text-black shadow-lg"
          >
            <Check size={30} strokeWidth={3} />
            <span className="text-xl font-extrabold uppercase tracking-wide">{t('focus.done')}</span>
          </motion.button>

          <p className="mt-3 h-4 text-center text-[11px] text-muted">
            {upNext
              ? `${t('focus.next')}: ${exerciseById(upNext.exercise.exerciseId)?.name ?? '—'} · ${upNext.set.weightKg}kg × ${upNext.set.reps}`
              : t('focus.lastSet')}
          </p>
        </>
      ) : (
        /* ---- nothing left to lift ---- */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-5xl">🔥</p>
          <p className="text-lg font-extrabold">{t('focus.allDone')}</p>
          <p className="text-sm text-muted">
            {progress.doneSets} {t('common.sets')} · {Math.round(progress.volumeKg).toLocaleString()} {t('common.kg')}
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onFinish}
            className="mt-2 h-16 w-full rounded-2xl bg-accent text-lg font-extrabold text-black"
          >
            {t('focus.finish')}
          </motion.button>
        </div>
      )}

      {/* ---- footer: totals, jump chips, one more set ---- */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>
            <b className="font-mono text-text">{progress.doneSets}</b>/{progress.totalSets} {t('common.sets')} ·{' '}
            <b className="font-mono text-text">{Math.round(progress.volumeKg).toLocaleString()}</b> {t('common.kg')}
          </span>
          {target && (
            <button onClick={() => { addSet(target.exercise.id); haptic('tap'); }} className="flex items-center gap-1 text-accent">
              <Plus size={12} /> {t('focus.addSet')}
            </button>
          )}
        </div>
        {exercises.length > 1 && (
          <div data-noswipe className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            {exercises.map((we) => {
              const left = we.sets.filter((s) => !s.completed).length;
              const isTarget = we.id === target?.exercise.id;
              return (
                <button
                  key={we.id}
                  disabled={left === 0}
                  onClick={() => { setJumpTo(we.id); haptic('tap'); }}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    isTarget
                      ? 'border-accent bg-accent/15 text-accent'
                      : left === 0
                        ? 'border-line bg-surface-2 text-muted/40 line-through'
                        : 'border-line bg-surface-2 text-muted'
                  }`}
                >
                  {exerciseById(we.exerciseId)?.name ?? '—'}
                  {left > 0 && <span className="ml-1 font-mono">{left}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );

  return root ? createPortal(tree, root) : tree;
}

// A number you can read across the gym, with the steppers right under it.
function BigNumber({ value, unit, step, onStep }: { value: number; unit: string; step: number; onStep: (delta: number) => void }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-[3.5rem] font-extrabold leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{unit}</span>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => onStep(-step)}
          aria-label={`Minus ${step} ${unit}`}
          className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-muted active:scale-90 transition"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={() => onStep(step)}
          aria-label={`Plus ${step} ${unit}`}
          className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-muted active:scale-90 transition"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
