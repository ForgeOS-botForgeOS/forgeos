import { useMemo } from 'react';
import { useWorkout } from '../state/workoutStore';

// Volume/intensity heatmap: last ~17 weeks, darker = more daily volume.
export function Heatmap() {
  const history = useWorkout((s) => s.history);

  const { cells, max } = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const w of history) {
      const key = w.date.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + (w.totalVolumeKg ?? 0));
    }
    const days = 7 * 17;
    const out: { date: string; volume: number }[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, volume: byDay.get(key) ?? 0 });
    }
    const max = Math.max(1, ...out.map((c) => c.volume));
    return { cells: out, max };
  }, [history]);

  return (
    <div className="space-y-2">
      <div className="grid grid-rows-7 grid-flow-col gap-1 overflow-x-auto no-scrollbar">
        {cells.map((c) => {
          const intensity = c.volume / max;
          const bg =
            c.volume === 0
              ? 'rgb(var(--surface-2))'
              : `rgb(var(--accent) / ${0.2 + intensity * 0.8})`;
          return <div key={c.date} title={`${c.date}: ${Math.round(c.volume)} kg`} className="w-3 h-3 rounded-sm" style={{ backgroundColor: bg }} />;
        })}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted">
        <span>less</span>
        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(var(--surface-2))' }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(var(--accent) / 0.4)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(var(--accent) / 0.7)' }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgb(var(--accent))' }} />
        <span>more</span>
      </div>
    </div>
  );
}
