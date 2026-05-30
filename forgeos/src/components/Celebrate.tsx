import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGami } from '../state/gamificationStore';
import { rankForXp, rankLabel } from '../data/ranks';
import { haptic } from '../lib/haptics';

const COLORS = ['#ff5c35', '#ffb020', '#34d399', '#7c6df2', '#38bdf8'];

// Lightweight confetti burst — pure framer-motion, no extra dependency.
export function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (i / count) * 100,
      delay: (i % 10) * 0.03,
      rot: (i * 37) % 360,
      color: COLORS[i % COLORS.length],
      drift: ((i * 53) % 40) - 20,
    })),
  ).current;

  return (
    <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: p.rot }}
          animate={{ y: '110%', x: `calc(${p.x}% + ${p.drift}px)`, opacity: [1, 1, 0], rotate: p.rot + 360 }}
          transition={{ duration: 1.8 + (p.id % 5) * 0.2, delay: p.delay, ease: 'easeIn' }}
          className="absolute top-0 h-2.5 w-1.5 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

// Watches XP and fires a rank-up celebration when the tier index increases.
export function RankUpWatcher() {
  const xp = useGami((s) => s.xp);
  const prevIndex = useRef<number | null>(null);
  const [shown, setShown] = useState<{ label: string; color: string } | null>(null);

  useEffect(() => {
    const { index, tier } = rankForXp(xp);
    if (prevIndex.current !== null && index > prevIndex.current) {
      setShown({ label: rankLabel(tier), color: tier.color });
      haptic('success');
      const t = setTimeout(() => setShown(null), 3800);
      prevIndex.current = index;
      return () => clearTimeout(t);
    }
    prevIndex.current = index;
  }, [xp]);

  return (
    <AnimatePresence>
      {shown && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center">
          <Confetti />
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => setShown(null)}
            className="rounded-2xl bg-surface border border-line px-8 py-6 text-center shadow-glow"
          >
            <p className="text-xs uppercase tracking-widest text-muted">Rank up</p>
            <p className="text-3xl font-extrabold mt-1" style={{ color: shown.color }}>{shown.label}</p>
            <p className="text-sm text-muted mt-2">New tier unlocked 🔥</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
