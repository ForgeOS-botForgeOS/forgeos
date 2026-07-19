import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './ui';
import { useWorkout } from '../state/workoutStore';
import { useHealth, sortedDays } from '../state/healthStore';
import { buildWeeklyReview } from '../lib/weeklyReview';

const SEEN_KEY = 'forge-weekly-review-seen';

// The coach's Monday recap of the *completed* week (WeeklyRecap covers the
// current one). Appears at the start of each new week until dismissed;
// dismissal is remembered per reviewed week.
export function WeeklyReviewCard() {
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const healthDays = useHealth((s) => s.days);
  const [dismissed, setDismissed] = useState(false);

  const review = useMemo(
    () => buildWeeklyReview(history, prs, sortedDays(healthDays), Date.now()),
    [history, prs, healthDays],
  );

  if (!review || dismissed) return null;
  try {
    if (localStorage.getItem(SEEN_KEY) === review.weekStartISO) return null;
  } catch { /* storage blocked — just show it */ }

  function dismiss() {
    setDismissed(true);
    try {
      if (review) localStorage.setItem(SEEN_KEY, review.weekStartISO);
    } catch { /* fine */ }
  }

  return (
    <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 24 }}>
    <Card className="space-y-2 border-accent/40 bg-accent/5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2"><Brain size={15} className="text-accent" /> Coach review · {review.weekLabel}</p>
        <button onClick={dismiss} aria-label="Dismiss weekly review" className="text-muted"><X size={15} /></button>
      </div>
      <p className="text-xs text-muted">
        {review.sessions} session{review.sessions === 1 ? '' : 's'} · {review.volumeKg.toLocaleString()} kg
        {review.volumeDeltaPct != null && (
          <span className={review.volumeDeltaPct >= 0 ? 'text-success' : 'text-danger'}>
            {' '}({review.volumeDeltaPct >= 0 ? '+' : ''}{review.volumeDeltaPct}%)
          </span>
        )}
        {review.prCount > 0 && <> · 🏆 {review.prCount} PR{review.prCount === 1 ? '' : 's'}</>}
        {review.bestSet && <> · best: {review.bestSet.exerciseName} {review.bestSet.weightKg} kg</>}
      </p>
      {review.readinessTrend && (
        <p className="text-xs text-muted flex items-center gap-1">
          {review.readinessTrend === 'up' ? <TrendingUp size={13} className="text-success" /> : <TrendingDown size={13} className="text-danger" />}
          Recovery trended {review.readinessTrend} through the week
        </p>
      )}
      <p className="text-sm">{review.focus}</p>
    </Card>
    </motion.div>
  );
}
