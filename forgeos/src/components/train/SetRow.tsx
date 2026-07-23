import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Check, Trash2 } from 'lucide-react';
import type { SetEntry } from '../../types';
import { e1rm } from '../../lib/fitness';
import { haptic } from '../../lib/haptics';

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
  const x = useMotionValue(0);
  const bg = useTransform(x, [-80, 0, 80], ['rgb(var(--danger))', 'rgb(var(--surface))', 'rgb(var(--success))']);
  const pressTimer = useRef<number | null>(null);

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

  function startPress() {
    pressTimer.current = window.setTimeout(() => {
      haptic('warning');
      onLongPress();
    }, 550);
  }
  function endPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
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
        style={{ x, backgroundColor: bg }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.x > 70) {
            haptic('success');
            onComplete();
          } else if (info.offset.x < -70) {
            haptic('warning');
            onDelete();
          }
        }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        className={`relative border rounded-xl px-3 py-2.5 ${set.completed ? 'border-success/50' : 'border-line'}`}
      >
        <div className="flex items-center gap-2">
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
              className="ml-auto flex items-center gap-1.5 h-11 px-4 rounded-lg bg-success/20 text-success font-semibold active:scale-95 transition"
            >
              <Check size={20} strokeWidth={3} /> <span className="text-sm">Done</span>
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

        <SubTarget set={set} onChange={onChange} />
      </motion.div>
    </motion.div>
  );
}

function Stepper({ value, step, unit, onChange }: { value: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => { onChange(value - step); haptic('tap'); }} className="w-7 h-7 rounded-md bg-surface-2 text-muted">−</button>
      <div className="w-12 text-center">
        <span className="font-mono font-bold text-sm">{value}</span>
        <span className="text-[9px] text-muted block leading-none">{unit}</span>
      </div>
      <button onClick={() => { onChange(value + step); haptic('tap'); }} className="w-7 h-7 rounded-md bg-surface-2 text-muted">+</button>
    </div>
  );
}

function SubTarget({ set, onChange }: { set: SetEntry; onChange: (patch: Partial<SetEntry>) => void }) {
  const [open, setOpen] = useState(false);
  const kind = set.subKind ?? 'none';
  return (
    <div className="mt-1">
      <button onClick={() => setOpen((o) => !o)} className="text-[10px] text-accent-2">
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
