import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, Button } from './ui';
import { useUser } from '../state/userStore';
import { weightTrend, daysSinceWeighIn } from '../lib/goalWeight';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';

export function WeighInTracker() {
  const weighIns = useUser((s) => s.weighIns);
  const addWeighIn = useUser((s) => s.addWeighIn);
  const updateProfile = useUser((s) => s.updateProfile);
  const profile = useUser((s) => s.profile);
  const [val, setVal] = useState(profile?.weightKg ?? 80);
  const [editGoal, setEditGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(profile?.goalWeightKg ?? profile?.weightKg ?? 80);

  const goalKg = profile?.goalWeightKg;
  const trend = useMemo(() => weightTrend(weighIns, goalKg), [weighIns, goalKg]);
  const staleDays = useMemo(() => daysSinceWeighIn(weighIns), [weighIns]);

  // 3-point rolling average to smooth daily noise.
  const data = useMemo(() => {
    return weighIns.map((w, i) => {
      const window = weighIns.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((a, x) => a + x.weightKg, 0) / window.length;
      return { date: w.date.slice(5), weight: w.weightKg, avg: Math.round(avg * 10) / 10 };
    });
  }, [weighIns]);

  function saveGoal() {
    updateProfile({ goalWeightKg: Math.round(goalDraft * 10) / 10 });
    setEditGoal(false);
    haptic('success');
    toast(`Goal set: ${goalDraft.toFixed(1)} kg 🎯`);
  }

  return (
    <Card className="space-y-3">
      <div className="h-32">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[(min: number) => Math.min(min - 1, goalKg ? goalKg - 1 : Infinity), (max: number) => Math.max(max + 1, goalKg ? goalKg + 1 : -Infinity)]} hide />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 }}
                formatter={(v, n) => [`${v} kg`, n === 'avg' ? 'Rolling avg' : 'Weight']}
              />
              {goalKg !== undefined && <ReferenceLine y={goalKg} stroke="rgb(var(--accent-2))" strokeDasharray="4 4" strokeOpacity={0.7} />}
              <Line type="monotone" dataKey="weight" stroke="rgb(var(--muted))" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="avg" stroke="rgb(var(--accent))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted">Log a weigh-in to see your trend.</div>
        )}
      </div>

      {/* Trend + goal projection */}
      {trend && (
        <p className="text-[11px] text-muted flex items-center gap-1.5">
          {trend.ratePerWeek < 0 ? <TrendingDown size={12} className="text-success" /> : <TrendingUp size={12} className="text-accent-2" />}
          {Math.abs(trend.ratePerWeek) < 0.05
            ? 'Holding steady'
            : `${trend.ratePerWeek > 0 ? '+' : ''}${trend.ratePerWeek.toFixed(2)} kg/week`}
          {goalKg !== undefined && trend.etaWeeks === 0 && <span>· at your goal 🎉</span>}
          {goalKg !== undefined && trend.etaDate && trend.etaWeeks !== null && trend.etaWeeks > 0 && (
            <span>· {goalKg} kg around {new Date(trend.etaDate + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
          )}
          {goalKg !== undefined && !trend.etaDate && trend.etaWeeks !== 0 && <span>· not moving toward {goalKg} kg yet</span>}
        </p>
      )}
      {staleDays !== null && staleDays >= 7 && (
        <p className="text-[11px] text-muted">Last weigh-in {staleDays} days ago — hop on the scale 📈</p>
      )}

      {/* Goal weight row */}
      {editGoal ? (
        <div className="flex items-center gap-2">
          <button className="rounded-lg bg-surface-2 w-9 h-9 text-lg" onClick={() => setGoalDraft((v) => Math.round((v - 0.5) * 10) / 10)}>−</button>
          <span className="font-mono font-bold flex-1 text-center">{goalDraft.toFixed(1)} kg goal</span>
          <button className="rounded-lg bg-surface-2 w-9 h-9 text-lg" onClick={() => setGoalDraft((v) => Math.round((v + 0.5) * 10) / 10)}>+</button>
          <Button onClick={saveGoal}>Set</Button>
        </div>
      ) : (
        <button onClick={() => { setGoalDraft(goalKg ?? profile?.weightKg ?? 80); setEditGoal(true); }} className="flex items-center gap-1.5 text-[11px] text-accent-2">
          <Target size={12} />
          {goalKg !== undefined ? `Goal: ${goalKg} kg — change` : 'Set a goal weight'}
        </button>
      )}

      <div className="flex items-center gap-2">
        <button className="rounded-lg bg-surface-2 w-9 h-9 text-lg" onClick={() => setVal((v) => Math.round((v - 0.1) * 10) / 10)}>−</button>
        <span className="font-mono font-bold flex-1 text-center">{val.toFixed(1)} kg</span>
        <button className="rounded-lg bg-surface-2 w-9 h-9 text-lg" onClick={() => setVal((v) => Math.round((v + 0.1) * 10) / 10)}>+</button>
        <Button onClick={() => { addWeighIn(val); haptic('success'); }}>Log</Button>
      </div>
    </Card>
  );
}
