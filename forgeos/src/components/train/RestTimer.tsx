import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, X, Plus, Minus } from 'lucide-react';
import { haptic } from '../../lib/haptics';

const PRESETS = [60, 90, 180, 300];

// A short two-tone beep so you hear rest is over even with the phone face-down.
// Created lazily on first use — autoplay policies allow it after a tap.
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    tone(880, 0, 0.18);
    tone(1320, 0.2, 0.22);
    setTimeout(() => void ctx.close(), 600);
  } catch { /* audio not available — haptic still fires */ }
}

// `autoStartSec` (when > 0) starts a countdown the moment the timer opens —
// e.g. fired automatically right after you complete a set, seeded from that
// exercise's rest preset. `nonce` changes on every open so back-to-back sets
// restart the clock cleanly.
export function RestTimer({ open, onClose, autoStartSec = 0, nonce }: { open: boolean; onClose: () => void; autoStartSec?: number; nonce?: number }) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0); // the countdown we started from — drives the ring
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  // Each time the timer is (re)opened after a set, auto-start from the preset.
  useEffect(() => {
    if (open && autoStartSec > 0) {
      setRemaining(autoStartSec);
      setTotal(autoStartSec);
      setRunning(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nonce]);

  useEffect(() => {
    if (running && remaining > 0) {
      ref.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            haptic('rest-done');
            beep();
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running, remaining]);

  if (!open) return null;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const done = remaining === 0 && !running;

  // Ring geometry — depletes as the clock runs down.
  const SIZE = 120;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-40 p-4"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <div className="rounded-2xl bg-surface-2 border border-line p-4 shadow-glow">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Timer size={16} className="text-accent" /> Rest timer</span>
          <button onClick={onClose} className="text-muted"><X size={16} /></button>
        </div>
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => { setRemaining((r) => Math.max(0, r - 15)); haptic('tap'); }} className="rounded-full bg-surface w-9 h-9 flex items-center justify-center text-muted shrink-0" title="-15s"><Minus size={16} /></button>
          <motion.div
            className="relative inline-flex items-center justify-center"
            style={{ width: SIZE, height: SIZE }}
            animate={done ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={done ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          >
            <svg width={SIZE} height={SIZE} className="-rotate-90">
              <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgb(var(--surface))" strokeWidth={STROKE} />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={done ? 'rgb(var(--success))' : 'rgb(var(--accent))'}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C}
                animate={{ strokeDashoffset: C * (1 - frac) }}
                transition={{ duration: 0.9, ease: 'linear' }}
              />
            </svg>
            <p className={`absolute font-mono text-3xl font-bold tabular-nums ${done ? 'text-success' : ''}`}>{mm}:{ss}</p>
          </motion.div>
          <button onClick={() => { setRemaining((r) => r + 15); setTotal((t) => Math.max(t, remaining + 15)); setRunning(true); haptic('tap'); }} className="rounded-full bg-surface w-9 h-9 flex items-center justify-center text-muted shrink-0" title="+15s"><Plus size={16} /></button>
        </div>
        {done && <p className="text-center text-xs text-success mb-2 font-semibold">Rest done — next set 💪</p>}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setRemaining(p); setTotal(p); setRunning(true); haptic('tap'); }}
              className="rounded-lg bg-surface py-2 text-xs font-medium"
            >
              {p >= 60 ? `${p / 60}m` : `${p}s`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunning((r) => !r)} className="flex-1 rounded-lg bg-accent text-black py-2 text-sm font-semibold">
            {running ? 'Pause' : remaining > 0 ? 'Resume' : 'Start'}
          </button>
          <button onClick={() => { setRemaining(0); setRunning(false); }} className="rounded-lg bg-surface px-4 py-2 text-sm">Reset</button>
        </div>
      </div>
    </motion.div>
  );
}
