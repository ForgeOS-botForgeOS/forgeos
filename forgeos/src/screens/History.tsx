import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Dumbbell, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Badge, Pill } from '../components/ui';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { exerciseById } from '../data/exercises';
import { e1rmSeries } from '../lib/analytics';
import { liftBadge } from '../data/ranks';

export default function History() {
  const navigate = useNavigate();
  const history = useWorkout((s) => s.history);
  const [tab, setTab] = useState<'sessions' | 'lifts'>('sessions');

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <h1 className="text-2xl font-extrabold">History</h1>
      <div className="flex gap-2">
        <Pill active={tab === 'sessions'} onClick={() => setTab('sessions')}>Sessions</Pill>
        <Pill active={tab === 'lifts'} onClick={() => setTab('lifts')}>Lifts</Pill>
      </div>
      {history.length === 0 && <p className="text-sm text-muted">No sessions logged yet.</p>}
      {tab === 'sessions' ? <Sessions /> : <Lifts />}
    </div>
  );
}

function Sessions() {
  const history = useWorkout((s) => s.history);
  return (
    <div className="space-y-2">
      {history.map((w) => {
        const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
        return (
          <Card key={w.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2"><Dumbbell size={14} className="text-accent" /> {w.name}</p>
              <span className="text-[11px] text-muted">{new Date(w.date).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-muted">{Math.round(w.totalVolumeKg ?? 0).toLocaleString()} kg · {sets} sets · {w.exercises.length} exercises {w.synced === false && '· ⏳ queued'}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {w.exercises.slice(0, 6).map((e) => (
                <span key={e.id} className="text-[10px] rounded-full bg-surface-2 px-2 py-0.5 text-muted">{exerciseById(e.exerciseId)?.name ?? '—'}</span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Lifts() {
  const history = useWorkout((s) => s.history);
  const bodyweight = useUser((s) => s.profile?.weightKg ?? 80);

  // Distinct exercises seen across history, most-trained first.
  const lifts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of history) for (const e of w.exercises) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [history]);

  if (lifts.length === 0) return <p className="text-sm text-muted">Log some lifts to see per-exercise progression.</p>;

  return (
    <div className="space-y-3">
      {lifts.map((id) => {
        const series = e1rmSeries(history, id);
        const best = Math.max(0, ...series.map((p) => p.e1rm));
        const badge = liftBadge(best, bodyweight);
        const ex = exerciseById(id);
        return (
          <Card key={id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{ex?.name ?? id}</p>
              <Badge color={badge.color}>{badge.name}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[11px] text-muted">best e1RM</p>
                <p className="font-mono font-bold">{best} kg</p>
              </div>
              {series.length > 1 && (
                <div className="flex-1 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                      <Tooltip contentStyle={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} kg`, 'e1RM']} />
                      <Line type="monotone" dataKey="e1rm" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {series.length > 1 && (
              <p className="text-[11px] text-muted flex items-center gap-1">
                <TrendingUp size={11} className="text-success" />
                {series[0].e1rm} → {series[series.length - 1].e1rm} kg over {series.length} sessions
              </p>
            )}
          </Card>
        );
      })}
      <p className="text-[11px] text-muted/70">Badges are body-weight-adjusted (e1RM scaled around 80 kg) · current weight {bodyweight} kg</p>
    </div>
  );
}
