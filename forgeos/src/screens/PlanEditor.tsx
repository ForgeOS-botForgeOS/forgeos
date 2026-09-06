import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Wand2, Trash2, Search, X, Share2, Save, Play, GripVertical, FolderOpen, Sparkles, Store, ClipboardPaste, History, TrendingDown, AlertTriangle, LayoutGrid, SlidersHorizontal, Download } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { Card, Button, Sheet, Toggle } from '../components/ui';
import { ActionGroup, ActionRow } from '../components/ActionList';
import { askNumber, askText } from '../lib/dialog';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { useSettings } from '../state/settingsStore';
import { useSocial } from '../state/socialStore';
import { useGami } from '../state/gamificationStore';
import { EXERCISE_CATEGORIES, exerciseById, allExercises } from '../data/exercises';
import { useExercises } from '../state/exerciseStore';
import { CreateExerciseSheet } from '../components/CreateExercise';
import { analyseWeek, estimateDayMinutes } from '../lib/planInsights';
import { PLAN_FOCI, type PlanFocus, exercisesForFocus, inferFocus } from './onboarding/planGenerator';
import { sharePlan, decodePlan } from '../lib/planShare';
import { buildSmartDay, parsePastedWorkout, parsePastedWeek } from '../lib/planSmart';
import { tailorPlan } from '../lib/tailor';
import { rankForXp, rankLabel } from '../data/ranks';
import type { ExerciseTarget, PlannedDay, MuscleGroup, Weekday } from '../types';
import { haptic } from '../lib/haptics';

// One-tap proven splits — each day is built from the focus engine, so the
// exercises adapt to the catalogue (including the user's custom ones).
const STARTER_SPLITS: { name: string; desc: string; spec: Partial<Record<Weekday, { label: string; focus: PlanFocus }>> }[] = [
  {
    name: 'Full-body 3×', desc: 'Mon/Wed/Fri — the best all-round start',
    spec: { Mon: { label: 'Full Body A', focus: 'Full Body' }, Wed: { label: 'Full Body B', focus: 'Full Body' }, Fri: { label: 'Full Body C', focus: 'Full Body' } },
  },
  {
    name: 'Upper / Lower 4×', desc: 'Strength + size with 3 rest days',
    spec: { Mon: { label: 'Upper', focus: 'Upper' }, Tue: { label: 'Lower', focus: 'Lower' }, Thu: { label: 'Upper', focus: 'Upper' }, Fri: { label: 'Lower', focus: 'Lower' } },
  },
  {
    name: 'Push / Pull / Legs 6×', desc: 'High volume — for busy gym rats',
    spec: { Mon: { label: 'Push', focus: 'Push' }, Tue: { label: 'Pull', focus: 'Pull' }, Wed: { label: 'Legs', focus: 'Legs' }, Thu: { label: 'Push', focus: 'Push' }, Fri: { label: 'Pull', focus: 'Pull' }, Sat: { label: 'Legs', focus: 'Legs' } },
  },
  {
    name: 'PPL + rest 3×', desc: 'Classic split with full recovery',
    spec: { Mon: { label: 'Push', focus: 'Push' }, Wed: { label: 'Pull', focus: 'Pull' }, Fri: { label: 'Legs', focus: 'Legs' } },
  },
];

const BALANCE_MUSCLES: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Core'];

export default function PlanEditor() {
  const navigate = useNavigate();
  const plan = useUser((s) => s.weekPlan);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const savedPlans = useUser((s) => s.savedPlans);
  const savePlanAs = useUser((s) => s.savePlanAs);
  const loadPlan = useUser((s) => s.loadPlan);
  const deletePlan = useUser((s) => s.deletePlan);
  const profile = useUser((s) => s.profile);
  const specialRequest = profile?.specialRequest;
  const gym = useSettings((s) => s.gym);
  const startWorkout = useWorkout((s) => s.startWorkout);
  const publishRoutine = useSocial((s) => s.publishRoutine);
  const history = useWorkout((s) => s.history);
  const xp = useGami((s) => s.xp);
  const addCoins = useGami((s) => s.addCoins);

  const [openDay, setOpenDay] = useState<string | null>(null);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [weightStep, setWeightStep] = useState(2.5);
  const [aiOpen, setAiOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteWeekOpen, setPasteWeekOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const customCount = useExercises((s) => s.custom.length);
  const [createOpen, setCreateOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Week balance: sets per muscle + plain-language warnings, live as you edit.
  const analysis = useMemo(() => (plan ? analyseWeek(plan, exerciseById) : null), [plan, customCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const daySets = (d: PlannedDay) => d.exerciseIds.reduce((a, id) => a + (d.targets?.[id]?.sets ?? 3), 0);

  // Heaviest weight you last lifted for an exercise, from completed sets.
  function histWeight(exerciseId: string): number | null {
    for (const w of history) {
      const we = w.exercises.find((e) => e.exerciseId === exerciseId);
      const done = we?.sets.filter((s) => s.completed) ?? [];
      if (done.length) return done.reduce((a, b) => (b.weightKg > a.weightKg ? b : a)).weightKg;
    }
    return null;
  }
  const round2 = (n: number) => Math.round(n / 2.5) * 2.5;

  function fillFromHistory() {
    let filled = 0;
    setWeekPlan({
      ...plan!,
      days: plan!.days.map((d) => {
        if (d.rest) return d;
        const targets = { ...(d.targets ?? {}) };
        for (const id of d.exerciseIds) {
          const hw = histWeight(id);
          if (hw) { targets[id] = { sets: targets[id]?.sets ?? 3, reps: targets[id]?.reps ?? 8, weightKg: round2(hw) }; filled++; }
        }
        return { ...d, targets };
      }),
    });
    flash(filled ? `Set ${filled} weights from your history` : 'No history yet — log some sets first');
    haptic('success');
  }

  function deload() {
    setWeekPlan({
      ...plan!,
      days: plan!.days.map((d) => {
        if (d.rest) return d;
        const targets = { ...(d.targets ?? {}) };
        for (const id of d.exerciseIds) {
          const base = targets[id]?.weightKg || histWeight(id) || 0;
          targets[id] = { sets: Math.max(2, (targets[id]?.sets ?? 3) - 1), reps: targets[id]?.reps ?? 8, weightKg: base ? round2(base * 0.6) : 0 };
        }
        return { ...d, targets };
      }),
    });
    flash('Deload applied — ~60% load, one fewer set per lift');
    haptic('success');
  }

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
    // Seed the target from your last performance so a newly added exercise
    // starts at real numbers instead of 3×8 @ 20 kg (same toggle as Train).
    const prev = useSettings.getState().prefillWeights ? useWorkout.getState().lastPerformance(id) : undefined;
    const targets = prev?.length
      ? { ...(d.targets ?? {}), [id]: { sets: prev.length, reps: prev[0].reps, weightKg: round2(Math.max(...prev.map((s) => s.weightKg))) } }
      : d.targets;
    patch(day, { exerciseIds: [...d.exerciseIds, id], targets });
    haptic('tap');
  }
  function removeExercise(day: string, id: string) {
    const d = plan!.days.find((x) => x.day === day)!;
    const targets = { ...(d.targets ?? {}) };
    delete targets[id];
    patch(day, { exerciseIds: d.exerciseIds.filter((x) => x !== id), targets });
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
  function onDragEnd(day: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const d = plan!.days.find((x) => x.day === day)!;
    const ids = arrayMove(d.exerciseIds, d.exerciseIds.indexOf(String(active.id)), d.exerciseIds.indexOf(String(over.id)));
    patch(day, { exerciseIds: ids });
    haptic('tap');
  }
  async function tailor() {
    const note = specialRequest || (await askText({
      title: 'What should the plan work around?',
      body: 'Describe a limitation and the week re-tunes itself around it.',
      placeholder: 'e.g. bad knees, no overhead, short on time',
      confirmLabel: 'Tailor',
      required: true,
    })) || '';
    if (!note.trim()) return;
    const { plan: tailored, notes } = tailorPlan(plan!, note);
    setWeekPlan(tailored);
    flash(notes.length ? notes.join(' ') : 'No matching rules — try keywords like knees, shoulder, back, time.');
    haptic('success');
  }
  function copyDay(src: string, dst: string) {
    const from = plan!.days.find((x) => x.day === src)!;
    patch(dst, { label: from.label, exerciseIds: [...from.exerciseIds], targets: { ...(from.targets ?? {}) }, rest: from.rest });
    flash(`Copied ${src} → ${dst}`);
    haptic('success');
  }
  function swapDays(a: string, b: string) {
    const da = plan!.days.find((x) => x.day === a)!;
    const db = plan!.days.find((x) => x.day === b)!;
    const take = (d: PlannedDay) => ({ label: d.label, exerciseIds: [...d.exerciseIds], targets: { ...(d.targets ?? {}) }, rest: d.rest });
    const ca = take(da);
    const cb = take(db);
    setWeekPlan({ ...plan!, days: plan!.days.map((d) => (d.day === a ? { ...d, ...cb } : d.day === b ? { ...d, ...ca } : d)) });
    flash(`Swapped ${a} ↔ ${b}`);
    haptic('success');
  }
  function applySplit(split: (typeof STARTER_SPLITS)[number]) {
    setWeekPlan({
      ...plan!,
      days: plan!.days.map((d) => {
        const spec = split.spec[d.day];
        return spec
          ? { ...d, label: spec.label, exerciseIds: exercisesForFocus(spec.focus, 6), targets: {}, rest: false }
          : { ...d, label: 'Rest', exerciseIds: [], targets: {}, rest: true };
      }),
    });
    setShowSaved(false);
    flash(`Built “${split.name}” — tweak anything you like`);
    haptic('success');
  }

  async function publish() {
    const title = await askText({
      title: 'Publish your plan as…',
      defaultValue: 'My Forge Week',
      confirmLabel: 'Next',
      required: true,
      maxLength: 60,
    });
    if (!title) return;
    const price = (await askNumber({
      title: 'Price in Forge Coins',
      body: 'Leave it at 0 to give the plan away for free.',
      defaultValue: '0',
      confirmLabel: 'Publish',
      maxLength: 6,
    })) ?? 0;
    const { tier } = rankForXp(xp);
    publishRoutine({ title, priceCoins: price, focus: 'Custom', plan: plan!, author: profile?.name ?? 'You', authorRank: rankLabel(tier) });
    addCoins(25); // publishing bonus
    flash('Published to the marketplace (+🪙25)');
    haptic('success');
  }
  function importFromCode() {
    const raw = importCode.includes('p=') ? importCode.split('p=')[1] : importCode.trim();
    const p = decodePlan(raw);
    if (!p) { flash('That code/link is invalid.'); return; }
    setWeekPlan(p);
    setImportOpen(false);
    setImportCode('');
    flash('Plan imported!');
    haptic('success');
  }
  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
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

      {/* One obvious action, then everything else behind one door.
          This used to be nine equal ghost buttons in a 3x3 block: every action
          shouted equally, two of the labels wrapped onto a second line, and the
          three "paste"-ish ones were indistinguishable. Now the star action is
          the only filled button on the screen, and the rest are grouped and
          described in a sheet where each one has room for a sentence. */}
      <div className="flex gap-2">
        <Button className="flex-[2] justify-center py-2.5" onClick={() => setAiOpen(true)}>
          <span className="flex items-center gap-1.5 text-sm"><Sparkles size={15} /> AI build a day</span>
        </Button>
        <Button variant="outline" className="flex-1 justify-center py-2.5" onClick={() => setToolsOpen(true)}>
          <span className="flex items-center gap-1.5 text-sm"><SlidersHorizontal size={15} /> Tools</span>
        </Button>
      </div>

      <Sheet open={toolsOpen} onClose={() => setToolsOpen(false)} title="Plan tools">
        <ActionGroup title="Build the week">
          <ActionRow
            icon={<ClipboardPaste size={15} />} title="Paste a workout"
            detail="Turn a session written anywhere into one day"
            onClick={() => { setToolsOpen(false); setPasteOpen(true); }}
          />
          <ActionRow
            icon={<ClipboardPaste size={15} />} title="Paste a whole week"
            detail="Seven days at once, from text"
            onClick={() => { setToolsOpen(false); setPasteWeekOpen(true); }}
          />
          <ActionRow
            icon={<Download size={15} />} title="Import a plan code"
            detail="From a link somebody shared with you"
            onClick={() => { setToolsOpen(false); setImportOpen(true); }}
          />
          <ActionRow
            icon={<Sparkles size={15} />} title="Tailor to a limitation"
            detail="Bad knees, no overhead, short on time"
            onClick={() => { setToolsOpen(false); void tailor(); }}
          />
        </ActionGroup>

        <ActionGroup title="Keep &amp; reuse">
          <ActionRow
            icon={<Save size={15} />} title="Save as a template"
            detail="Come back to this exact week whenever"
            onClick={async () => {
              setToolsOpen(false);
              const n = await askText({ title: 'Save this plan as…', defaultValue: 'My plan', confirmLabel: 'Save', required: true, maxLength: 40 });
              if (n) { savePlanAs(n); flash('Saved to templates'); }
            }}
          />
          <ActionRow
            icon={<FolderOpen size={15} />} title="My templates"
            detail={savedPlans.length ? 'Load a week you saved earlier' : 'Nothing saved yet'}
            trailing={<span className="font-mono text-xs text-muted">{savedPlans.length}</span>}
            onClick={() => { setToolsOpen(false); setShowSaved(true); }}
          />
        </ActionGroup>

        <ActionGroup title="Send it out">
          <ActionRow
            icon={<Share2 size={15} />} title="Share this week"
            detail="A link anyone can open"
            onClick={async () => {
              setToolsOpen(false);
              const r = await sharePlan(plan, 'My week');
              flash(r === 'shared' ? 'Shared!' : 'Link copied to clipboard');
            }}
          />
          <ActionRow
            icon={<Store size={15} />} title="Publish to the marketplace"
            detail="Other lifters can run your plan · +🪙25"
            onClick={() => { setToolsOpen(false); void publish(); }}
          />
        </ActionGroup>
      </Sheet>

      {/* Weights: increment + history fill + deload */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted">Weight step</span>
          <div className="flex gap-1" data-noswipe>
            {[2.5, 5, 10, 20].map((st) => (
              <button key={st} onClick={() => setWeightStep(st)} className={`rounded-full px-2.5 py-1 text-xs font-medium ${weightStep === st ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>+{st}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 justify-center" onClick={fillFromHistory}>
            <span className="flex items-center gap-1 text-xs"><History size={14} /> Fill from history</span>
          </Button>
          <Button variant="ghost" className="flex-1 justify-center" onClick={deload}>
            <span className="flex items-center gap-1 text-xs"><TrendingDown size={14} /> Deload</span>
          </Button>
        </div>
      </Card>

      {/* Week balance — sets per muscle + honest warnings */}
      {analysis && analysis.totalSets > 0 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-muted flex items-center gap-1"><LayoutGrid size={12} /> Week balance</span>
            <span className="text-[11px] text-muted">{analysis.totalSets} sets · push:pull {analysis.pullSets ? `${Math.round((analysis.pushSets / analysis.pullSets) * 10) / 10}:1` : '—'}</span>
          </div>
          <div className="space-y-1">
            {BALANCE_MUSCLES.map((m) => {
              const v = analysis.setsPerMuscle[m] ?? 0;
              const max = Math.max(...BALANCE_MUSCLES.map((x) => analysis.setsPerMuscle[x] ?? 0), 1);
              return (
                <div key={m} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted w-20 shrink-0">{m}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className={`h-full rounded-full ${v === 0 ? '' : 'bg-accent'}`} style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                  <span className={`text-[10px] font-mono w-8 text-right ${v === 0 ? 'text-warn' : 'text-muted'}`}>{Math.round(v * 10) / 10}</span>
                </div>
              );
            })}
          </div>
          {analysis.warnings.map((w) => (
            <p key={w} className="text-[11px] text-warn flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}</p>
          ))}
        </Card>
      )}

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
                  aria-label={`Name for ${d.day}`}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none disabled:text-muted"
                />
                {/* nowrap: this used to wrap "2 ex · ~23 min" onto three lines
                    and stretch the row to triple height. */}
                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">
                  {d.rest ? 'Rest' : `${d.exerciseIds.length} ex · ~${estimateDayMinutes(daySets(d))} min`}
                </span>
                <Toggle label={`${d.day}: training day`} checked={!d.rest} onChange={() => toggleRest(d)} />
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
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(d.day, e)}>
                        <SortableContext items={d.exerciseIds} strategy={verticalListSortingStrategy}>
                          {d.exerciseIds.map((id) => {
                            const ex = exerciseById(id);
                            const tgt = d.targets?.[id] ?? { sets: 3, reps: 8 };
                            return (
                              <Sortable key={id} id={id}>
                                {(handle) => (
                                  <div className="rounded-lg bg-surface-2 px-3 py-2 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <button {...handle} aria-label={`Reorder ${ex?.name ?? id}`} className="text-muted cursor-grab active:cursor-grabbing touch-none shrink-0"><GripVertical size={15} /></button>
                                      <span className="text-sm flex-1">{ex?.name ?? id}</span>
                                      <button onClick={() => removeExercise(d.day, id)} aria-label={`Remove ${ex?.name ?? id} from ${d.day}`} className="text-danger"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="flex items-center gap-2 pl-6 flex-wrap">
                                      <Stepper label="sets" value={tgt.sets} min={1} max={10} onChange={(v) => setTarget(d.day, id, { ...tgt, sets: v })} />
                                      <Stepper label="reps" value={tgt.reps} min={1} max={30} onChange={(v) => setTarget(d.day, id, { ...tgt, reps: v })} />
                                      <Stepper label={tgt.weightKg ? 'kg' : 'auto'} value={tgt.weightKg ?? 0} min={0} max={500} step={weightStep} onChange={(v) => setTarget(d.day, id, { ...tgt, weightKg: v })} />
                                    </div>
                                  </div>
                                )}
                              </Sortable>
                            );
                          })}
                        </SortableContext>
                      </DndContext>

                      <Button variant="ghost" className="w-full justify-center py-2" onClick={() => setPickerDay(d.day)}>
                        <span className="flex items-center gap-1 text-xs"><Plus size={14} /> Add exercise</span>
                      </Button>

                      <div className="flex items-center gap-1.5 flex-wrap" data-noswipe>
                        <span className="text-[10px] text-muted">Copy to</span>
                        {plan.days.filter((x) => x.day !== d.day).map((x) => (
                          <button key={x.day} onClick={() => copyDay(d.day, x.day)} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{x.day}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap" data-noswipe>
                        <span className="text-[10px] text-muted">Swap with</span>
                        {plan.days.filter((x) => x.day !== d.day).map((x) => (
                          <button key={x.day} onClick={() => swapDays(d.day, x.day)} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{x.day}</button>
                        ))}
                      </div>
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

      <ExercisePickerSheet open={!!pickerDay} onClose={() => setPickerDay(null)} onPick={(id) => { if (pickerDay) addExercise(pickerDay, id); }} onCreate={() => setCreateOpen(true)} />
      <CreateExerciseSheet open={createOpen} onClose={() => setCreateOpen(false)} />

      <AiBuildSheet open={aiOpen} onClose={() => setAiOpen(false)} days={plan.days} onBuild={(day, built) => { patch(day, { label: built.label, exerciseIds: built.exerciseIds, targets: built.targets, rest: false }); setAiOpen(false); flash('Workout built ✨'); haptic('success'); }} />
      <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} days={plan.days} onParse={(day, built) => { patch(day, { label: built.label, exerciseIds: built.exerciseIds, targets: built.targets, rest: false }); setPasteOpen(false); flash(`Matched ${built.exerciseIds.length} exercises`); haptic('success'); }} />
      <PasteWeekSheet open={pasteWeekOpen} onClose={() => setPasteWeekOpen(false)} onApply={(days, matchedDays, matchedExercises) => { setWeekPlan({ id: plan.id, blockType: plan.blockType, days }); setPasteWeekOpen(false); flash(`Built ${matchedDays} day(s) · ${matchedExercises} exercises`); haptic('success'); }} />

      {/* Import by code/link */}
      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="Import a shared plan">
        <div className="space-y-3">
          <p className="text-sm text-muted">Paste a friend’s share link or code.</p>
          <textarea value={importCode} onChange={(e) => setImportCode(e.target.value)} placeholder="https://…#/import?p=… or the raw code" className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-24" />
          <Button className="w-full justify-center" disabled={!importCode.trim()} onClick={importFromCode}>Import plan</Button>
        </div>
      </Sheet>

      {/* Saved templates */}
      <Sheet open={showSaved} onClose={() => setShowSaved(false)} title="Templates">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted">Starter splits</p>
          {STARTER_SPLITS.map((t) => (
            <Card key={t.name} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[11px] text-muted">{t.desc}</p>
              </div>
              <Button className="py-1.5" onClick={() => applySplit(t)}>Build</Button>
            </Card>
          ))}
          <p className="text-[11px] uppercase tracking-wide text-muted pt-2">Your saved plans</p>
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

function DayPicker({ days, value, onChange }: { days: PlannedDay[]; value: string; onChange: (d: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap" data-noswipe>
      {days.map((d) => (
        <button key={d.day} onClick={() => onChange(d.day)} className={`rounded-full px-2.5 py-1 text-xs ${value === d.day ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{d.day}</button>
      ))}
    </div>
  );
}

function AiBuildSheet({ open, onClose, days, onBuild }: { open: boolean; onClose: () => void; days: PlannedDay[]; onBuild: (day: string, built: ReturnType<typeof buildSmartDay>) => void }) {
  const [day, setDay] = useState<string>(days.find((d) => !d.rest)?.day ?? days[0]?.day ?? 'Mon');
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('');
  const [skip, setSkip] = useState('');
  const [goal, setGoal] = useState<'hypertrophy' | 'strength'>('hypertrophy');
  return (
    <Sheet open={open} onClose={onClose} title="AI trainer — build a day">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">Name the day (e.g. “Push”, “Leg day”, “Upper body”) and I’ll program a full session like a coach.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workout name / goal (e.g. Push day)" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
        <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus on… (e.g. chest, arms)" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
        <input value={skip} onChange={(e) => setSkip(e.target.value)} placeholder="Skip / avoid… (e.g. no deadlift, bad knees)" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
        <div className="flex gap-2">
          <Button variant={goal === 'hypertrophy' ? 'primary' : 'ghost'} className="flex-1 justify-center py-1.5" onClick={() => setGoal('hypertrophy')}>Hypertrophy</Button>
          <Button variant={goal === 'strength' ? 'primary' : 'ghost'} className="flex-1 justify-center py-1.5" onClick={() => setGoal('strength')}>Strength</Button>
        </div>
        <p className="text-[11px] text-muted">Write into day:</p>
        <DayPicker days={days} value={day} onChange={setDay} />
        <Button className="w-full justify-center" onClick={() => onBuild(day, buildSmartDay(name, focus, skip, goal))}>Create workout</Button>
      </div>
    </Sheet>
  );
}

function PasteSheet({ open, onClose, days, onParse }: { open: boolean; onClose: () => void; days: PlannedDay[]; onParse: (day: string, built: ReturnType<typeof parsePastedWorkout>) => void }) {
  const [day, setDay] = useState<string>(days.find((d) => !d.rest)?.day ?? days[0]?.day ?? 'Mon');
  const [text, setText] = useState('');
  const preview = text.trim() ? parsePastedWorkout(text) : null;
  return (
    <Sheet open={open} onClose={onClose} title="Paste a workout">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">Paste a workout from anywhere — one exercise per line, e.g. “Bench Press 3x8 80kg”. We’ll match it to the library.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'Bench Press 4x8 80kg\nLat Pulldown 3x10 60kg\nSquat 5x5 100kg'} className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-32 font-mono" />
        {preview && <p className="text-[11px] text-accent-2">Matched {preview.exerciseIds.length} exercise(s).</p>}
        <p className="text-[11px] text-muted">Write into day:</p>
        <DayPicker days={days} value={day} onChange={setDay} />
        <Button className="w-full justify-center" disabled={!preview || preview.exerciseIds.length === 0} onClick={() => preview && onParse(day, preview)}>Fill day from text</Button>
      </div>
    </Sheet>
  );
}

function PasteWeekSheet({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (days: PlannedDay[], matchedDays: number, matchedExercises: number) => void }) {
  const [text, setText] = useState('');
  const preview = text.trim() ? parsePastedWeek(text) : null;
  const example = 'Monday - Push\nBench Press 4x8 80kg\nOverhead Press 3x10\nTuesday - Pull\nDeadlift 5x5 120kg\nLat Pulldown 3x12\nWednesday - Rest\nThursday: Legs\nSquat 5x5 100kg\nLeg Press 3x12';
  return (
    <Sheet open={open} onClose={onClose} title="Paste a whole week">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">
          Paste a full week from anywhere. Start each day with its name (<b>Monday</b>, <b>Mon - Push</b>, or <b>Day 1: Legs</b>), then one exercise per line (<b>Bench Press 4x8 80kg</b>). Write <b>Rest</b> for off days. Unlisted days become rest.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={example} className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-48 font-mono" />
        {preview && (
          <Card className="bg-surface-2 space-y-1">
            <p className="text-[11px] text-accent-2">{preview.matchedDays} training day(s) · {preview.matchedExercises} exercise(s) matched.</p>
            {preview.days.map((d) => (
              <div key={d.day} className="flex items-center justify-between text-[11px]">
                <span className="font-medium">{d.day}</span>
                <span className="text-muted truncate ml-2">{d.rest ? 'Rest' : `${d.label} · ${d.exerciseIds.length} ex`}</span>
              </div>
            ))}
          </Card>
        )}
        <p className="text-[11px] text-muted">This replaces your current week plan.</p>
        <Button className="w-full justify-center" disabled={!preview || preview.matchedDays === 0} onClick={() => preview && onApply(preview.days, preview.matchedDays, preview.matchedExercises)}>Replace week from text</Button>
      </div>
    </Sheet>
  );
}

function Sortable({ id, children }: { id: string; children: (handle: Record<string, unknown>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 20 : undefined };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - step))} className="w-6 h-6 rounded bg-surface text-muted text-sm">−</button>
      <span className="text-xs font-mono w-12 text-center">{value} {label}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} className="w-6 h-6 rounded bg-surface text-muted text-sm">+</button>
    </div>
  );
}

function ExercisePickerSheet({ open, onClose, onPick, onCreate }: { open: boolean; onClose: () => void; onPick: (id: string) => void; onCreate: () => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const list = allExercises().filter(
    (e) =>
      (cat === 'All' || (cat === 'Yours' ? e.id.startsWith('cus-') : e.category === cat)) &&
      (e.name.toLowerCase().includes(q.toLowerCase()) || e.primary.toLowerCase().includes(q.toLowerCase())),
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
          {['All', 'Yours', ...EXERCISE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${cat === c ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{c}</button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
          {list.map((e) => (
            <button key={e.id} onClick={() => { onPick(e.id); haptic('tap'); }} className="w-full text-left rounded-xl bg-surface-2 px-4 py-2.5">
              <p className="text-sm font-medium">{e.name}{e.id.startsWith('cus-') && <span className="text-[10px] text-success ml-1.5">yours</span>}</p>
              <p className="text-xs text-muted">{e.primary} · {e.category}</p>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full justify-center py-2" onClick={onCreate}>
          <span className="flex items-center gap-1 text-xs"><Plus size={14} /> Not in the list? Create your own</span>
        </Button>
      </div>
    </Sheet>
  );
}
