import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Timer, X, Plus, Minus, Pause, Play } from 'lucide-react';
import { haptic } from '../../lib/haptics';

// Remembers where you last dragged the pill, so it stays put across the
// back-to-back re-opens between sets (module-scoped = one workout session).
let lastPos = { x: 0, y: 0 };

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
  const frameRef = useRef<HTMLElement | null>(null);
  const x = useMotionValue(lastPos.x);
  const y = useMotionValue(lastPos.y);
  useEffect(() => { frameRef.current = document.getElementById('phone-root'); }, []);

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

  // Once rest is actually over, tidy up on its own so the pill never lingers.
  useEffect(() => {
    if (open && total > 0 && remaining === 0 && !running) {
      const id = window.setTimeout(onClose, 4500);
      return () => window.clearTimeout(id);
    }
  }, [open, total, remaining, running, onClose]);

  if (!open) return null;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const done = remaining === 0 && !running;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  // Adjust the clock; snapping to 0 stops it (no more stuck "running at 0:00").
  const bump = (delta: number) => {
    setRemaining((r) => {
      const n = Math.max(0, r + delta);
      if (n === 0) setRunning(false);
      return n;
    });
    if (delta > 0) { setTotal((t) => Math.max(t, remaining + delta)); setRunning(true); }
    haptic('tap');
  };
  const toggle = () => {
    if (remaining === 0) { const t = total || 60; setTotal(t); setRemaining(t); setRunning(true); }
    else setRunning((r) => !r);
    haptic('tap');
  };

  // A slim pill that floats just above the tab bar — present but out of the way.
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={frameRef}
      style={{ x, y }}
      onDragEnd={() => { lastPos = { x: x.get(), y: y.get() }; }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="absolute left-3 right-3 bottom-3 z-40 mx-auto max-w-sm touch-none cursor-grab active:cursor-grabbing"
    >
      <div className="relative overflow-hidden rounded-full bg-surface-2/95 border border-line backdrop-blur px-2 py-1.5 flex items-center gap-2 shadow-lg">
        {/* subtle depleting fill so progress reads at a glance */}
        <motion.div
          className={`absolute inset-y-0 left-0 ${done ? 'bg-success/20' : 'bg-accent/15'}`}
          animate={{ width: `${frac * 100}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
        <span className="relative flex items-center gap-1.5 pl-2">
          <Timer size={14} className={done ? 'text-success' : 'text-accent'} />
          <span className={`font-mono font-bold tabular-nums text-lg leading-none ${done ? 'text-success' : ''}`}>{mm}:{ss}</span>
        </span>
        <span className="relative text-[11px] text-muted">{done ? 'go 💪' : 'rest'}</span>
        <div className="relative ml-auto flex items-center gap-0.5">
          <button onClick={() => bump(-15)} aria-label="Minus 15 seconds" className="w-8 h-8 rounded-full flex items-center justify-center text-muted active:scale-90"><Minus size={15} /></button>
          <button onClick={() => bump(15)} aria-label="Plus 15 seconds" className="w-8 h-8 rounded-full flex items-center justify-center text-muted active:scale-90"><Plus size={15} /></button>
          <button onClick={toggle} aria-label={running ? 'Pause' : 'Start'} className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center active:scale-90">
            {running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button onClick={onClose} aria-label="Close rest timer" className="w-8 h-8 rounded-full flex items-center justify-center text-muted active:scale-90"><X size={15} /></button>
        </div>
      </div>
    </motion.div>
  );
}
