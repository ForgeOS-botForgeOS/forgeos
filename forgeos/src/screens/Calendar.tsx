import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { useWorkout } from '../state/workoutStore';
import { exerciseById } from '../data/exercises';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Calendar() {
  const navigate = useNavigate();
  const history = useWorkout((s) => s.history);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState<string | null>(null);

  // Map date -> { volume, count } for the visible month.
  const byDay = useMemo(() => {
    const map = new Map<string, { volume: number; count: number }>();
    for (const w of history) {
      const key = w.date.slice(0, 10);
      const cur = map.get(key) ?? { volume: 0, count: 0 };
      cur.volume += w.totalVolumeKg ?? 0;
      cur.count += 1;
      map.set(key, cur);
    }
    return map;
  }, [history]);

  const maxVol = Math.max(1, ...[...byDay.values()].map((v) => v.volume));

  const first = new Date(cursor.y, cursor.m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d).toISOString().slice(0, 10));

  const monthName = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedWorkouts = selected ? history.filter((w) => w.date.slice(0, 10) === selected) : [];

  function shift(delta: number) {
    setSelected(null);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>

      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><ChevronLeft size={18} /></button>
        <h1 className="text-lg font-extrabold">{monthName}</h1>
        <button onClick={() => shift(1)} className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => <span key={d} className="text-[10px] text-muted">{d}</span>)}
        {cells.map((key, i) => {
          if (!key) return <div key={`e${i}`} />;
          const day = Number(key.slice(8, 10));
          const info = byDay.get(key);
          const intensity = info ? 0.25 + (info.volume / maxVol) * 0.75 : 0;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => info && setSelected(selected === key ? null : key)}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs relative ${isToday ? 'ring-1 ring-accent' : ''}`}
              style={{ background: info ? `rgb(var(--accent) / ${intensity})` : 'rgb(var(--surface-2))' }}
            >
              <span className={info && intensity > 0.6 ? 'text-black font-semibold' : 'text-muted'}>{day}</span>
              {info && info.count > 1 && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent-2" />}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted text-center">Shaded by training volume · tap a day for details</p>

      {selected && (
        <div className="space-y-2">
          {selectedWorkouts.map((w) => (
            <Card key={w.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm flex items-center gap-2"><Dumbbell size={14} className="text-accent" /> {w.name}</p>
                <Badge>{Math.round(w.totalVolumeKg ?? 0).toLocaleString()} kg</Badge>
              </div>
              <p className="text-xs text-muted">{w.exercises.map((e) => exerciseById(e.exerciseId)?.name).filter(Boolean).slice(0, 5).join(' · ')}</p>
            </Card>
          ))}
        </div>
      )}

      {history.length === 0 && <p className="text-sm text-muted text-center">No workouts logged yet.</p>}
    </div>
  );
}
