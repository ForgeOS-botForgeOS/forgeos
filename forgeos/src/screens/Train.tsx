import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, Wrench, Link2, Repeat, AlertTriangle, Brain, Flag, History, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { Screen } from '../components/Screen';
import { Card, Button, Sheet, Badge, SectionTitle } from '../components/ui';
import { SetRow } from '../components/train/SetRow';
import { RestTimer } from '../components/train/RestTimer';
import { Tools } from '../components/train/Tools';
import { Confetti } from '../components/Celebrate';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { EXERCISES, exerciseById, substitutesFor, EXERCISE_CATEGORIES } from '../data/exercises';
import { detectPlateaus, recommendBlock } from '../lib/analytics';
import { overloadSuggestion, volumeOf } from '../lib/fitness';
import { xpForSet } from '../data/ranks';
import { haptic } from '../lib/haptics';
import type { SetEntry } from '../types';

export default function Train() {
  const active = useWorkout((s) => s.active);
  const history = useWorkout((s) => s.history);
  const weekPlan = useUser((s) => s.weekPlan);
  const startWorkout = useWorkout((s) => s.startWorkout);

  const [toolsOpen, setToolsOpen] = useState(false);
  const navigate = useNavigate();

  const plateaus = useMemo(() => detectPlateaus(history), [history]);
  const rec = useMemo(() => recommendBlock(history), [history]);

  const todayPlan = useMemo(() => {
    if (!weekPlan) return null;
    const map = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const today = map[new Date().getDay()];
    return weekPlan.days.find((d) => d.day === today) ?? null;
  }, [weekPlan]);

  if (active) return <ActiveSession onOpenTools={() => setToolsOpen(true)} toolsOpen={toolsOpen} onCloseTools={() => setToolsOpen(false)} />;

  return (
    <Screen title="Train" subtitle="Log it, beat last week.">
      {/* Today's plan */}
      <Card>
        <SectionTitle>Today’s session</SectionTitle>
        {todayPlan && !todayPlan.rest ? (
          <>
            <p className="font-semibold text-lg">{todayPlan.label}</p>
            <p className="text-sm text-muted mt-1">{todayPlan.exerciseIds.map((id) => exerciseById(id)?.name).filter(Boolean).slice(0, 4).join(' · ')}…</p>
            <Button className="w-full justify-center mt-3" onClick={() => { startWorkout(todayPlan.label, todayPlan.exerciseIds); haptic('success'); }}>
              <span className="flex items-center gap-2"><Dumbbell size={16} /> Start {todayPlan.label}</span>
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted text-sm">{todayPlan?.rest ? 'Planned rest day — but you can still train.' : 'No plan for today.'}</p>
            <Button variant="outline" className="w-full justify-center mt-3" onClick={() => { startWorkout('Freestyle session'); haptic('success'); }}>
              Start an empty workout
            </Button>
          </>
        )}
      </Card>

      {/* Adaptive periodisation */}
      <Card className="flex gap-3 items-start">
        <Brain size={18} className="text-accent-2 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Periodisation engine</p>
          <p className="text-sm mt-1">Next block: <b className="capitalize">{rec.nextBlock}</b></p>
          <p className="text-xs text-muted mt-1">{rec.reason}</p>
          <p className="text-[11px] text-muted/70 mt-1">avg RPE {rec.avgRpe || '—'} · ~{rec.weeklyVolume.toLocaleString()} kg/wk</p>
        </div>
      </Card>

      {/* Plateau breaker */}
      {plateaus.length > 0 && (
        <div>
          <SectionTitle>Plateau breaker</SectionTitle>
          {plateaus.map((p) => (
            <Card key={p.exerciseId} className="flex gap-3 items-start border-warn/40">
              <AlertTriangle size={18} className="text-warn mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">{p.exerciseName} — stuck {p.weeksStuck} weeks</p>
                <p className="text-xs text-muted mt-1">{p.suggestion}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => setToolsOpen(true)}>
          <span className="flex items-center gap-2"><Wrench size={16} /> Tools</span>
        </Button>
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => navigate('/history')}>
          <span className="flex items-center gap-2"><History size={16} /> History</span>
        </Button>
      </div>

      <Sheet open={toolsOpen} onClose={() => setToolsOpen(false)} title="Lifting tools">
        <Tools />
      </Sheet>
    </Screen>
  );
}

function ActiveSession({ onOpenTools, toolsOpen, onCloseTools }: { onOpenTools: () => void; toolsOpen: boolean; onCloseTools: () => void }) {
  const active = useWorkout((s) => s.active)!;
  const { addExercise, removeExercise, swapExercise, addSet, updateSet, removeSet, completeSet, finishWorkout, discardWorkout, linkSuperset, reorderExercises, lastSetFor } = useWorkout();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active: a2, over } = e;
    if (!over || a2.id === over.id) return;
    const ids = active.exercises.map((x) => x.id);
    const next = arrayMove(ids, ids.indexOf(String(a2.id)), ids.indexOf(String(over.id)));
    reorderExercises(next);
    haptic('tap');
  }
  const bodyweight = useUser((s) => s.profile?.weightKg ?? 80);
  const addXp = useGami((s) => s.addXp);
  const registerSession = useGami((s) => s.registerSession);
  const bumpMetric = useGami((s) => s.bumpMetric);
  const navigate = useNavigate();

  const [restOpen, setRestOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subFor, setSubFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ weId: string; setId: string } | null>(null);
  const [linkMode, setLinkMode] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);

  const totalVolume = active.exercises.reduce(
    (sum, we) => sum + we.sets.filter((s) => s.completed).reduce((a, s) => a + volumeOf(s.weightKg, s.reps), 0),
    0,
  );
  const completedSets = active.exercises.reduce((a, we) => a + we.sets.filter((s) => s.completed).length, 0);

  function handleComplete(weId: string, set: SetEntry) {
    if (set.completed) return;
    completeSet(weId, set.id);
    addXp(xpForSet(set.weightKg, set.reps, set.rpe ?? 7));
    bumpMetric('sets', 1);
    bumpMetric('volume', volumeOf(set.weightKg, set.reps));
    setRestOpen(true);
  }

  function finish() {
    const done = finishWorkout();
    if (!done) return;
    registerSession();
    bumpMetric('pr', 0);
    haptic('success');
    setCelebrating(true);
    setTimeout(() => navigate('/quests'), 1500);
  }

  return (
    <div className="px-4 pt-12 pb-32 space-y-4">
      {celebrating && <Confetti />}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{active.name}</h1>
          <p className="text-sm text-muted">{completedSets} sets · {Math.round(totalVolume).toLocaleString()} kg</p>
        </div>
        <Badge color="rgb(var(--success))">LIVE</Badge>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={active.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
      {active.exercises.map((we) => {
        const ex = exerciseById(we.exerciseId);
        const last = we.sets[we.sets.length - 1];
        const suggestion = last ? overloadSuggestion(last.weightKg, last.reps, last.reps, last.rpe) : null;
        return (
          <Sortable key={we.id} id={we.id}>
            {(handle) => (
            <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button {...handle} className="text-muted cursor-grab active:cursor-grabbing touch-none" title="Drag to reorder"><GripVertical size={16} /></button>
                <span className="font-semibold">{ex?.name ?? 'Exercise'}</span>
                {we.supersetGroup && <Badge color="rgb(var(--accent-2))">superset</Badge>}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <button onClick={() => setSubFor(we.id)} title="Substitute"><Repeat size={16} /></button>
                <button
                  onClick={() => setLinkMode((m) => (m.includes(we.id) ? m.filter((x) => x !== we.id) : [...m, we.id]))}
                  title="Link superset"
                  className={linkMode.includes(we.id) ? 'text-accent-2' : ''}
                >
                  <Link2 size={16} />
                </button>
                <button onClick={() => removeExercise(we.id)} title="Remove">✕</button>
              </div>
            </div>

            <div className="space-y-1.5">
              {we.sets.map((s, i) => (
                <SetRow
                  key={s.id}
                  set={s}
                  index={i}
                  ghost={lastSetFor(we.exerciseId, i)}
                  onChange={(patch) => updateSet(we.id, s.id, patch)}
                  onComplete={() => handleComplete(we.id, s)}
                  onDelete={() => removeSet(we.id, s.id)}
                  onLongPress={() => setNoteFor({ weId: we.id, setId: s.id })}
                />
              ))}
            </div>

            {suggestion && (
              <p className="text-[11px] text-accent-2 flex items-center gap-1"><Flag size={11} /> {suggestion.note}</p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 justify-center py-2" onClick={() => addSet(we.id)}>
                <span className="flex items-center gap-1 text-xs"><Plus size={14} /> Set</span>
              </Button>
              <Button variant="ghost" className="justify-center py-2" onClick={() => setRestOpen(true)}>
                <span className="text-xs">Rest</span>
              </Button>
            </div>
          </Card>
            )}
          </Sortable>
        );
      })}
      </SortableContext>
      </DndContext>

      {linkMode.length >= 2 && (
        <Button className="w-full justify-center" onClick={() => { linkSuperset(linkMode); setLinkMode([]); haptic('success'); }}>
          Link {linkMode.length} exercises as a superset
        </Button>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => setPickerOpen(true)}>
          <span className="flex items-center gap-1"><Plus size={16} /> Exercise</span>
        </Button>
        <Button variant="ghost" className="justify-center" onClick={onOpenTools}><Wrench size={16} /></Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 justify-center" onClick={() => { discardWorkout(); navigate('/home'); }}>Discard</Button>
        <Button className="flex-1 justify-center" onClick={finish}>Finish 🔥</Button>
      </div>

      <RestTimer open={restOpen} onClose={() => setRestOpen(false)} />

      {/* Exercise picker */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add exercise">
        <ExercisePicker onPick={(id) => { addExercise(id); setPickerOpen(false); haptic('tap'); }} />
      </Sheet>

      {/* Substitution */}
      <Sheet open={!!subFor} onClose={() => setSubFor(null)} title="Substitute — same primary muscle">
        {subFor && (
          <div className="space-y-2">
            {substitutesFor(active.exercises.find((e) => e.id === subFor)?.exerciseId ?? '').map((alt) => (
              <button
                key={alt.id}
                onClick={() => { swapExercise(subFor, alt.id); setSubFor(null); haptic('tap'); }}
                className="w-full text-left rounded-xl bg-surface-2 px-4 py-3"
              >
                <p className="text-sm font-medium">{alt.name}</p>
                <p className="text-xs text-muted">{alt.category} · {alt.equipment}</p>
              </button>
            ))}
          </div>
        )}
      </Sheet>

      {/* Long-press: note / history / swap */}
      <Sheet open={!!noteFor} onClose={() => setNoteFor(null)} title="Set options">
        {noteFor && (
          <div className="space-y-3">
            <textarea
              placeholder="Add a note (form cue, pain, tempo)…"
              defaultValue={active.exercises.find((e) => e.id === noteFor.weId)?.sets.find((s) => s.id === noteFor.setId)?.note ?? ''}
              onChange={(e) => updateSet(noteFor.weId, noteFor.setId, { note: e.target.value })}
              className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-24"
            />
            <button onClick={() => { setSubFor(noteFor.weId); setNoteFor(null); }} className="w-full text-left flex items-center gap-2 text-sm py-2"><Repeat size={15} /> Swap exercise</button>
            <button onClick={() => setNoteFor(null)} className="w-full text-left flex items-center gap-2 text-sm py-2"><History size={15} /> Close (history shown as 👻 ghost on each set)</button>
          </div>
        )}
      </Sheet>

      <Sheet open={toolsOpen} onClose={onCloseTools} title="Lifting tools"><Tools /></Sheet>
      <p className="text-center text-[11px] text-muted/60">Swipe a set → to complete, ← to delete · long-press for notes · bodyweight {bodyweight}kg used for rank scoring</p>
    </div>
  );
}

// Render-prop sortable wrapper — exposes drag handle props so only the grip
// initiates a reorder, leaving the SetRow swipe gestures untouched.
function Sortable({ id, children }: { id: string; children: (handle: Record<string, unknown>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function ExercisePicker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const list = EXERCISES.filter(
    (e) => (cat === 'All' || e.category === cat) && e.name.toLowerCase().includes(q.toLowerCase()),
  ).slice(0, 40);
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['All', ...EXERCISE_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${cat === c ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
        {list.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)} className="w-full text-left rounded-xl bg-surface-2 px-4 py-2.5">
            <p className="text-sm font-medium">{e.name}</p>
            <p className="text-xs text-muted">{e.primary} · {e.equipment}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
