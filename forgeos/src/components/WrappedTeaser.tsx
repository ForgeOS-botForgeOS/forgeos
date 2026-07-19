import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import { Card } from './ui';
import { useWorkout } from '../state/workoutStore';
import { buildWrapped, lastCompletedMonth } from '../lib/wrapped';

const SEEN_KEY = 'forge-wrapped-seen';
const TEASER_DAYS = 7; // only tease during the first week of a new month

// "Your Forge Wrapped is ready 🎁" — Home teaser at the start of each month.
export function WrappedTeaser() {
  const navigate = useNavigate();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const [dismissed, setDismissed] = useState(false);

  const wrapped = useMemo(() => {
    if (new Date().getDate() > TEASER_DAYS) return null;
    const { year, monthIndex } = lastCompletedMonth(Date.now());
    return buildWrapped(history, prs, year, monthIndex);
  }, [history, prs]);

  if (!wrapped || dismissed) return null;
  try {
    if (localStorage.getItem(SEEN_KEY) === wrapped.monthKey) return null;
  } catch { /* storage blocked — just show it */ }

  function open() {
    markSeen();
    navigate('/wrapped');
  }

  function markSeen() {
    setDismissed(true);
    try {
      if (wrapped) localStorage.setItem(SEEN_KEY, wrapped.monthKey);
    } catch { /* fine */ }
  }

  return (
    <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 24 }}>
    <Card className="flex items-center gap-3 border-accent/40 bg-accent/5" onClick={open}>
      {/* A present that begs to be opened — gentle periodic wiggle. */}
      <motion.span
        className="shrink-0"
        animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
      >
        <Gift size={20} className="text-accent" />
      </motion.span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Your {wrapped.monthLabel} Wrapped is ready 🎁</p>
        <p className="text-[11px] text-muted">{wrapped.volumeKg.toLocaleString()} kg · {wrapped.sessions} sessions · {wrapped.prCount} PRs — tap to relive it</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); markSeen(); }} aria-label="Dismiss Wrapped teaser" className="text-muted"><X size={15} /></button>
    </Card>
    </motion.div>
  );
}
