import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Button } from './ui';
import { useUser } from '../state/userStore';
import { haptic } from '../lib/haptics';

export function WeighInTracker() {
  const weighIns = useUser((s) => s.weighIns);
  const addWeighIn = useUser((s) => s.addWeighIn);
  const profile = useUser((s) => s.profile);
  const [val, setVal] = useState(profile?.weightKg ?? 80);

  // 3-point rolling average to smooth daily noise.
  const data = useMemo(() => {
    return weighIns.map((w, i) => {
      const window = weighIns.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((a, x) => a + x.weightKg, 0) / window.length;
      return { date: w.date.slice(5), weight: w.weightKg, avg: Math.round(avg * 10) / 10 };
    });
  }, [weighIns]);

  return (
    <Card className="space-y-3">
      <div className="h-32">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 }}
                formatter={(v, n) => [`${v} kg`, n === 'avg' ? 'Rolling avg' : 'Weight']}
              />
              <Line type="monotone" dataKey="weight" stroke="rgb(var(--muted))" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="avg" stroke="rgb(var(--accent))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted">Log a weigh-in to see your trend.</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-lg bg-surface-2 w-9 h-9 text-lg" onClick={() => setVal((v) => Math.round((v - 0.1) * 10) / 10)}>−</button>
        <span className="font-mono font-bold flex-1 text-center">{val.toFixed(1)} kg</span>
        <button className="rounded-lg bg-surface-2 w-9 h-9 text-lg" onClick={() => setVal((v) => Math.round((v + 0.1) * 10) / 10)}>+</button>
        <Button onClick={() => { addWeighIn(val); haptic('success'); }}>Log</Button>
      </div>
    </Card>
  );
}
