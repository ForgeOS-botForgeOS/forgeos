import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Wand2, Trash2, Search, X, Dumbbell, Share2, Save, Play, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import { Card, Button, Sheet, Toggle } from '../components/ui';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { useSettings } from '../state/settingsStore';
import { EXERCISES, EXERCISE_CATEGORIES, exerciseById } from '../data/exercises';
import { PLAN_FOCI, type PlanFocus, exercisesForFocus, inferFocus } from './onboarding/planGenerator';
import { sharePlan } from '../lib/planShare';
import type { ExerciseTarget, PlannedDay } from '../types';
import { haptic } from '../lib/haptics';

export default function PlanEditor() {
  const navigate = useNavigate();
  const plan = useUser((s) => s.weekPlan);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const savedPlans = useUser((s) => s.savedPlans);
  const savePlanAs = useUser((s) => s.savePlanAs);
  const loadPlan = useUser((s) => s.loadPlan);
  const deletePlan = useUser((s) => s.deletePlan);
  const specialRequest = useUser((s) => s.profile?.specialRequest);
  const gym = useSettings((s) => s.gym);
  const startWorkout = useWorkout((s) => s.startWorkout);

  const [openDay, setOpenDay] = useState<string | null>(null);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  if (!plan) {
    return (
      <div className="px-4 pt-12 space-y-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
        <p className="text-muted">No plan yet — finish onboarding to generate one.</p>
      </div>
    );
  }

  function patch(day: string, p: Partial<PlannedDay>) {
    setWeekPlan({ ...plan!, days: plan!.days.map((d) => (d.day === day ? { ...d, ...p } : d)) });
  }
  function toggleRest(d: PlannedDay) {
    patch(d.day, d.rest ? { rest: false, label: d.label === 'Rest' ? 'Training' : d.label } : { rest: true, label: 'Rest', exerciseIds: [] });
    haptic('tap');
  }
  function addExercise(day: string, id: string) {
    const d = plan!.days.find((x) => x.day === day)!;
    if (d.exerciseIds.includes(id)) return;
    patch(day, { exerciseIds: [...d.exerciseIds, id] });
    haptic('tap');
  }
  function removeExercise(day: string, id: string) {
    const d = plan!.days.find((x) => x.day === day)!;
    const targets = { ...(d.targets ?? {}) };
    delete targets[id];
    patch(day, { exerciseIds: d.exerciseIds.filter((x) => x !== id), targets });
  }
  function move(day: string, id: string, dir: -1 | 1) {
    const d = plan!.days.find((x) => x.day === day)!;
    const ids = [...d.exerciseIds];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    patch(day, { exerciseIds: ids });
    haptic('tap');
  }
  function setTarget(day: string, id: string, t: ExerciseTarget) {
    const d = plan!.days.find((x) => x.day === day)!;
    patch(day, { targets: { ...(d.targets ?? {}), [id]: t } });
  }
  function autoFill(day: string, focus: PlanFocus) {
    patch(day, { exerciseIds: exercisesForFocus(focus, 6), rest: false });
    haptic('success');
  }
  function startDay(d: PlannedDay) {
    startWorkout(d.label, d.exerciseIds, { targets: d.targets, maxWeightKg: gym.maxWeightKg });
    haptic('success');
    navigate('/train');
  }
  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const trainingDays = plan.days.filter((d) => !d.rest).length;

  return (
    <div className="px-4 pt-12 pb-10 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Week plan</h1>
          <p className="text-sm text-muted">{trainingDays} training days · tap a day to edit</p>
        </div>
      </div>

      {/* Share / save / templates */}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={async () => { const r = await sharePlan(plan, 'My week'); flash(r === 'shared' ? 'Shared!' : 'Link copied to clipboard'); }}>
          <span className="flex items-center gap-1 text-xs"><Share2 size={14} /> Share</span>
        </Button>
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => { const n = prompt('Save this plan as…', 'My plan'); if (n) { savePlanAs(n); flash('Saved to templates'); } }}>
          <span className="flex items-center gap-1 text-xs"><Save size={14} /> Save</span>
        </Button>
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => setShowSaved(true)}>
          <span className="flex items-center gap-1 text-xs"><FolderOpen size={14} /> Templates ({savedPlans.length})</span>
        </Button>
      </div>

      {specialRequest && (
        <Card className="bg-surface-2 text-xs text-muted">📝 Your note: <span className="text-text">{specialRequest}</span></Card>
      )}

      <div className="space-y-2">
        {plan.days.map((d) => {
          const expanded = openDay === d.day;
          return (
            <Card key={d.day} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs w-7 text-muted">{d.day}</span>
                <input
                  value={d.label}
                  onChange={(e) => patch(d.day, { label: e.target.value })}
                  disabled={d.rest}
                  placeholder="Name this day"
                  className="flex-1 bg-transparent text-sm font-semibold outline-none disabled:text-muted"
                />
                <span className="text-[11px] text-muted">{d.rest ? 'Rest' : `${d.exerciseIds.length} ex`}</span>
                <Toggle checked={!d.rest} onChange={() => toggleRest(d)} />
              </div>

              {!d.rest && (
                <>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setOpenDay(expanded ? null : d.day)} className="text-[11px] text-accent-2">
                      {expanded ? 'Hide exercises' : 'Edit exercises'}
                    </button>
                    {d.exerciseIds.length > 0 && (
                      <button onClick={() => startDay(d)} className="text-[11px] text-accent flex items-center gap-1"><Play size={11} /> Start this day</button>
                    )}
                  </div>

                  {expanded && (
                    <div className="space-y-2 pt-1">
                      <div className="rounded-xl bg-surface-2 p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted flex items-center gap-1"><Wand2 size={12} /> Build a full workout</span>
                          <button onClick={() => autoFill(d.day, inferFocus(d.label))} className="text-[11px] text-accent">from name → {inferFocus(d.label)}</button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {PLAN_FOCI.map((f) => (
                            <button key={f} onClick={() => autoFill(d.day, f)} className="rounded-full bg-surface px-2 py-1 text-[11px]">{f}</button>
                          ))}
                        </div>
                      </div>

                      {d.exerciseIds.length === 0 && <p className="text-xs text-muted">No exercises — add some or build a full workout above.</p>}
                      {d.exerciseIds.map((id, i) => {
                        const ex = exerciseById(id);
                        const tgt = d.targets?.[id] ?? { sets: 3, reps: 8 };
                        return (
                          <div key={id} className="rounded-lg bg-surface-2 px-3 py-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Dumbbell size={13} className="text-muted shrink-0" />
                              <span className="text-sm flex-1">{ex?.name ?? id}</span>
                              <button onClick={() => move(d.day, id, -1)} disabled={i === 0} className="text-muted disabled:opacity-30"><ChevronUp size={15} /></button>
                              <button onClick={() => move(d.day, id, 1)} disabled={i === d.exerciseIds.length - 1} className="text-muted disabled:opacity-30"><ChevronDown size={15} /></button>
                              <button onClick={() => removeExercise(d.day, id)} className="text-danger"><Trash2 size={14} /></button>
                            </div>
                            <div className="flex items-center gap-3 pl-5">
                              <Stepper label="sets" value={tgt.sets} min={1} max={10} onChange={(v) => setTarget(d.day, id, { ...tgt, sets: v })} />
                              <Stepper label="reps" value={tgt.reps} min={1} max={30} onChange={(v) => setTarget(d.day, id, { ...tgt, reps: v })} />
                            </div>
                          </div>
                        );
                      })}

                      <Button variant="ghost" className="w-full justify-center py-2" onClick={() => setPickerDay(d.day)}>
                        <span className="flex items-center gap-1 text-xs"><Plus size={14} /> Add exercise</span>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-muted/70">Changes save automatically. Seeded weights respect your gym max ({gym.maxWeightKg} kg).</p>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[80] rounded-full bg-surface-2 border border-line px-4 py-2 text-sm shadow-glow">{toast}</div>
      )}

      <ExercisePickerSheet open={!!pickerDay} onClose={() => setPickerDay(null)} onPick={(id) => { if (pickerDay) addExercise(pickerDay, id); }} />

      {/* Saved templates */}
      <Sheet open={showSaved} onClose={() => setShowSaved(false)} title="Saved plans">
        <div className="space-y-2">
          {savedPlans.length === 0 && <p className="text-sm text-muted">No saved plans yet. Tap “Save” to store the current one.</p>}
          {savedPlans.map((sp) => (
            <Card key={sp.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{sp.name}</p>
                <p className="text-[11px] text-muted">{sp.plan.days.filter((d) => !d.rest).length} days · {new Date(sp.savedAt).toLocaleDateString()}</p>
              </div>
              <Button className="py-1.5" onClick={() => { loadPlan(sp.id); setShowSaved(false); flash(`Loaded “${sp.name}”`); }}>Load</Button>
              <button onClick={() => deletePlan(sp.id)} className="text-danger"><Trash2 size={15} /></button>
            </Card>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="w-6 h-6 rounded bg-surface text-muted text-sm">−</button>
      <span className="text-xs font-mono w-12 text-center">{value} {label}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="w-6 h-6 rounded bg-surface text-muted text-sm">+</button>
    </div>
  );
}

function ExercisePickerSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const list = EXERCISES.filter(
    (e) => (cat === 'All' || e.category === cat) && (e.name.toLowerCase().includes(q.toLowerCase()) || e.primary.toLowerCase().includes(q.toLowerCase())),
  ).slice(0, 60);

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" className="bg-transparent text-sm flex-1 outline-none" />
          {q && <button onClick={() => setQ('')}><X size={14} className="text-muted" /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" data-noswipe>
          {['All', ...EXERCISE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${cat === c ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{c}</button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
          {list.map((e) => (
            <button key={e.id} onClick={() => { onPick(e.id); haptic('tap'); }} className="w-full text-left rounded-xl bg-surface-2 px-4 py-2.5">
              <p className="text-sm font-medium">{e.name}</p>
              <p className="text-xs text-muted">{e.primary} · {e.category}</p>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
