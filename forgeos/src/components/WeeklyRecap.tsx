import { useMemo } from 'react';
import { TrendingUp, Dumbbell, Trophy, Flame } from 'lucide-react';
import { Card, SectionTitle } from './ui';
import { useWorkout } from '../state/workoutStore';
import { exerciseById } from '../data/exercises';
import { e1rm } from '../lib/fitness';

// "Your week in review" — sessions, volume, sets, PRs and best lift this week.
export function WeeklyRecap() {
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);

  const recap = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const week = history.filter((w) => new Date(w.date) >= monday);
    let volume = 0;
    let sets = 0;
    let best: { name: string; e1rm: number } | null = null;
    for (const w of week) {
      volume += w.totalVolumeKg ?? 0;
      for (const we of w.exercises) {
        for (const s of we.sets.filter((x) => x.completed)) {
          sets += 1;
          const est = e1rm(s.weightKg, s.reps);
          if (!best || est > best.e1rm) best = { name: exerciseById(we.exerciseId)?.name ?? 'Lift', e1rm: est };
        }
      }
    }
    const weekPrs = prs.filter((p) => new Date(p.date) >= monday).length;
    return { sessions: week.length, volume: Math.round(volume), sets, best, weekPrs };
  }, [history, prs]);

  if (recap.sessions === 0) return null;

  return (
    <div>
      <SectionTitle action={<span className="text-xs text-muted flex items-center gap-1"><TrendingUp size={12} /> this week</span>}>Week in review</SectionTitle>
      <Card className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center"><Dumbbell size={16} className="text-accent mb-1" /><p className="font-mono font-bold">{recap.sessions}</p><p className="text-[10px] text-muted">sessions</p></div>
          <div className="flex flex-col items-center"><Flame size={16} className="text-accent mb-1" /><p className="font-mono font-bold">{recap.volume.toLocaleString()}</p><p className="text-[10px] text-muted">kg moved</p></div>
          <div className="flex flex-col items-center"><Trophy size={16} className="text-accent-2 mb-1" /><p className="font-mono font-bold">{recap.weekPrs}</p><p className="text-[10px] text-muted">PRs</p></div>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-line pt-2">
          <span className="text-muted">{recap.sets} working sets</span>
          {recap.best && <span>Top lift: <b>{recap.best.name}</b> · {recap.best.e1rm}kg e1RM</span>}
        </div>
      </Card>
    </div>
  );
}
