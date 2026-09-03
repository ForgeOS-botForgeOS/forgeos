import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Check, Trash2 } from 'lucide-react';
import type { SetEntry } from '../../types';
import { e1rm } from '../../lib/fitness';
import { haptic } from '../../lib/haptics';
import { useSettings } from '../../state/settingsStore';

/** How far a set has to travel before the swipe counts as complete / delete. */
const SWIPE_PX = 70;
const LONG_PRESS_MS = 550;
/** Movement past this cancels the pending long press — it is a swipe, not a hold. */
const MOVE_CANCEL_PX = 8;
/**
 * How far the row itself moves when the swipe is committed. With
 * `dragConstraints` pinned at 0 and `dragElastic` 0.4 the row travels only a
 * fraction of the finger, so the tint has to be keyed to the row's travel —
 * key it to SWIPE_PX and the colour is still faint at the moment it fires.
 */
const TINT_FULL_PX = SWIPE_PX * 0.4;

interface Props {
  set: SetEntry;
  index: number;
  ghost?: SetEntry;
  onChange: (patch: Partial<SetEntry>) => void;
  onComplete: () => void;
  onDelete: () => void;
  onLongPress: () => void;
}

export function SetRow({ set, index, ghost, onChange, onComplete, onDelete, onLongPress }: Props) {
  const detail = useSettings((s) => s.setRowDetail);
  const x = useMotionValue(0);
  // The swipe tint is two fixed-colour layers whose *opacity* follows the drag,
  // not an interpolated background colour: framer-motion cannot mix
  // `rgb(var(--token))` strings, so the old version snapped the whole row to
  // solid green (or red) on the first pixel of movement instead of easing in.
  const completeTint = useTransform(x, [0, TINT_FULL_PX], [0, 0.85]);
  const deleteTint = useTransform(x, [-TINT_FULL_PX, 0], [0.85, 0]);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  // One-shot celebration the moment a set flips to completed: a checkmark burst
  // and a quick pop of the row. Fires on the false→true edge only.
  const [burst, setBurst] = useState(false);
  const wasDone = useRef(set.completed);
  useEffect(() => {
    if (set.completed && !wasDone.current) {
      setBurst(true);
      const id = window.setTimeout(() => setBurst(false), 650);
      wasDone.current = set.completed;
      return () => window.clearTimeout(id);
    }
    wasDone.current = set.completed;
  }, [set.completed]);

  function startPress(e: React.PointerEvent) {
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      haptic('warning');
      onLongPress();
    }, LONG_PRESS_MS);
  }
  function endPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressOrigin.current = null;
  }
  // A swipe is not a long press. Without this, swiping a set slowly (the
  // gesture the screen tells you to use) ran past the 550 ms threshold and
  // opened the Set-options sheet on top of the set it had just completed.
  function movePress(e: React.PointerEvent) {
    const o = pressOrigin.current;
    if (!pressTimer.current || !o) return;
    if (Math.abs(e.clientX - o.x) > MOVE_CANCEL_PX || Math.abs(e.clientY - o.y) > MOVE_CANCEL_PX) endPress();
  }

  return (
    <motion.div data-noswipe className="relative overflow-hidden rounded-xl" animate={burst ? { scale: [1, 1.035, 1] } : { scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
      {/* swipe action hints */}
      <div className="absolute inset-0 flex items-center justify-between px-4 text-black/70">
        <Trash2 size={16} />
        <Check size={16} />
      </div>

      {/* completion burst — a checkmark that blooms and fades over the row */}
      <AnimatePresence>
        {burst && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="flex items-center justify-center rounded-full bg-success text-black"
              style={{ width: 40, height: 40 }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut', times: [0, 0.5, 1] }}
            >
              <Check size={22} strokeWidth={3} />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_PX) {
            haptic('success');
            onComplete();
          } else if (info.offset.x < -SWIPE_PX) {
            haptic('warning');
            onDelete();
          }
        }}
        onPointerDown={startPress}
        onPointerMove={movePress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        // Touch gestures the browser takes over (a page scroll started on this
        // row) end in pointercancel, never pointerup — so cancel here too.
        onPointerCancel={endPress}
        onDragStart={endPress}
        className={`relative overflow-hidden border rounded-xl bg-surface px-3 py-2.5 ${set.completed ? 'border-success/50' : 'border-line'}`}
      >
        <motion.div className="pointer-events-none absolute inset-0 bg-success" style={{ opacity: completeTint }} />
        <motion.div className="pointer-events-none absolute inset-0 bg-danger" style={{ opacity: deleteTint }} />
        <div className="relative">
          <div className="flex items-center gap-1.5 flex-wrap gap-y-2">
            <span className={`w-6 h-6 shrink-0 rounded-md text-xs flex items-center justify-center font-bold ${set.completed ? 'bg-success text-black' : 'bg-surface-2 text-muted'}`}>
              {index + 1}
            </span>

            <Stepper
              value={set.weightKg}
              step={2.5}
              unit="kg"
              onChange={(v) => onChange({ weightKg: Math.max(0, v) })}
            />
            <Stepper
              value={set.reps}
              step={1}
              unit="rep"
              onChange={(v) => onChange({ reps: Math.max(0, v) })}
            />

            {!set.completed && (
              <button
                onClick={onComplete}
                aria-label="Complete set"
                className="ml-auto shrink-0 grid place-items-center h-11 w-11 rounded-lg bg-success/20 text-success active:scale-95 transition"
              >
                <Check size={22} strokeWidth={3} />
              </button>
            )}
            {set.completed && <span className="ml-auto font-mono text-xs text-accent">e1RM {e1rm(set.weightKg, set.reps)}</span>}
          </div>

          {/* RPE slider + ghost overlay */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted w-8">RPE</span>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={set.rpe ?? 7}
              onChange={(e) => onChange({ rpe: Number(e.target.value) })}
              className="flex-1 h-1 accent-[rgb(var(--accent-2))]"
            />
            <span className="font-mono text-[11px] w-6 text-right">{set.rpe ?? 7}</span>
          </div>

          {ghost && (
            <p className="text-[10px] text-muted/70 mt-1">
              👻 last week: {ghost.weightKg}kg × {ghost.reps} @ RPE {ghost.rpe ?? '—'}
            </p>
          )}

          {/* The space under the set is yours to spend (Settings → Set card focus):
              the sub-target controls, or a big readout of the weight / reps. */}
          {detail === 'subtarget'
            ? <SubTarget set={set} onChange={onChange} />
            : <BigMetric set={set} metric={detail} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stepper({ value, step, unit, onChange }: { value: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={() => { onChange(value - step); haptic('tap'); }} className="w-7 h-7 shrink-0 rounded-md bg-surface-2 text-muted">−</button>
      <div className="w-10 text-center">
        <span className="font-mono font-bold text-sm">{value}</span>
        <span className="text-[9px] text-muted block leading-none">{unit}</span>
      </div>
      <button onClick={() => { onChange(value + step); haptic('tap'); }} className="w-7 h-7 shrink-0 rounded-md bg-surface-2 text-muted">+</button>
    </div>
  );
}

// The alternative to sub-targets: turn the space under the set into a big,
// glanceable readout of that set's weight or reps — easier to read mid-lift.
function BigMetric({ set, metric }: { set: SetEntry; metric: 'weight' | 'reps' }) {
  const value = metric === 'weight' ? set.weightKg : set.reps;
  const unit = metric === 'weight' ? 'kg' : 'reps';
  return (
    <div className="mt-1.5 flex items-baseline gap-1.5">
      <span className="font-mono font-extrabold tabular-nums leading-none text-[2rem] text-accent">{value}</span>
      <span className="text-xs font-semibold text-muted">{unit}</span>
    </div>
  );
}

function SubTarget({ set, onChange }: { set: SetEntry; onChange: (patch: Partial<SetEntry>) => void }) {
  const [open, setOpen] = useState(false);
  const kind = set.subKind ?? 'none';
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center rounded-full bg-accent-2/12 px-2.5 py-1 text-xs font-medium text-accent-2 active:scale-95 transition"
      >
        {kind === 'none' ? '+ sub-target' : `sub-target: ${kind}`}
      </button>
      {open && (
        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
          {(['none', 'tut', 'band', 'isometric'] as const).map((k) => (
            <button
              key={k}
              onClick={() => onChange({ subKind: k })}
              className={`rounded-full px-2 py-0.5 text-[10px] ${kind === k ? 'bg-accent-2 text-black' : 'bg-surface-2 text-muted'}`}
            >
              {k}
            </button>
          ))}
          {kind === 'tut' && (
            <input type="number" inputMode="numeric" placeholder="sec" value={set.tutSeconds ?? ''} onChange={(e) => onChange({ tutSeconds: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) })} className="w-16 rounded bg-surface-2 px-2 py-0.5 text-[11px]" />
          )}
          {kind === 'band' && (
            <input placeholder="band colour" value={set.bandColor ?? ''} onChange={(e) => onChange({ bandColor: e.target.value })} className="w-24 rounded bg-surface-2 px-2 py-0.5 text-[11px]" />
          )}
          {kind === 'isometric' && (
            <input type="number" inputMode="numeric" placeholder="hold s" value={set.isoSeconds ?? ''} onChange={(e) => onChange({ isoSeconds: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) })} className="w-16 rounded bg-surface-2 px-2 py-0.5 text-[11px]" />
          )}
        </div>
      )}
    </div>
  );
}
