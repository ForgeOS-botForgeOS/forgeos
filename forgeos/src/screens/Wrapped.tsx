import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Share2, Trophy, Dumbbell, Flame, Clock, Heart } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { celebrate } from '../lib/toast';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { rankForXp, rankLabel } from '../data/ranks';
import { buildWrapped, lastCompletedMonth } from '../lib/wrapped';
import { generateShareCard, downloadDataUrl } from '../lib/shareCard';
import { toast } from '../lib/toast';
import { haptic } from '../lib/haptics';
import { useT, useTn, useLocale } from '../lib/i18n';

// Forge Wrapped — your last month as a story-sized recap, shareable as a card.
export default function Wrapped() {
  const navigate = useNavigate();
  const t = useT();
  const tn = useTn();
  const locale = useLocale();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const name = useUser((s) => s.profile?.name ?? 'Athlete');
  const xp = useGami((s) => s.xp);

  const wrapped = useMemo(() => {
    const { year, monthIndex } = lastCompletedMonth(Date.now());
    return buildWrapped(history, prs, year, monthIndex, locale);
  }, [history, prs, locale]);

  // A recap is a small ceremony — confetti once per visit.
  const celebrated = useRef(false);
  useEffect(() => {
    if (wrapped && !celebrated.current) {
      celebrated.current = true;
      celebrate();
    }
  }, [wrapped]);

  function share() {
    if (!wrapped) return;
    haptic('success');
    const url = generateShareCard({
      name,
      rank: rankLabel(rankForXp(xp).tier),
      volumeKg: wrapped.volumeKg,
      sets: wrapped.sets,
      durationMin: wrapped.durationMin,
      prText: `${wrapped.monthLabel} · ${tn('wr.pr', wrapped.prCount)}${wrapped.bestLift ? ` · ${t('wrap.cardBest', { name: wrapped.bestLift.exerciseName, kg: wrapped.bestLift.weightKg })}` : ''}`,
    });
    if (!url) { toast(t('wrap.cardError'), 'error'); return; }
    downloadDataUrl(url, `forge-wrapped-${wrapped.monthKey}.png`);
    toast(t('wrap.cardSaved'), 'success');
  }

  return (
    <Screen title={t('wrap.title')} subtitle={wrapped ? wrapped.monthLabel : t('wrap.subtitleEmpty')}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>

      {!wrapped && (
        <Card className="text-center py-8 space-y-1">
          <p className="text-2xl">🌱</p>
          <p className="text-sm text-muted">{t('wrap.empty')}</p>
        </Card>
      )}

      {wrapped && (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
            <Card className="text-center py-6 space-y-1 border-accent/40 bg-accent/5">
              <p className="text-[11px] text-muted uppercase tracking-widest">{t('wrap.totalVolume')}</p>
              <p className="text-4xl font-extrabold font-mono text-accent"><CountUp value={wrapped.volumeKg} from={0} duration={1400} /><span className="text-lg"> kg</span></p>
              <p className="text-[11px] text-muted">{t('wrap.moved', { month: wrapped.monthLabel })}</p>
            </Card>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {([
              [<Dumbbell key="i" size={18} className="mx-auto text-accent mb-1" />, wrapped.sessions, t('wrap.lblSessions')],
              [<Flame key="i" size={18} className="mx-auto text-accent mb-1" />, wrapped.sets, t('wrap.lblSets')],
              [<Clock key="i" size={18} className="mx-auto text-accent mb-1" />, Math.round(wrapped.durationMin / 60), t('wrap.lblHours')],
              [<Trophy key="i" size={18} className="mx-auto text-accent-2 mb-1" />, wrapped.prCount, t('wrap.lblPRs')],
            ] as const).map(([icon, value, label], i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 300, damping: 24 }}>
                <Card className="text-center py-4">{icon}<p className="font-mono font-bold text-xl"><CountUp value={value} from={0} duration={900 + i * 150} /></p><p className="text-[10px] text-muted">{label}</p></Card>
              </motion.div>
            ))}
          </div>

          {(wrapped.bestLift || wrapped.favoriteExercise) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 24 }}>
              <Card className="space-y-1.5">
                {wrapped.bestLift && <p className="text-sm flex items-center gap-2"><Trophy size={14} className="text-accent-2" /> {t('wrap.bestLift')} <b>{wrapped.bestLift.exerciseName} {wrapped.bestLift.weightKg} kg</b></p>}
                {wrapped.favoriteExercise && <p className="text-sm flex items-center gap-2"><Heart size={14} className="text-accent" /> {t('wrap.favourite')} <b>{wrapped.favoriteExercise}</b></p>}
              </Card>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
            <Button className="w-full justify-center gap-2" onClick={share}><Share2 size={16} /> {t('wrap.saveCard')}</Button>
          </motion.div>
        </>
      )}
    </Screen>
  );
}
