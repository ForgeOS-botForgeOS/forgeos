import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './ui';
import { useWorkout } from '../state/workoutStore';
import { useHealth, sortedDays } from '../state/healthStore';
import { buildWeeklyReview } from '../lib/weeklyReview';
import { useT, useTn, useLocale } from '../lib/i18n';

const SEEN_KEY = 'forge-weekly-review-seen';

// The coach's Monday recap of the *completed* week (WeeklyRecap covers the
// current one). Appears at the start of each new week until dismissed;
// dismissal is remembered per reviewed week.
export function WeeklyReviewCard() {
  const t = useT();
  const tn = useTn();
  const locale = useLocale();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const healthDays = useHealth((s) => s.days);
  const [dismissed, setDismissed] = useState(false);

  const review = useMemo(
    () => buildWeeklyReview(history, prs, sortedDays(healthDays), Date.now(), locale),
    [history, prs, healthDays, locale],
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
        <p className="text-sm font-semibold flex items-center gap-2"><Brain size={15} className="text-accent" /> {t('wr.coachReview', { week: review.weekLabel })}</p>
        <button onClick={dismiss} aria-label={t('wr.dismiss')} className="text-muted"><X size={15} /></button>
      </div>
      <p className="text-xs text-muted">
        {tn('wr.session', review.sessions)} · {review.volumeKg.toLocaleString(locale)} kg
        {review.volumeDeltaPct != null && (
          <span className={review.volumeDeltaPct >= 0 ? 'text-success' : 'text-danger'}>
            {' '}({review.volumeDeltaPct >= 0 ? '+' : ''}{review.volumeDeltaPct}%)
          </span>
        )}
        {review.prCount > 0 && <> · 🏆 {tn('wr.pr', review.prCount)}</>}
        {review.bestSet && <> · {t('wr.best', { name: review.bestSet.exerciseName, kg: review.bestSet.weightKg })}</>}
      </p>
      {review.readinessTrend && (
        <p className="text-xs text-muted flex items-center gap-1">
          {review.readinessTrend === 'up' ? <TrendingUp size={13} className="text-success" /> : <TrendingDown size={13} className="text-danger" />}
          {review.readinessTrend === 'up' ? t('wr.recoveryUp') : t('wr.recoveryDown')}
        </p>
      )}
      <p className="text-sm">{t(review.focusKey)}</p>
    </Card>
    </motion.div>
  );
}
