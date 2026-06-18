import { useMemo, useRef, useState } from 'react';
import { Camera, Trash2, Sparkles, Calculator, ChefHat, Clock, Star, Check, Barcode } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button, Sheet, Badge, SectionTitle, Pill } from '../components/ui';
import { useNutrition } from '../state/nutritionStore';
import { useUser } from '../state/userStore';
import { scanMeal, visionIsLive, estimateMock } from '../lib/vision';
import { RECIPES, MEAL_TYPES, type Recipe, type MealType } from '../data/recipes';
import { RECIPES_SK, MEAL_TYPE_SK } from '../data/recipes.sk';
import { useSettings } from '../state/settingsStore';
import { useT } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { BarcodeScanner } from '../components/BarcodeScanner';
import type { ScanResult, FoodItem } from '../types';

export default function Nutrition() {
  const t = useT();
  const profile = useUser((s) => s.profile);
  // Subscribe to raw state so the component re-renders the instant it changes.
  // (The old code selected the getter *function* — a stable ref — so taps only
  // showed on the next unrelated render, which felt laggy. We derive today's
  // values with useMemo to keep selectors returning cached references.)
  const rawLog = useNutrition((s) => s.log);
  const addEntry = useNutrition((s) => s.addEntry);
  const removeEntry = useNutrition((s) => s.removeEntry);
  const water = useNutrition((s) => s.todaysWaterMl());
  const today = new Date().toISOString().slice(0, 10);
  const log = useMemo(() => rawLog.filter((e) => e.date.slice(0, 10) === today), [rawLog, today]);
  const totals = useMemo(
    () => log.reduce(
      (a, e) => ({ calories: a.calories + e.calories, proteinG: a.proteinG + e.proteinG, carbsG: a.carbsG + e.carbsG, fatG: a.fatG + e.fatG, sugarG: a.sugarG + e.sugarG }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 },
    ),
    [log],
  );
  const addWater = useNutrition((s) => s.addWater);
  const savedMeals = useNutrition((s) => s.savedMeals);
  const saveMeal = useNutrition((s) => s.saveMeal);
  const waterGoal = 3000;
  const fileRef = useRef<HTMLInputElement>(null);

  const learn = useNutrition((s) => s.learn);
  const getLearned = useNutrition((s) => s.getLearned);

  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<FoodItem[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [recompOpen, setRecompOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  const macros = profile?.macros ?? { calories: 2200, proteinG: 160, carbsG: 220, fatG: 60 };

  function openItems(r: ScanResult) {
    let learnedCount = 0;
    // Apply learned corrections to any item the user has fixed before.
    const list = (r.items ?? [r]).map((it) => {
      const l = getLearned(it.name);
      if (l) { learnedCount++; return { name: it.name, calories: l.calories, proteinG: l.proteinG, carbsG: l.carbsG, fatG: l.fatG, sugarG: l.sugarG }; }
      return { name: it.name, calories: it.calories, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, sugarG: it.sugarG };
    });
    setItems(list);
    setSelected(new Set(list.map((_, i) => i)));
    if (learnedCount) setScanNote(`Auto-corrected ${learnedCount} item(s) from your past edits.`);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanNote(null);
    try {
      openItems(await scanMeal(file));
      haptic('success');
    } catch (err) {
      openItems(estimateMock(file));
      setScanNote(err instanceof Error ? `${err.message} Showing an estimate instead.` : 'AI unavailable — showing an estimate.');
      haptic('warning');
    } finally {
      setScanning(false);
      e.target.value = '';
    }
  }

  function patchItem(idx: number, p: Partial<FoodItem>) {
    setItems((cur) => (cur ? cur.map((it, i) => (i === idx ? { ...it, ...p } : it)) : cur));
  }
  // Scale a whole portion up/down — every macro moves together, so dialing in
  // the real amount stays consistent (the practical path to an accurate log).
  function scaleItem(idx: number, mult: number) {
    setItems((cur) => (cur ? cur.map((it, i) => (i === idx ? {
      ...it,
      calories: Math.round(it.calories * mult),
      proteinG: Math.round(it.proteinG * mult),
      carbsG: Math.round(it.carbsG * mult),
      fatG: Math.round(it.fatG * mult),
      sugarG: Math.round(it.sugarG * mult),
    } : it)) : cur));
    haptic('tap');
  }
  function addSelected() {
    if (!items) return;
    items.forEach((it, i) => {
      if (!selected.has(i)) return;
      addEntry({ name: it.name, calories: it.calories, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, sugarG: it.sugarG, source: 'scan' });
      learn(it); // remember the (possibly corrected) values for next time
    });
    haptic('success');
    setItems(null);
  }

  const goalText: Record<string, string> = {
    lose: 'Lean toward high-volume, high-protein meals to stay full in a deficit.',
    gain: 'Add calorie-dense carbs and a shake to hit your surplus.',
    recomp: 'Cycle carbs higher on training days, protein steady at 2.2 g/kg.',
    maintain: 'Keep portions consistent; protein anchors every meal.',
    strength: 'Fuel hard sessions with carbs pre/post; protein 2.0 g/kg.',
  };

  return (
    <Screen title={t('nut.title')} subtitle={`${profile?.goal ?? 'recomp'} · ${macros.calories} kcal`}>
      {/* No `capture` attribute → the native picker offers Camera *and* Photo Library. */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

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
        <Button variant="ghost" className="w-full justify-center" onClick={() => setBarcodeOpen(true)}>
          <span className="flex items-center gap-2"><Barcode size={16} /> Scan a barcode (exact macros)</span>
        </Button>
        <p className="text-[11px] text-muted/70">Barcode = exact macros (Open Food Facts). Photo = AI estimate you can edit.</p>
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

      {/* Water tracker */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionTitle>💧 Water</SectionTitle>
          <span className="font-mono text-sm">{(water / 1000).toFixed(2)} / {(waterGoal / 1000).toFixed(1)} L</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-accent-2 rounded-full transition-all" style={{ width: `${Math.min(100, (water / waterGoal) * 100)}%` }} /></div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 justify-center py-1.5" onClick={() => { const hit = water < waterGoal && water + 250 >= waterGoal; addWater(250); if (hit) { celebrate(); toast('Hydration goal hit 💧'); } else haptic('tap'); }}>+250 ml</Button>
          <Button variant="ghost" className="flex-1 justify-center py-1.5" onClick={() => { const hit = water < waterGoal && water + 500 >= waterGoal; addWater(500); if (hit) { celebrate(); toast('Hydration goal hit 💧'); } else haptic('tap'); }}>+500 ml</Button>
          <Button variant="ghost" className="justify-center py-1.5" onClick={() => addWater(-250)}>−</Button>
        </div>
      </Card>

      <Card className="flex gap-3 items-start bg-surface-2">
        <Sparkles size={16} className="text-accent-2 mt-0.5 shrink-0" />
        <p className="text-sm">{goalText[profile?.goal ?? 'recomp']}</p>
      </Card>

      {/* Saved meals quick-add */}
      {savedMeals.length > 0 && (
        <div>
          <SectionTitle>Quick add</SectionTitle>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-noswipe>
            {savedMeals.map((m) => (
              <button key={m.id} onClick={() => { addEntry({ name: m.name, calories: m.calories, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG, sugarG: m.sugarG, source: 'manual' }); haptic('success'); toast(`Added ${m.name} · ${m.calories} kcal`); }} className="shrink-0 rounded-xl bg-surface-2 px-3 py-2 text-left">
                <p className="text-xs font-medium">{m.name}</p>
                <p className="text-[10px] text-muted">{m.calories} kcal · P{m.proteinG}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button variant="ghost" className="w-full justify-center" onClick={() => setRecipesOpen(true)}>
        <span className="flex items-center gap-2"><ChefHat size={16} /> Recipe library ({RECIPES.length}) — goal-aligned</span>
      </Button>

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
                <div className="flex items-center gap-3">
                  <button onClick={() => { saveMeal({ name: f.name, calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, sugarG: f.sugarG }); haptic('success'); toast(`Saved ${f.name} for quick-add ⭐`); }} title="Save for quick-add" className="text-muted"><Star size={15} /></button>
                  <button onClick={() => removeEntry(f.id)} className="text-muted"><Trash2 size={16} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Scan review — per-item, editable, toggleable, learns your edits */}
      <Sheet open={!!items} onClose={() => setItems(null)} title="Review scan">
        {items && (
          <div className="space-y-3">
            {scanNote && <p className="text-xs text-accent-2 bg-accent-2/10 rounded-lg px-3 py-2">{scanNote}</p>}
            <p className="text-[11px] text-muted">Tick the items to log and tweak anything — your edits are remembered for next time.</p>
            <div className="space-y-2 max-h-[52vh] overflow-y-auto no-scrollbar">
              {items.map((it, idx) => {
                const on = selected.has(idx);
                return (
                  <div key={idx} className={`rounded-xl border p-3 space-y-2 ${on ? 'border-accent/50 bg-surface-2' : 'border-line opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected((s) => { const n = new Set(s); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; })} className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${on ? 'bg-accent border-accent text-black' : 'border-line'}`}>{on && <Check size={13} strokeWidth={3} />}</button>
                      <input value={it.name} onChange={(e) => patchItem(idx, { name: e.target.value })} className="flex-1 bg-transparent text-sm font-semibold outline-none" />
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      <MiniNum label="kcal" v={it.calories} onChange={(v) => patchItem(idx, { calories: v })} />
                      <MiniNum label="P" v={it.proteinG} onChange={(v) => patchItem(idx, { proteinG: v })} />
                      <MiniNum label="C" v={it.carbsG} onChange={(v) => patchItem(idx, { carbsG: v })} />
                      <MiniNum label="F" v={it.fatG} onChange={(v) => patchItem(idx, { fatG: v })} />
                      <MiniNum label="sug" v={it.sugarG} onChange={(v) => patchItem(idx, { sugarG: v })} />
                    </div>
                    {on && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted">Portion</span>
                        <div className="flex gap-1">
                          <button onClick={() => scaleItem(idx, 0.9)} className="rounded-md bg-surface px-2 py-1 text-[11px] font-medium">−10%</button>
                          <button onClick={() => scaleItem(idx, 0.5)} className="rounded-md bg-surface px-2 py-1 text-[11px] font-medium">½×</button>
                          <button onClick={() => scaleItem(idx, 2)} className="rounded-md bg-surface px-2 py-1 text-[11px] font-medium">2×</button>
                          <button onClick={() => scaleItem(idx, 1.1)} className="rounded-md bg-surface px-2 py-1 text-[11px] font-medium">+10%</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted text-center">Selected total: {items.filter((_, i) => selected.has(i)).reduce((a, b) => a + b.calories, 0)} kcal</p>
            <Button className="w-full justify-center" disabled={selected.size === 0} onClick={addSelected}>Add {selected.size} item{selected.size === 1 ? '' : 's'} to log</Button>
          </div>
        )}
      </Sheet>

      <BarcodeScanner open={barcodeOpen} onClose={() => setBarcodeOpen(false)} onAdd={(it) => { addEntry({ ...it, source: 'scan' }); learn(it); }} />
      <ManualEntry open={manualOpen} onClose={() => setManualOpen(false)} onAdd={(e) => { addEntry({ ...e, source: 'manual' }); setManualOpen(false); }} />
      <RecompCalc open={recompOpen} onClose={() => setRecompOpen(false)} />
      <RecipeBrowser
        open={recipesOpen}
        onClose={() => setRecipesOpen(false)}
        userGoal={profile?.goal ?? 'recomp'}
        onAdd={(rec) => {
          addEntry({ name: rec.name, calories: rec.kcal, proteinG: rec.protein, carbsG: rec.carbs, fatG: rec.fat, sugarG: 0, source: 'manual' });
          haptic('success');
          setRecipesOpen(false);
        }}
      />
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

function MiniNum({ label, v, onChange }: { label: string; v: number; onChange: (v: number) => void }) {
  return (
    <label className="text-center">
      <input
        type="number"
        value={v}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full rounded-md bg-surface border border-line px-1 py-1 text-xs text-center font-mono text-text"
      />
      <span className="text-[9px] text-muted">{label}</span>
    </label>
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

function RecipeBrowser({
  open,
  onClose,
  userGoal,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  userGoal: string;
  onAdd: (r: Recipe) => void;
}) {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const [meal, setMeal] = useState<MealType | 'All'>('All');
  const [onlyGoal, setOnlyGoal] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  // Merge Slovak translation over the recipe when in SK mode.
  const loc = (r: Recipe): Recipe => (lang === 'sk' && RECIPES_SK[r.id] ? { ...r, ...RECIPES_SK[r.id] } : r);
  const mealLabel = (m: string) => (lang === 'sk' ? MEAL_TYPE_SK[m] ?? m : m);

  const list = RECIPES.filter(
    (r) => (meal === 'All' || r.meal === meal) && (!onlyGoal || r.goals.includes(userGoal as Recipe['goals'][number])),
  ).map(loc);

  return (
    <Sheet open={open} onClose={onClose} title={t('nut.recipes')}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{list.length} {lang === 'sk' ? 'receptov' : 'recipes'}</p>
          <button onClick={() => setOnlyGoal((v) => !v)} className={`text-[11px] rounded-full px-2 py-1 ${onlyGoal ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>
            {onlyGoal ? `matched to: ${userGoal}` : 'showing all goals'}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(['All', ...MEAL_TYPES] as const).map((m) => (
            <Pill key={m} active={meal === m} onClick={() => setMeal(m)}>{m === 'All' ? (lang === 'sk' ? 'Všetky' : 'All') : mealLabel(m)}</Pill>
          ))}
        </div>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar">
          {list.map((r) => {
            const expanded = openId === r.id;
            return (
              <div key={r.id} className="rounded-xl bg-surface-2 p-3">
                <button className="w-full text-left" onClick={() => setOpenId(expanded ? null : r.id)}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{r.name}</p>
                    <Badge color="rgb(var(--accent-2))">{mealLabel(r.meal)}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-1 flex items-center gap-2">
                    <span className="font-mono">{r.kcal} kcal</span> · P{r.protein} C{r.carbs} F{r.fat}
                    <span className="flex items-center gap-0.5"><Clock size={11} /> {r.minutes}m</span>
                  </p>
                </button>
                {expanded && (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {r.goals.map((g) => <Badge key={g}>{g}</Badge>)}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Ingredients</p>
                      <p className="text-xs">{r.ingredients.join(' · ')}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Method</p>
                      <p className="text-xs">{r.steps}</p>
                    </div>
                    <Button className="w-full justify-center py-2" onClick={() => onAdd(r)}>Add to today’s log</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
