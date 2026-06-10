import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock } from 'lucide-react';
import { Card } from '../components/ui';
import { ACHIEVEMENTS, type AchievementStats } from '../data/achievements';
import { useWorkout } from '../state/workoutStore';
import { useGami } from '../state/gamificationStore';
import { useQuotes } from '../state/quoteStore';
import { rankForXp } from '../data/ranks';

export default function Achievements() {
  const navigate = useNavigate();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const xp = useGami((s) => s.xp);
  const coins = useGami((s) => s.coins);
  const streak = useGami((s) => s.streakDays);
  const heavyLifts = useGami((s) => s.heavyLifts);
  const quotes = useQuotes((s) => s.collected);

  const stats: AchievementStats = {
    sessions: history.length,
    prs: prs.length,
    streak,
    totalVolumeKg: history.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0),
    quotes: quotes.length,
    coins,
    rankIndex: rankForXp(xp).index,
    heavyLifts,
    cardioKm: history.reduce((a, w) => a + (w.cardio?.distanceKm ?? 0), 0),
  };

  const evaluated = ACHIEVEMENTS.map((a) => {
    const val = a.value(stats);
    return { ...a, val, unlocked: val >= a.goal, pct: Math.min(100, (val / a.goal) * 100) };
  });
  const unlockedCount = evaluated.filter((a) => a.unlocked).length;

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-extrabold">Achievements</h1>
        <span className="font-mono font-bold text-accent">{unlockedCount}/{ACHIEVEMENTS.length}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {evaluated.map((a) => (
          <Card key={a.id} className={`text-center space-y-1 ${a.unlocked ? '' : 'opacity-80'}`}>
            <div className="text-3xl">{a.unlocked ? a.icon : <Lock size={24} className="mx-auto text-muted" />}</div>
            <p className="text-sm font-semibold">{a.title}</p>
            <p className="text-[11px] text-muted leading-tight">{a.desc}</p>
            {!a.unlocked && (
              <>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-1"><div className="h-full bg-accent rounded-full" style={{ width: `${a.pct}%` }} /></div>
                <p className="text-[10px] text-muted font-mono">{Math.round(a.val).toLocaleString()}/{a.goal.toLocaleString()}</p>
              </>
            )}
            {a.unlocked && <p className="text-[10px] text-success font-semibold">UNLOCKED</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
