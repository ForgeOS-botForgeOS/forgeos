import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Dumbbell, Activity, CheckCircle2, Play } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { decodeWorkout, sharedToExercises } from '../lib/workoutShare';
import { useWorkout } from '../state/workoutStore';
import { exerciseById } from '../data/exercises';
import { haptic } from '../lib/haptics';
import { askConfirm } from '../lib/dialog';
import { toast } from '../lib/toast';

export default function ImportWorkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const active = useWorkout((s) => s.active);
  const startSharedWorkout = useWorkout((s) => s.startSharedWorkout);
  const logCardio = useWorkout((s) => s.logCardio);
  const [done, setDone] = useState(false);

  const code = params.get('w') ?? '';
  const shared = useMemo(() => (code ? decodeWorkout(code) : null), [code]);

  async function startIt() {
    if (!shared) return;
    if (active && !(await askConfirm({
      title: 'Replace your current workout?',
      body: 'You already have a session in progress. Starting this one discards it.',
      confirmLabel: 'Replace it',
      tone: 'danger',
    }))) return;
    startSharedWorkout(shared.name, sharedToExercises(shared));
    setDone(true);
    haptic('success');
    setTimeout(() => navigate('/train'), 700);
  }

  function logIt() {
    if (!shared?.cardio) return;
    const c = shared.cardio;
    logCardio(c.machine, c.distanceKm, c.durationMin, c.calories, c.metrics);
    setDone(true);
    haptic('success');
    toast('Cardio added to your history');
    setTimeout(() => navigate('/history'), 700);
  }

  const totalSets = shared?.exercises.reduce((a, e) => a + e.sets.length, 0) ?? 0;

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Home</button>
      <h1 className="text-2xl font-extrabold">Shared workout</h1>

      {!shared ? (
        <Card><p className="text-sm text-muted">This share link is invalid or empty.</p></Card>
      ) : done ? (
        <Card className="flex items-center gap-3"><CheckCircle2 className="text-success" /><p className="text-sm">Added! Taking you there…</p></Card>
      ) : shared.cardio ? (
        <>
          <p className="text-sm text-muted">A friend shared this cardio session.</p>
          <Card className="space-y-1">
            <p className="font-semibold flex items-center gap-2"><Activity size={15} className="text-accent-2" /> {shared.cardio.machine}</p>
            <p className="text-xs text-muted">
              {shared.cardio.distanceKm ? `${shared.cardio.distanceKm} km · ` : ''}{Math.round(shared.cardio.durationMin)} min
              {shared.cardio.calories ? ` · ${shared.cardio.calories} kcal` : ''}
            </p>
          </Card>
          <Button className="w-full justify-center" onClick={logIt}>
            <span className="flex items-center gap-2"><Activity size={16} /> Add to my history</span>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">A friend shared this workout — {shared.exercises.length} exercises · {totalSets} sets. Start it as your session and the weights come pre-filled.</p>
          {shared.exercises.map((e, i) => (
            <Card key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm flex items-center gap-2"><Dumbbell size={14} className="text-accent" /> {exerciseById(e.exerciseId)?.name ?? 'Exercise'}</p>
                <Badge>{e.sets.length} sets</Badge>
              </div>
              <p className="text-xs text-muted">{e.sets.map((s) => `${s.weightKg}kg×${s.reps}`).join(' · ')}</p>
            </Card>
          ))}
          <Button className="w-full justify-center" onClick={startIt}>
            <span className="flex items-center gap-2"><Play size={16} /> Start this workout</span>
          </Button>
          <p className="text-[11px] text-muted/70">It becomes your active session — finish it to log it and earn XP.</p>
        </>
      )}
    </div>
  );
}
