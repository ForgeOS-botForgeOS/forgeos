import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Share2, Trophy, Dumbbell, Flame, Clock, Heart } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button } from '../components/ui';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { rankForXp, rankLabel } from '../data/ranks';
import { buildWrapped, lastCompletedMonth } from '../lib/wrapped';
import { generateShareCard, downloadDataUrl } from '../lib/shareCard';
import { toast } from '../lib/toast';
import { haptic } from '../lib/haptics';

// Forge Wrapped — your last month as a story-sized recap, shareable as a card.
export default function Wrapped() {
  const navigate = useNavigate();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const name = useUser((s) => s.profile?.name ?? 'Athlete');
  const xp = useGami((s) => s.xp);

  const wrapped = useMemo(() => {
    const { year, monthIndex } = lastCompletedMonth(Date.now());
    return buildWrapped(history, prs, year, monthIndex);
  }, [history, prs]);

  function share() {
    if (!wrapped) return;
    haptic('success');
    const url = generateShareCard({
      name,
      rank: rankLabel(rankForXp(xp).tier),
      volumeKg: wrapped.volumeKg,
      sets: wrapped.sets,
      durationMin: wrapped.durationMin,
      prText: `${wrapped.monthLabel} · ${wrapped.prCount} PR${wrapped.prCount === 1 ? '' : 's'}${wrapped.bestLift ? ` · best ${wrapped.bestLift.exerciseName} ${wrapped.bestLift.weightKg} kg` : ''}`,
    });
    if (!url) { toast('Could not render the card', 'error'); return; }
    downloadDataUrl(url, `forge-wrapped-${wrapped.monthKey}.png`);
    toast('Wrapped card saved 🎁', 'success');
  }

  return (
    <Screen title="Forge Wrapped 🎁" subtitle={wrapped ? wrapped.monthLabel : 'Your month in iron'}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>

      {!wrapped && (
        <Card className="text-center py-8 space-y-1">
          <p className="text-2xl">🌱</p>
          <p className="text-sm text-muted">No finished workouts last month — this month is the one to wrap.</p>
        </Card>
      )}

      {wrapped && (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
            <Card className="text-center py-6 space-y-1 border-accent/40 bg-accent/5">
              <p className="text-[11px] text-muted uppercase tracking-widest">total volume</p>
              <p className="text-4xl font-extrabold font-mono text-accent">{wrapped.volumeKg.toLocaleString()}<span className="text-lg"> kg</span></p>
              <p className="text-[11px] text-muted">that's what you moved in {wrapped.monthLabel} 💪</p>
            </Card>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center py-4"><Dumbbell size={18} className="mx-auto text-accent mb-1" /><p className="font-mono font-bold text-xl">{wrapped.sessions}</p><p className="text-[10px] text-muted">sessions</p></Card>
            <Card className="text-center py-4"><Flame size={18} className="mx-auto text-accent mb-1" /><p className="font-mono font-bold text-xl">{wrapped.sets}</p><p className="text-[10px] text-muted">working sets</p></Card>
            <Card className="text-center py-4"><Clock size={18} className="mx-auto text-accent mb-1" /><p className="font-mono font-bold text-xl">{Math.round(wrapped.durationMin / 60)}h</p><p className="text-[10px] text-muted">under the bar</p></Card>
            <Card className="text-center py-4"><Trophy size={18} className="mx-auto text-accent-2 mb-1" /><p className="font-mono font-bold text-xl">{wrapped.prCount}</p><p className="text-[10px] text-muted">PRs</p></Card>
          </div>

          {(wrapped.bestLift || wrapped.favoriteExercise) && (
            <Card className="space-y-1.5">
              {wrapped.bestLift && <p className="text-sm flex items-center gap-2"><Trophy size={14} className="text-accent-2" /> Best lift: <b>{wrapped.bestLift.exerciseName} {wrapped.bestLift.weightKg} kg</b></p>}
              {wrapped.favoriteExercise && <p className="text-sm flex items-center gap-2"><Heart size={14} className="text-accent" /> Favourite: <b>{wrapped.favoriteExercise}</b></p>}
            </Card>
          )}

          <Button className="w-full justify-center gap-2" onClick={share}><Share2 size={16} /> Save the share card</Button>
        </>
      )}
    </Screen>
  );
}
