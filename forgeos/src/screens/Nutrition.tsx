import { useRef, useState } from 'react';
import { Camera, Trash2, Sparkles, Calculator } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button, Sheet, Badge, SectionTitle } from '../components/ui';
import { useNutrition } from '../state/nutritionStore';
import { useUser } from '../state/userStore';
import { scanMeal, visionIsLive } from '../lib/vision';
import { haptic } from '../lib/haptics';
import type { ScanResult } from '../types';

export default function Nutrition() {
  const profile = useUser((s) => s.profile);
  const log = useNutrition((s) => s.todaysEntries)();
  const totals = useNutrition((s) => s.todaysTotals)();
  const addEntry = useNutrition((s) => s.addEntry);
  const removeEntry = useNutrition((s) => s.removeEntry);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recompOpen, setRecompOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const macros = profile?.macros ?? { calories: 2200, proteinG: 160, carbsG: 220, fatG: 60 };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const r = await scanMeal(file);
      setResult(r);
      haptic('success');
    } finally {
      setScanning(false);
      e.target.value = '';
    }
  }

  const goalText: Record<string, string> = {
    lose: 'Lean toward high-volume, high-protein meals to stay full in a deficit.',
    gain: 'Add calorie-dense carbs and a shake to hit your surplus.',
    recomp: 'Cycle carbs higher on training days, protein steady at 2.2 g/kg.',
    maintain: 'Keep portions consistent; protein anchors every meal.',
    strength: 'Fuel hard sessions with carbs pre/post; protein 2.0 g/kg.',
  };

  return (
    <Screen title="Nutrition" subtitle={`${profile?.goal ?? 'recomp'} · ${macros.calories} kcal target`}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>AI macro scanner</SectionTitle>
          {visionIsLive ? <Badge color="rgb(var(--success))">Live</Badge> : <Badge color="rgb(var(--warn))">Mock</Badge>}
        </div>
        <Button className="w-full justify-center" disabled={scanning} onClick={() => fileRef.current?.click()}>
          <span className="flex items-center gap-2">
            {scanning ? <Sparkles size={16} className="animate-pulse" /> : <Camera size={16} />}
            {scanning ? 'Analysing photo…' : 'Scan a meal photo'}
          </span>
        </Button>
        <p className="text-[11px] text-muted/70">Wire a vision endpoint in <code>lib/vision.ts</code>. Without a key, realistic estimates are mocked.</p>
      </Card>

      {/* Today's totals */}
      <Card>
        <SectionTitle>Today</SectionTitle>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Tot label="kcal" value={Math.round(totals.calories)} target={macros.calories} />
          <Tot label="protein" value={Math.round(totals.proteinG)} target={macros.proteinG} />
          <Tot label="carbs" value={Math.round(totals.carbsG)} target={macros.carbsG} />
          <Tot label="fat" value={Math.round(totals.fatG)} target={macros.fatG} />
        </div>
      </Card>

      <Card className="flex gap-3 items-start bg-surface-2">
        <Sparkles size={16} className="text-accent-2 mt-0.5 shrink-0" />
        <p className="text-sm">{goalText[profile?.goal ?? 'recomp']}</p>
      </Card>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => setManualOpen(true)}>+ Manual entry</Button>
        <Button variant="ghost" className="justify-center" onClick={() => setRecompOpen(true)}><Calculator size={16} /></Button>
      </div>

      {/* Food log */}
      <div>
        <SectionTitle>Food log</SectionTitle>
        {log.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet today.</p>
        ) : (
          <div className="space-y-2">
            {log.map((f) => (
              <Card key={f.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">{f.name} {f.source === 'scan' && <Badge color="rgb(var(--accent-2))">scan</Badge>}</p>
                  <p className="text-xs text-muted">{f.calories} kcal · P{f.proteinG} C{f.carbsG} F{f.fatG}</p>
                </div>
                <button onClick={() => removeEntry(f.id)} className="text-muted"><Trash2 size={16} /></button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Scan result sheet */}
      <Sheet open={!!result} onClose={() => setResult(null)} title="Scan result">
        {result && (
          <div className="space-y-3">
            <p className="font-semibold">{result.name}</p>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <ScanStat label="kcal" v={result.calories} />
              <ScanStat label="P" v={result.proteinG} />
              <ScanStat label="C" v={result.carbsG} />
              <ScanStat label="F" v={result.fatG} />
              <ScanStat label="sugar" v={result.sugarG} />
            </div>
            <p className="text-xs text-muted">Confidence {Math.round(result.confidence * 100)}% · {result.tip}</p>
            <Button className="w-full justify-center" onClick={() => {
              addEntry({ name: result.name, calories: result.calories, proteinG: result.proteinG, carbsG: result.carbsG, fatG: result.fatG, sugarG: result.sugarG, source: 'scan', confidence: result.confidence });
              setResult(null);
            }}>
              Add to log
            </Button>
          </div>
        )}
      </Sheet>

      <ManualEntry open={manualOpen} onClose={() => setManualOpen(false)} onAdd={(e) => { addEntry({ ...e, source: 'manual' }); setManualOpen(false); }} />
      <RecompCalc open={recompOpen} onClose={() => setRecompOpen(false)} />
    </Screen>
  );
}

function Tot({ label, value, target }: { label: string; value: number; target: number }) {
  const over = value > target;
  return (
    <div>
      <p className={`font-mono font-bold ${over ? 'text-warn' : ''}`}>{value}</p>
      <p className="text-[10px] text-muted">/{target} {label}</p>
    </div>
  );
}

function ScanStat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg bg-surface-2 py-2">
      <p className="font-mono font-bold">{v}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function ManualEntry({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (e: { name: string; calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number }) => void }) {
  const [name, setName] = useState('');
  const [c, setC] = useState(0);
  const [p, setP] = useState(0);
  const [cb, setCb] = useState(0);
  const [f, setF] = useState(0);
  return (
    <Sheet open={open} onClose={onClose} title="Manual entry">
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Food name" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Num label="Calories" v={c} set={setC} />
          <Num label="Protein g" v={p} set={setP} />
          <Num label="Carbs g" v={cb} set={setCb} />
          <Num label="Fat g" v={f} set={setF} />
        </div>
        <Button className="w-full justify-center" disabled={!name} onClick={() => onAdd({ name, calories: c, proteinG: p, carbsG: cb, fatG: f, sugarG: 0 })}>Add</Button>
      </div>
    </Sheet>
  );
}

function Num({ label, v, set }: { label: string; v: number; set: (n: number) => void }) {
  return (
    <label className="text-xs text-muted">
      {label}
      <input type="number" value={v} onChange={(e) => set(Number(e.target.value))} className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm mt-1 text-text" />
    </label>
  );
}

function RecompCalc({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useUser((s) => s.profile);
  const weight = profile?.weightKg ?? 80;
  const [bf, setBf] = useState(profile?.bodyFatPct ?? 18);
  const [proteinPerKg, setProteinPerKg] = useState(2.0);
  const [trainAdj, setTrainAdj] = useState(15); // % calorie bump on training days

  const lbm = Math.round(weight * (1 - bf / 100) * 10) / 10;
  const proteinG = Math.round(weight * proteinPerKg);
  const base = profile?.tdee ?? 2400;
  const trainingCals = Math.round(base * (1 + trainAdj / 100));
  const restCals = Math.round(base * (1 - trainAdj / 100));

  return (
    <Sheet open={open} onClose={onClose} title="Recomp calculator">
      <div className="space-y-4">
        <Slider label={`Body fat: ${bf}%`} min={5} max={45} step={1} value={bf} onChange={setBf} />
        <Slider label={`Protein: ${proteinPerKg.toFixed(1)} g/kg`} min={1.4} max={2.8} step={0.1} value={proteinPerKg} onChange={setProteinPerKg} />
        <Slider label={`Calorie cycling: ±${trainAdj}%`} min={0} max={25} step={1} value={trainAdj} onChange={setTrainAdj} />
        <div className="grid grid-cols-3 gap-2 text-center">
          <RC label="LBM" v={`${lbm} kg`} />
          <RC label="Protein" v={`${proteinG} g`} />
          <RC label="Base" v={`${base}`} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-accent/15 py-3"><p className="text-xs text-muted">Training day</p><p className="font-mono font-bold">{trainingCals} kcal</p></div>
          <div className="rounded-xl bg-surface-2 py-3"><p className="text-xs text-muted">Rest day</p><p className="font-mono font-bold">{restCals} kcal</p></div>
        </div>
      </div>
    </Sheet>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-sm mb-1">{label}</p>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
    </div>
  );
}

function RC({ label, v }: { label: string; v: string }) {
  return <div className="rounded-xl bg-surface-2 py-3"><p className="text-xs text-muted">{label}</p><p className="font-mono font-bold">{v}</p></div>;
}
