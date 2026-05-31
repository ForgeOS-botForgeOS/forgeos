import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Wand2, Trash2, Search, X, Dumbbell } from 'lucide-react';
import { Card, Button, Sheet, Badge, Toggle } from '../components/ui';
import { useUser } from '../state/userStore';
import { EXERCISES, EXERCISE_CATEGORIES, exerciseById } from '../data/exercises';
import { PLAN_FOCI, type PlanFocus, exercisesForFocus, inferFocus } from './onboarding/planGenerator';
import type { PlannedDay, WeekPlan } from '../types';
import { haptic } from '../lib/haptics';

export default function PlanEditor() {
  const navigate = useNavigate();
  const plan = useUser((s) => s.weekPlan);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [pickerDay, setPickerDay] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="px-4 pt-12 space-y-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
        <p className="text-muted">No plan yet — finish onboarding to generate one.</p>
      </div>
    );
  }

  function patch(day: string, p: Partial<PlannedDay>) {
    const next: WeekPlan = { ...plan!, days: plan!.days.map((d) => (d.day === day ? { ...d, ...p } : d)) };
    setWeekPlan(next);
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
    patch(day, { exerciseIds: d.exerciseIds.filter((x) => x !== id) });
    haptic('tap');
  }
  function autoFill(day: string, focus: PlanFocus) {
    patch(day, { exerciseIds: exercisesForFocus(focus, 6), rest: false });
    haptic('success');
  }

  const trainingDays = plan.days.filter((d) => !d.rest).length;

  return (
    <div className="px-4 pt-12 pb-10 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div>
        <h1 className="text-2xl font-extrabold">Week plan</h1>
        <p className="text-sm text-muted">{trainingDays} training days · tap a day to edit</p>
      </div>

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
                  <button onClick={() => setOpenDay(expanded ? null : d.day)} className="text-[11px] text-accent-2">
                    {expanded ? 'Hide exercises' : 'Edit exercises'}
                  </button>

                  {expanded && (
                    <div className="space-y-2 pt-1">
                      {/* Build a full workout */}
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

                      {/* Exercise list */}
                      {d.exerciseIds.length === 0 && <p className="text-xs text-muted">No exercises — add some or build a full workout above.</p>}
                      {d.exerciseIds.map((id) => {
                        const ex = exerciseById(id);
                        return (
                          <div key={id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                            <Dumbbell size={13} className="text-muted shrink-0" />
                            <span className="text-sm flex-1">{ex?.name ?? id}</span>
                            {ex && <Badge color="rgb(var(--muted))">{ex.primary}</Badge>}
                            <button onClick={() => removeExercise(d.day, id)} className="text-danger"><Trash2 size={14} /></button>
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

      <p className="text-[11px] text-muted/70">Changes save automatically. Start any day’s workout from the Train tab.</p>

      <ExercisePickerSheet
        open={!!pickerDay}
        onClose={() => setPickerDay(null)}
        onPick={(id) => { if (pickerDay) addExercise(pickerDay, id); }}
      />
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
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
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
