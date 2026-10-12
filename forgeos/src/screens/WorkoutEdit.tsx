import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Search, X } from 'lucide-react';
import { Card, Button, Sheet } from '../components/ui';
import { useWorkout } from '../state/workoutStore';
import { useSettings } from '../state/settingsStore';
import { EXERCISES, EXERCISE_CATEGORIES, exerciseById } from '../data/exercises';
import type { Workout, WorkoutExercise, SetEntry } from '../types';
import { haptic } from '../lib/haptics';
import { askConfirm } from '../lib/dialog';
import { toast } from '../lib/toast';
import { loadDraft, saveDraft, clearDraft, isDirty } from '../lib/workoutDraft';
import { GRIP_POSITIONS, GRIP_LABEL, coerceGrip } from '../lib/grip';

const uid = () => Math.random().toString(36).slice(2, 10);

export default function WorkoutEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const original = useWorkout((s) => s.history.find((w) => w.id === id));
  const updateHistoryWorkout = useWorkout((s) => s.updateHistoryWorkout);
  const deleteHistoryWorkout = useWorkout((s) => s.deleteHistoryWorkout);
  const addManualWorkout = useWorkout((s) => s.addManualWorkout);

  // What "no changes" looks like, fixed for the life of the screen.
  const [baseline] = useState<Workout | null>(() =>
    isNew
      ? { id: uid(), name: 'New workout', date: new Date().toISOString(), exercises: [], completed: true, totalVolumeKg: 0 }
      : original ? structuredClone(original) : null);
  // Unsaved edits from an earlier visit (Back, another tab, the app closed).
  const draftKey = isNew ? 'new' : (id ?? '');
  const [restored] = useState<Workout | null>(() => {
    const d = loadDraft(draftKey);
    return d && (isNew || d.id === original?.id) ? d : null;
  });
  const [draft, setDraft] = useState<Workout | null>(() => restored ?? baseline);
  const [showRestored, setShowRestored] = useState(!!restored);
  const [pickerOpen, setPickerOpen] = useState(false);
  const dirty = !!draft && isDirty(draft, baseline);

  // Every edit lands on the device straight away, so leaving the screen keeps it.
  useEffect(() => {
    if (!draft) return;
    if (isDirty(draft, baseline)) saveDraft(draftKey, draft);
    else clearDraft(draftKey);
  }, [draft, baseline, draftKey]);

  if (!draft) {
    return (
      <div className="px-4 pt-12 space-y-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
        <p className="text-muted">Workout not found.</p>
      </div>
    );
  }

  const patchSet = (weId: string, setId: string, p: Partial<SetEntry>) =>
    setDraft({ ...draft, exercises: draft.exercises.map((we) => (we.id !== weId ? we : { ...we, sets: we.sets.map((s) => (s.id === setId ? { ...s, ...p } : s)) })) });
  const addSet = (weId: string) =>
    setDraft({ ...draft, exercises: draft.exercises.map((we) => { if (we.id !== weId) return we; const last = we.sets[we.sets.length - 1]; return { ...we, sets: [...we.sets, { id: uid(), weightKg: last?.weightKg ?? 20, reps: last?.reps ?? 8, completed: true, rpe: last?.rpe ?? 7, subKind: last?.grip ? 'grip' : undefined, grip: last?.grip }] }; }) });
  const removeSet = (weId: string, setId: string) =>
    setDraft({ ...draft, exercises: draft.exercises.map((we) => (we.id !== weId ? we : { ...we, sets: we.sets.filter((s) => s.id !== setId) })) });
  const removeExercise = (weId: string) => setDraft({ ...draft, exercises: draft.exercises.filter((we) => we.id !== weId) });
  const addExercise = (exId: string) => {
    // Pre-fill from the last time you did this exercise (same toggle as Train).
    const prev = useSettings.getState().prefillWeights ? useWorkout.getState().lastPerformance(exId) : undefined;
    const sets: SetEntry[] = prev?.length
      ? prev.map((p) => ({ id: uid(), weightKg: p.weightKg, reps: p.reps, completed: true, rpe: p.rpe ?? 7 }))
      : [{ id: uid(), weightKg: 20, reps: 8, completed: true, rpe: 7 }];
    const we: WorkoutExercise = { id: uid(), exerciseId: exId, sets, restPresetSec: 90 };
    setDraft({ ...draft, exercises: [...draft.exercises, we] });
  };

  function leave() {
    if (dirty) toast(isNew ? 'Draft kept: finish it any time from History' : 'Unsaved changes kept for next time');
    navigate(-1);
  }
  function startOver() {
    clearDraft(draftKey);
    setDraft(baseline);
    setShowRestored(false);
    haptic('tap');
  }
  function save() {
    clearDraft(draftKey);
    if (isNew) addManualWorkout(draft!);
    else updateHistoryWorkout(draft!.id, draft!);
    haptic('success');
    navigate(-1);
  }
  async function del() {
    const ok = await askConfirm({
      title: 'Delete this workout?',
      body: 'The session, its sets and its volume are removed for good. Records it set stay in your PR Hall.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (ok) { clearDraft(draftKey); deleteHistoryWorkout(draft!.id); navigate(-1); }
  }

  return (
    <div className="px-4 pt-12 pb-10 space-y-4">
      <button onClick={leave} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>

      {showRestored && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs">
          <span className="flex-1 text-muted">Picked up where you left off. Nothing is saved to History until you tap Save.</span>
          <button onClick={startOver} className="shrink-0 rounded-md bg-surface-2 px-2 py-1 text-muted">Start over</button>
        </div>
      )}

      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-full bg-transparent text-2xl font-extrabold outline-none" />
      <input type="date" value={draft.date.slice(0, 10)} onChange={(e) => setDraft({ ...draft, date: new Date(e.target.value).toISOString() })} className="rounded-lg bg-surface-2 border border-line px-3 py-1.5 text-sm" />

      {draft.exercises.map((we) => (
        <Card key={we.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{exerciseById(we.exerciseId)?.name ?? 'Exercise'}</p>
            <button onClick={() => removeExercise(we.id)} className="text-danger"><Trash2 size={15} /></button>
          </div>
          {we.sets.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-wrap">
              <span className="w-5 text-xs text-muted">{i + 1}</span>
              <Num value={s.weightKg} step={2.5} unit="kg" onChange={(v) => patchSet(we.id, s.id, { weightKg: Math.max(0, v) })} />
              <Num value={s.reps} step={1} unit="rep" onChange={(v) => patchSet(we.id, s.id, { reps: Math.max(0, v) })} />
              <select
                value={s.grip ?? ''}
                aria-label={`Grip for set ${i + 1}`}
                onChange={(e) => { const g = coerceGrip(e.target.value); patchSet(we.id, s.id, { grip: g, subKind: g ? 'grip' : 'none' }); }}
                className="rounded-md bg-surface-2 px-1.5 py-1 text-[11px] text-muted max-w-[6.5rem]"
              >
                <option value="">grip</option>
                {GRIP_POSITIONS.map((g) => <option key={g} value={g}>{GRIP_LABEL[g]}</option>)}
              </select>
              <button onClick={() => removeSet(we.id, s.id)} className="text-muted ml-auto"><X size={15} /></button>
            </div>
          ))}
          <Button variant="ghost" className="w-full justify-center py-1.5" onClick={() => addSet(we.id)}><span className="flex items-center gap-1 text-xs"><Plus size={13} /> Set</span></Button>
        </Card>
      ))}

      <Button variant="ghost" className="w-full justify-center" onClick={() => setPickerOpen(true)}><span className="flex items-center gap-1"><Plus size={16} /> Add exercise</span></Button>

      <div className="flex gap-2">
        {!isNew && <Button variant="outline" className="flex-1 justify-center text-danger" onClick={del}>Delete</Button>}
        <Button className="flex-1 justify-center" onClick={save}>{isNew ? 'Save workout' : 'Save changes'}</Button>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add exercise">
        <ExercisePicker onPick={(id2) => { addExercise(id2); setPickerOpen(false); }} />
      </Sheet>
    </div>
  );
}

function Num({ value, step, unit, onChange }: { value: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(value - step)} className="w-7 h-7 rounded-md bg-surface-2 text-muted">−</button>
      <span className="font-mono text-sm w-14 text-center">{value} {unit}</span>
      <button onClick={() => onChange(value + step)} className="w-7 h-7 rounded-md bg-surface-2 text-muted">+</button>
    </div>
  );
}

function ExercisePicker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const list = EXERCISES.filter((e) => (cat === 'All' || e.category === cat) && e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5"><Search size={16} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="bg-transparent text-sm flex-1 outline-none" /></div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" data-noswipe>
        {['All', ...EXERCISE_CATEGORIES].map((c) => <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${cat === c ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{c}</button>)}
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
        {list.map((e) => <button key={e.id} onClick={() => { onPick(e.id); haptic('tap'); }} className="w-full text-left rounded-xl bg-surface-2 px-4 py-2.5"><p className="text-sm font-medium">{e.name}</p><p className="text-xs text-muted">{e.primary} · {e.category}</p></button>)}
      </div>
    </div>
  );
}
