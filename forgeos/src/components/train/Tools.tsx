import { useState } from 'react';
import { Pill } from '../ui';
import { platesPerSide, warmupSets, e1rm } from '../../lib/fitness';

type Tool = 'plate' | 'warmup' | '1rm';

export function Tools() {
  const [tool, setTool] = useState<Tool>('plate');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Pill active={tool === 'plate'} onClick={() => setTool('plate')}>Plate calc</Pill>
        <Pill active={tool === 'warmup'} onClick={() => setTool('warmup')}>Warm-up</Pill>
        <Pill active={tool === '1rm'} onClick={() => setTool('1rm')}>1RM</Pill>
      </div>
      {tool === 'plate' && <PlateCalc />}
      {tool === 'warmup' && <WarmupCalc />}
      {tool === '1rm' && <OneRmCalc />}
    </div>
  );
}

const PLATE_COLOR: Record<number, string> = {
  25: '#ef4444',
  20: '#3b82f6',
  15: '#eab308',
  10: '#22c55e',
  5: '#e5e7eb',
  2.5: '#1f2937',
  1.25: '#94a3b8',
};

function PlateCalc() {
  const [total, setTotal] = useState(100);
  const plates = platesPerSide(total);
  return (
    <div className="space-y-3">
      <NumInput label="Target (incl. 20kg bar)" value={total} step={2.5} onChange={setTotal} unit="kg" />
      <div className="flex items-center justify-center gap-1 py-4 bg-surface-2 rounded-xl min-h-[100px]">
        {/* visual plate layout, one side */}
        {plates.length === 0 ? (
          <span className="text-sm text-muted">Just the bar.</span>
        ) : (
          <>
            <div className="w-1.5 h-2 bg-muted" />
            {plates.flatMap(({ plate, count }) =>
              Array.from({ length: count }).map((_, i) => (
                <div
                  key={`${plate}-${i}`}
                  title={`${plate}kg`}
                  className="rounded-sm border border-black/30"
                  style={{
                    backgroundColor: PLATE_COLOR[plate] ?? '#888',
                    width: 10,
                    height: 28 + plate * 1.6,
                  }}
                />
              )),
            )}
            <div className="w-10 h-1.5 bg-muted" />
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2 justify-center text-xs">
        {plates.map(({ plate, count }) => (
          <span key={plate} className="rounded-full bg-surface-2 px-2 py-1">{count} × {plate}kg</span>
        ))}
      </div>
      <p className="text-[11px] text-muted text-center">Plates shown per side · 20 kg Olympic bar</p>
    </div>
  );
}

function WarmupCalc() {
  const [work, setWork] = useState(100);
  const sets = warmupSets(work);
  return (
    <div className="space-y-3">
      <NumInput label="Working weight" value={work} step={2.5} onChange={setWork} unit="kg" />
      <div className="space-y-2">
        {sets.map((s) => (
          <div key={s.pct} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted">{s.pct}%</span>
            <span className="font-mono font-bold">{s.kg} kg</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-accent/15 px-4 py-3">
          <span className="text-sm">Working</span>
          <span className="font-mono font-bold">{work} kg</span>
        </div>
      </div>
    </div>
  );
}

function OneRmCalc() {
  const [w, setW] = useState(100);
  const [r, setR] = useState(5);
  const est = e1rm(w, r);
  return (
    <div className="space-y-3">
      <NumInput label="Weight" value={w} step={2.5} onChange={setW} unit="kg" />
      <NumInput label="Reps" value={r} step={1} onChange={setR} unit="" />
      <div className="rounded-xl bg-accent/15 px-4 py-5 text-center">
        <p className="text-xs text-muted">Estimated 1RM (Epley + Brzycki avg)</p>
        <p className="font-mono text-3xl font-bold mt-1">{est} kg</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {[0.9, 0.8, 0.7].map((p) => (
          <div key={p} className="rounded-lg bg-surface-2 py-2">
            <p className="text-muted">{Math.round(p * 100)}%</p>
            <p className="font-mono font-bold">{Math.round((est * p) / 2.5) * 2.5}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumInput({ label, value, step, unit, onChange }: { label: string; value: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(0, value - step))} className="w-8 h-8 rounded-md bg-surface-2">−</button>
        <span className="font-mono font-bold w-16 text-center">{value}{unit && ` ${unit}`}</span>
        <button onClick={() => onChange(value + step)} className="w-8 h-8 rounded-md bg-surface-2">+</button>
      </div>
    </div>
  );
}
