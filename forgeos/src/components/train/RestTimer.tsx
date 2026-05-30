import { useEffect, useRef, useState } from 'react';
import { Timer, X } from 'lucide-react';
import { haptic } from '../../lib/haptics';

const PRESETS = [60, 90, 180, 300];

export function RestTimer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      ref.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            haptic('rest-done');
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

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4">
      <div className="rounded-2xl bg-surface-2 border border-line p-4 shadow-glow">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Timer size={16} className="text-accent" /> Rest timer</span>
          <button onClick={onClose} className="text-muted"><X size={16} /></button>
        </div>
        <p className="text-center font-mono text-4xl font-bold mb-3">{mm}:{ss}</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setRemaining(p); setRunning(true); haptic('tap'); }}
              className="rounded-lg bg-surface py-2 text-xs font-medium"
            >
              {p >= 60 ? `${p / 60}m` : `${p}s`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunning((r) => !r)} className="flex-1 rounded-lg bg-accent text-black py-2 text-sm font-semibold">
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={() => { setRemaining(0); setRunning(false); }} className="rounded-lg bg-surface px-4 py-2 text-sm">Reset</button>
        </div>
      </div>
    </div>
  );
}
