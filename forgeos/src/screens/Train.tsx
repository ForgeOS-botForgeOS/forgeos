import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, Wrench, Link2, Repeat, AlertTriangle, Brain, Flag, History, GripVertical, Camera, Watch, Moon } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { Screen } from '../components/Screen';
import { Card, Button, Sheet, Badge, SectionTitle, Pill } from '../components/ui';
import { SetRow } from '../components/train/SetRow';
import { RestTimer } from '../components/train/RestTimer';
import { Tools } from '../components/train/Tools';
import { Confetti } from '../components/Celebrate';
import { toast, celebrate } from '../lib/toast';
import { HeavyDrop, type Drop } from '../components/HeavyDrop';
import { pickHeavyQuote, rollRarity } from '../data/heavyQuotes';
import { useT } from '../lib/i18n';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useSettings } from '../state/settingsStore';
import { useGami } from '../state/gamificationStore';
import { useSocial } from '../state/socialStore';
import { EXERCISES, exerciseById, substitutesFor, EXERCISE_CATEGORIES } from '../data/exercises';
import { detectPlateaus, recommendBlock, trainingLoadWarning } from '../lib/analytics';
import { readinessFromDays } from '../lib/readiness';
import { ReadinessChip } from '../components/Readiness';
import { useHealth, sortedDays } from '../state/healthStore';
import { overloadSuggestion, volumeOf } from '../lib/fitness';
import { scanCardio, type CardioSource } from '../lib/vision';
import { CardioFields } from '../components/CardioForm';
import { newCardioData, type CardioData } from '../lib/cardio';
import { xpForSet } from '../data/ranks';
import { haptic } from '../lib/haptics';
import type { SetEntry } from '../types';

export default function Train() {
  const active = useWorkout((s) => s.active);
  const history = useWorkout((s) => s.history);
  const weekPlan = useUser((s) => s.weekPlan);
  const gymMax = useSettings((s) => s.gym.maxWeightKg);
  const startWorkout = useWorkout((s) => s.startWorkout);
  const repeatWorkout = useWorkout((s) => s.repeatWorkout);

  const lastStrength = useMemo(() => history.find((w) => !w.cardio && w.exercises.length > 0), [history]);

  const [toolsOpen, setToolsOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const navigate = useNavigate();
  const t = useT();

  const plateaus = useMemo(() => detectPlateaus(history), [history]);
  const rec = useMemo(() => recommendBlock(history), [history]);
  const loadWarning = useMemo(() => trainingLoadWarning(history), [history]);
  const recoveryEnabled = useSettings((s) => s.recoveryEnabled);
  const healthDays = useHealth((s) => s.days);
  const readiness = useMemo(() => (recoveryEnabled ? readinessFromDays(sortedDays(healthDays)) : null), [recoveryEnabled, healthDays]);

  const todayPlan = useMemo(() => {
    if (!weekPlan) return null;
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = map[new Date().getDay()];
    return weekPlan.days.find((d) => d.day === today) ?? null;
  }, [weekPlan]);

  if (active) return <ActiveSession onOpenTools={() => setToolsOpen(true)} toolsOpen={toolsOpen} onCloseTools={() => setToolsOpen(false)} />;

  return (
    <Screen title={t('train.title')} subtitle={t('train.subtitle')}>
      {/* Today's plan */}
      <Card>
        <SectionTitle>{t('train.todaySession')}</SectionTitle>
        {todayPlan && !todayPlan.rest ? (
          <>
            <p className="font-semibold text-lg">{todayPlan.label}</p>
            <p className="text-sm text-muted mt-1">{todayPlan.exerciseIds.map((id) => exerciseById(id)?.name).filter(Boolean).slice(0, 4).join(' · ')}…</p>
            <Button className="w-full justify-center mt-3" onClick={() => { startWorkout(todayPlan.label, todayPlan.exerciseIds, { targets: todayPlan.targets, maxWeightKg: gymMax }); haptic('success'); }}>
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
        <Button variant="ghost" className="w-full justify-center mt-2" onClick={() => setCustomOpen(true)}>
          <span className="flex items-center gap-2"><Plus size={16} /> Start a custom workout</span>
        </Button>
      </Card>

      <CustomWorkoutSheet open={customOpen} onClose={() => setCustomOpen(false)} onStart={(name) => { startWorkout(name); setCustomOpen(false); haptic('success'); toast(`“${name}” started 💪`); }} />

      {/* Repeat your last session — same lifts, last weights pre-filled */}
      {lastStrength && (
        <Card className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted">Do it again</p>
            <p className="font-semibold truncate">{lastStrength.name}</p>
            <p className="text-[11px] text-muted">{lastStrength.exercises.length} exercises · weights pre-filled</p>
          </div>
          <Button variant="outline" className="py-1.5 shrink-0" onClick={() => { if (repeatWorkout(lastStrength.id)) { haptic('success'); toast('Repeating your last session 💪'); } }}>
            <span className="flex items-center gap-1.5"><Repeat size={15} /> Repeat</span>
          </Button>
        </Card>
      )}

      {/* Recovery readiness — last night's data steering today's effort */}
      {readiness && (
        <Card className="flex items-start gap-3" style={{ borderColor: readiness.color }}>
          <Moon size={18} className="mt-0.5 shrink-0" style={{ color: readiness.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wide text-muted">Today’s readiness</span>
              <ReadinessChip r={readiness} />
            </div>
            <p className="text-sm mt-1">{readiness.advice}</p>
          </div>
        </Card>
      )}

      {/* Deload / overtraining watch */}
      {loadWarning && (
        <Card className={`flex gap-3 items-start ${loadWarning.level === 'spike' ? 'border-danger/50' : 'border-warn/50'}`}>
          <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${loadWarning.level === 'spike' ? 'text-danger' : 'text-warn'}`} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{loadWarning.level === 'spike' ? 'Load spike' : 'Fatigue building'}</p>
            <p className="text-sm mt-1">{loadWarning.message}</p>
          </div>
        </Card>
      )}

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

      <CardioScanCard />

      <Sheet open={toolsOpen} onClose={() => setToolsOpen(false)} title="Lifting tools">
        <Tools />
      </Sheet>
    </Screen>
  );
}

// XP reward for cardio — distance + time, like a lift earns from weight × reps.
function cardioXp(distanceKm: number, durationMin: number, calories = 0) {
  return Math.round(distanceKm * 15 + durationMin * 4 + calories / 8) + 20;
}

function CardioScanCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const logCardio = useWorkout((s) => s.logCardio);
  const registerSession = useGami((s) => s.registerSession);
  const addXp = useGami((s) => s.addXp);
  const bumpMetric = useGami((s) => s.bumpMetric);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<CardioData | null>(null);
  const [scanMeta, setScanMeta] = useState<{ confidence: number; tip: string } | null>(null);
  const [source, setSource] = useState<CardioSource>('watch');
  const [manualOpen, setManualOpen] = useState(false);

  // Shared reward path for both photo-scan and manual logging.
  function reward(d: CardioData) {
    const { machine, distanceKm, durationMin, calories, metrics } = d;
    const { distancePR, durationPR } = logCardio(machine, distanceKm, durationMin, calories, metrics);
    registerSession();
    bumpMetric('volume', Math.round(distanceKm * 1000)); // distance counts toward volume quests
    const xp = cardioXp(distanceKm, durationMin, calories) + (distancePR ? 60 : 0) + (durationPR ? 40 : 0);
    addXp(xp);
    if (distancePR || durationPR) {
      celebrate();
      toast(`Cardio PR! ${distancePR ? `${distanceKm}km` : `${Math.round(durationMin)}min`} 🏃 +${xp} XP`);
    } else {
      haptic('success');
      toast(`Cardio logged 🏃 ${distanceKm}km · ${Math.round(durationMin)}min · +${xp} XP`);
    }
  }

  function pick(src: CardioSource) {
    setSource(src);
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const c = await scanCardio(file, source);
      // Carry any extra reading (e.g. heart rate) straight into an editable metric.
      const metrics = c.avgHr && c.avgHr > 0
        ? [{ id: Math.random().toString(36).slice(2, 10), label: 'Avg HR', value: `${Math.round(c.avgHr)} bpm` }]
        : [];
      setDraft(newCardioData({ machine: c.machine || (source === 'watch' ? 'Run' : 'Cardio'), distanceKm: c.distanceKm, durationMin: c.durationMin, calories: c.calories, metrics }));
      setScanMeta({ confidence: c.confidence, tip: c.tip });
      haptic('success');
    } catch {
      setDraft(newCardioData({ machine: source === 'watch' ? 'Run' : 'Cardio', distanceKm: 0, durationMin: 0, calories: 0 }));
      setScanMeta({ confidence: 0, tip: 'Could not read it — enter the numbers manually.' });
      haptic('warning');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function logIt() {
    if (!draft) return;
    reward(draft);
    setDraft(null);
    setScanMeta(null);
  }

  return (
    <Card className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" disabled={busy} onClick={() => pick('watch')}>
          <span className="flex items-center gap-2"><Watch size={16} /> {busy && source === 'watch' ? 'Reading…' : 'From watch'}</span>
        </Button>
        <Button variant="ghost" className="flex-1 justify-center" disabled={busy} onClick={() => pick('machine')}>
          <span className="flex items-center gap-2"><Camera size={16} /> {busy && source === 'machine' ? 'Reading…' : 'Machine'}</span>
        </Button>
      </div>
      <Button variant="ghost" className="w-full justify-center" onClick={() => setManualOpen(true)}>
        <span className="flex items-center gap-2"><Plus size={16} /> Log manually</span>
      </Button>
      <p className="text-[11px] text-muted/70 text-center">Snap your watch or a machine console — we read distance, time & speed, and you can add your own metrics. Distance + time earn XP; beat your best for a cardio PR 🏃</p>

      <ManualCardioSheet open={manualOpen} onClose={() => setManualOpen(false)} onLog={(d) => { reward(d); setManualOpen(false); }} />

      <Sheet open={!!draft} onClose={() => { setDraft(null); setScanMeta(null); }} title={source === 'watch' ? 'Review watch session' : 'Review cardio'}>
        {draft && (
          <div className="space-y-3">
            {scanMeta && <p className="text-[11px] text-muted">Read from your {source === 'watch' ? 'watch' : 'console'} — adjust anything. Confidence {Math.round(scanMeta.confidence * 100)}%.</p>}
            <CardioFields data={draft} onChange={setDraft} />
            {scanMeta?.tip && <p className="text-xs text-muted">💡 {scanMeta.tip}</p>}
            <Button className="w-full justify-center" onClick={logIt}>Log session</Button>
          </div>
        )}
      </Sheet>
    </Card>
  );
}

function CustomWorkoutSheet({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (name: string) => void }) {
  const [name, setName] = useState('');
  const suggestions = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Arms', 'Chest & Back', 'Conditioning'];
  return (
    <Sheet open={open} onClose={onClose} title="Custom workout">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">Name your session — add exercises as you go.</p>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onStart(name.trim()); }}
          placeholder="e.g. Peter’s Power Hour"
          className="w-full rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => <Pill key={s} active={name === s} onClick={() => setName(s)}>{s}</Pill>)}
        </div>
        <Button className="w-full justify-center" disabled={!name.trim()} onClick={() => onStart(name.trim())}>Start workout</Button>
      </div>
    </Sheet>
  );
}

function ManualCardioSheet({ open, onClose, onLog }: { open: boolean; onClose: () => void; onLog: (d: CardioData) => void }) {
  const [data, setData] = useState<CardioData>(newCardioData());
  useEffect(() => { if (open) setData(newCardioData()); }, [open]); // fresh defaults each open
  const valid = data.distanceKm > 0 || data.durationMin > 0;
  return (
    <Sheet open={open} onClose={onClose} title="Log cardio">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">Distance and time both earn XP. Add your own metrics — HR, elevation, splits, whatever you track. Beat your longest distance or time for a cardio PR 🏃</p>
        <CardioFields data={data} onChange={setData} />
        <Button className="w-full justify-center" disabled={!valid} onClick={() => onLog(data)}>Log {data.machine || 'cardio'}</Button>
      </div>
    </Sheet>
  );
}

function ActiveSession({ onOpenTools, toolsOpen, onCloseTools }: { onOpenTools: () => void; toolsOpen: boolean; onCloseTools: () => void }) {
  const active = useWorkout((s) => s.active)!;
  const { addExercise, removeExercise, swapExercise, addSet, updateSet, removeSet, completeSet, finishWorkout, discardWorkout, linkSuperset, reorderExercises, addCardioToActive, lastSetFor } = useWorkout();
  const cardioRef = useRef<HTMLInputElement>(null);
  const [cardioBusy, setCardioBusy] = useState(false);

  async function onCardioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCardioBusy(true);
    try {
      const c = await scanCardio(file);
      const cx = EXERCISES.find((x) => x.category === 'Cardio' && c.machine.toLowerCase().includes(x.name.split(' ')[0].toLowerCase())) ?? EXERCISES.find((x) => x.category === 'Cardio')!;
      addCardioToActive(cx.id, c.durationMin, `${c.distanceKm}km · ${c.calories}kcal${c.avgPace ? ' · ' + c.avgPace : ''}`);
      haptic('success');
    } catch {
      haptic('warning');
    } finally {
      setCardioBusy(false);
      e.target.value = '';
    }
  }
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
  const recordHeavyLift = useGami((s) => s.recordHeavyLift);
  const heavyQuotesEnabled = useSettings((s) => s.heavyQuotesEnabled);
  const navigate = useNavigate();

  const [restOpen, setRestOpen] = useState(false);
  const [restSeed, setRestSeed] = useState(0);
  const [restNonce, setRestNonce] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subFor, setSubFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ weId: string; setId: string } | null>(null);
  const [linkMode, setLinkMode] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [drop, setDrop] = useState<Drop | null>(null);

  const totalVolume = active.exercises.reduce(
    (sum, we) => sum + we.sets.filter((s) => s.completed).reduce((a, s) => a + volumeOf(s.weightKg, s.reps), 0),
    0,
  );
  const completedSets = active.exercises.reduce((a, we) => a + we.sets.filter((s) => s.completed).length, 0);

  // Open the rest timer and (optionally) auto-start a countdown. Bumping the
  // nonce makes the timer restart even on back-to-back sets.
  function openRest(seconds = 0) {
    setRestSeed(seconds);
    setRestNonce((n) => n + 1);
    setRestOpen(true);
  }

  function handleComplete(weId: string, set: SetEntry) {
    if (set.completed) return;
    completeSet(weId, set.id);
    addXp(xpForSet(set.weightKg, set.reps, set.rpe ?? 7));
    bumpMetric('sets', 1);
    bumpMetric('volume', volumeOf(set.weightKg, set.reps));
    const restSec = active.exercises.find((e) => e.id === weId)?.restPresetSec ?? 90;
    // Heavy-set quote "drop" + achievement progress on 100kg+ lifts.
    if (set.weightKg >= 100) {
      recordHeavyLift();
      addXp(50);
      if (heavyQuotesEnabled) {
        const ex = exerciseById(active.exercises.find((e) => e.id === weId)?.exerciseId ?? '');
        setDrop({ quote: pickHeavyQuote(ex), rarity: rollRarity(), exercise: ex?.name ?? 'Lift', weightKg: set.weightKg });
      } else {
        openRest(restSec);
      }
    } else {
      openRest(restSec);
    }
  }

  function finish() {
    const res = finishWorkout();
    if (!res) return;
    const { newPrs } = res;
    registerSession();
    bumpMetric('pr', newPrs.length);
    haptic('success');
    setCelebrating(true);
    if (newPrs.length > 0) {
      // A real record beat — make it a moment.
      addXp(newPrs.length * 75);
      const headline = newPrs.length === 1
        ? `New PR! ${newPrs[0].exerciseName} ${Math.round(newPrs[0].e1rm)}kg 🏆`
        : `${newPrs.length} new PRs this session 🏆`;
      celebrate();
      toast(`${headline} · +${newPrs.length * 75} XP`);
      // Share the win with friends (respects the Share-activity preference).
      if (useSettings.getState().shareActivity) {
        const body = newPrs.length === 1
          ? `🏆 New PR: ${newPrs[0].exerciseName} — ${newPrs[0].weightKg}kg × ${newPrs[0].reps} (e1RM ${Math.round(newPrs[0].e1rm)}kg)`
          : `🏆 Smashed ${newPrs.length} PRs: ${newPrs.map((p) => p.exerciseName).join(', ')}`;
        useSocial.getState().publishPost(body);
      }
    } else {
      toast(`Session forged 🔥 ${completedSets} sets · ${Math.round(totalVolume).toLocaleString()} kg`);
    }
    setTimeout(() => navigate('/quests'), newPrs.length ? 2200 : 1500);
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
              <Button variant="ghost" className="justify-center py-2" onClick={() => openRest(we.restPresetSec ?? 90)}>
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
        <Button variant="ghost" className="flex-1 justify-center" disabled={cardioBusy} onClick={() => cardioRef.current?.click()}>
          <span className="flex items-center gap-1"><Camera size={16} /> {cardioBusy ? 'Reading…' : 'Cardio'}</span>
        </Button>
        <Button variant="ghost" className="justify-center" onClick={onOpenTools}><Wrench size={16} /></Button>
      </div>
      <input ref={cardioRef} type="file" accept="image/*" className="hidden" onChange={onCardioFile} />

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 justify-center" onClick={() => { discardWorkout(); navigate('/home'); }}>Discard</Button>
        <Button className="flex-1 justify-center" onClick={finish}>Finish 🔥</Button>
      </div>

      <RestTimer open={restOpen} onClose={() => setRestOpen(false)} autoStartSec={restSeed} nonce={restNonce} />
      <HeavyDrop drop={drop} onClose={() => { setDrop(null); openRest(90); }} />

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
