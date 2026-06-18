import { Plus, X } from 'lucide-react';
import { Pill } from './ui';
import { speedKmh, paceLabel, CARDIO_MACHINES, type CardioData } from '../lib/cardio';
import { haptic } from '../lib/haptics';
import type { CardioMetric } from '../types';

const METRIC_PRESETS = ['Avg HR', 'Max HR', 'Elevation', 'Cadence', 'Power', 'RPE', 'Splits', 'Laps'];

const muid = () => Math.random().toString(36).slice(2, 10);

// A stepped number row used across every cardio surface.
export function CRow({ label, v, step, onChange }: { label: string; v: number; step: number; onChange: (v: number) => void }) {
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(0, round(v - step)))} className="w-8 h-8 rounded-md bg-surface-2">−</button>
        <input type="number" inputMode="decimal" value={v} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="w-16 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-center font-mono text-text" />
        <button onClick={() => onChange(round(v + step))} className="w-8 h-8 rounded-md bg-surface-2">+</button>
      </div>
    </div>
  );
}

// Add / edit / remove your own metrics (label + free-text value).
export function MetricsEditor({ metrics, onChange }: { metrics: CardioMetric[]; onChange: (m: CardioMetric[]) => void }) {
  const add = (label = '') => { haptic('tap'); onChange([...metrics, { id: muid(), label, value: '' }]); };
  const patch = (id: string, p: Partial<CardioMetric>) => onChange(metrics.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const remove = (id: string) => onChange(metrics.filter((m) => m.id !== id));
  const used = new Set(metrics.map((m) => m.label));
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">Your metrics</p>
      {metrics.map((m) => (
        <div key={m.id} className="flex items-center gap-2">
          <input value={m.label} onChange={(e) => patch(m.id, { label: e.target.value })} placeholder="Metric" className="w-28 shrink-0 rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm" />
          <input value={m.value} onChange={(e) => patch(m.id, { value: e.target.value })} placeholder="e.g. 152 bpm" className="flex-1 min-w-0 rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm font-mono" />
          <button onClick={() => remove(m.id)} aria-label="Remove metric" className="text-muted shrink-0 p-1"><X size={16} /></button>
        </div>
      ))}
      <div className="flex gap-1.5 flex-wrap">
        {METRIC_PRESETS.filter((p) => !used.has(p)).map((p) => (
          <button key={p} onClick={() => add(p)} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted flex items-center gap-1"><Plus size={11} /> {p}</button>
        ))}
        <button onClick={() => add()} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-accent flex items-center gap-1"><Plus size={11} /> Custom</button>
      </div>
    </div>
  );
}

// The full, fully-editable cardio form: activity, distance/time/calories,
// live-derived speed + pace, and your own metrics.
export function CardioFields({ data, onChange }: { data: CardioData; onChange: (d: CardioData) => void }) {
  const set = (patch: Partial<CardioData>) => onChange({ ...data, ...patch });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {CARDIO_MACHINES.map((m) => <Pill key={m} active={data.machine === m} onClick={() => set({ machine: m })}>{m}</Pill>)}
      </div>
      <input value={data.machine} onChange={(e) => set({ machine: e.target.value })} placeholder="Activity name" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm font-semibold" />
      <CRow label="Distance (km)" v={data.distanceKm} step={0.1} onChange={(v) => set({ distanceKm: v })} />
      <CRow label="Time (min)" v={data.durationMin} step={1} onChange={(v) => set({ durationMin: v })} />
      <CRow label="Calories" v={data.calories} step={10} onChange={(v) => set({ calories: v })} />
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-surface-2 py-2 text-center">
          <p className="font-mono font-bold text-sm">{speedKmh(data.distanceKm, data.durationMin) || '—'}<span className="text-[10px] text-muted font-sans"> km/h</span></p>
          <p className="text-[10px] text-muted">avg speed</p>
        </div>
        <div className="flex-1 rounded-xl bg-surface-2 py-2 text-center">
          <p className="font-mono font-bold text-sm">{paceLabel(data.distanceKm, data.durationMin)}</p>
          <p className="text-[10px] text-muted">pace</p>
        </div>
      </div>
      <MetricsEditor metrics={data.metrics} onChange={(metrics) => set({ metrics })} />
    </div>
  );
}
