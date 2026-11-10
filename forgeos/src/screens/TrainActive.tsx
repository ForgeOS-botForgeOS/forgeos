import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wrench, Link2, Repeat, Flag, History, GripVertical, Camera, Star, Volume2, VolumeX, Crosshair, ChevronRight } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

import { Card, Button, Sheet, Badge } from '../components/ui';
import { SetRow } from '../components/train/SetRow';
import { isLoadedLift } from '../lib/exerciseKind';
import { formatElapsed } from '../lib/elapsed';
import { RestTimer } from '../components/train/RestTimer';
import { FocusHud } from '../components/train/FocusHud';
import { RaceBar } from '../components/train/RaceBar';
import { reportRaceProgress, raceWorkoutEnded } from '../lib/raceSession';
import { reportDuelWorkout } from '../lib/duelSync';
import { Tools } from '../components/train/Tools';
import { Confetti } from '../components/Celebrate';
import { toast, celebrate } from '../lib/toast';
import { askConfirm } from '../lib/dialog';

import { UploadError, uploadErrorMessage } from '../lib/upload';
import { HeavyDrop, type Drop } from '../components/HeavyDrop';
import { pickHeavyQuote, rollRarity } from '../data/heavyQuotes';
import { useT } from '../lib/i18n';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useSettings } from '../state/settingsStore';
import { useGami } from '../state/gamificationStore';
import { useSocial } from '../state/socialStore';
import { useExercises } from '../state/exerciseStore';
import { EXERCISES, exerciseById, EXERCISE_CATEGORIES } from '../data/exercises';
import { SubstituteList } from '../components/train/SubstituteList';

import { overloadSuggestion, volumeOf } from '../lib/fitness';
import { scanCardio } from '../lib/vision';

import { xpForSet } from '../data/ranks';
import { haptic } from '../lib/haptics';

import { speak, setCue } from '../lib/speech';
import { usePlayer } from '../state/playerStore';
import { MOCK_TRACKS } from '../lib/spotify';
import type { SetEntry } from '../types';

// The live workout: everything on screen between Start and Finish. Split out
// of Train.tsx, which had grown past a thousand lines.
// A big celebratory PR moment when a session sets new records.
function PrBurstOverlay({ data }: { data: { label: string; count: number } }) {
  const t = useT();
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center text-center px-8"
        initial={{ scale: 0.5, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15 }}
      >
        <motion.div className="text-6xl mb-3" animate={{ rotate: [0, -14, 12, -6, 0], scale: [1, 1.25, 1] }} transition={{ duration: 0.9, ease: 'easeOut' }}>🏆</motion.div>
        <p className="text-4xl font-extrabold italic uppercase tracking-tight text-accent-2 drop-shadow">{t('New PR!')}</p>
        <p className="text-lg font-semibold mt-1">{data.label}</p>
        {data.count > 1 && <p className="text-sm text-muted mt-1">{data.count} {t('records this session')}</p>}
      </motion.div>
    </motion.div>
  );
}

/** How long the session has been running, ticking once a second. */
function SessionClock({ startedAt }: { startedAt: string }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums" aria-label={t('Time elapsed')}>{formatElapsed(now - new Date(startedAt).getTime())}</span>;
}

/** Icon-only buttons in the session header: the glyph is small, the target is not. */
const ICON_BTN = 'grid place-items-center w-10 h-10 -my-1.5';

export function ActiveSession({ onOpenTools, toolsOpen, onCloseTools }: { onOpenTools: () => void; toolsOpen: boolean; onCloseTools: () => void }) {
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
    } catch (err) {
      haptic('warning');
      // A refused file has a reason worth reading; anything else stays quiet
      // because the screen already offers manual entry.
      if (err instanceof UploadError) toast(uploadErrorMessage(err), 'error');
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
  const restTimerEnabled = useSettings((s) => s.restTimerEnabled);
  const voiceCoach = useSettings((s) => s.voiceCoach);
  const setSetting = useSettings((s) => s.set);
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
  // The rest preset of the exercise whose 100kg+ lift raised a quote drop: the
  // timer waits for the drop to be dismissed, and then has to start from the
  // right number rather than a hardcoded 90s.
  const pendingRestSec = useRef(90);
  const [prBurst, setPrBurst] = useState<{ label: string; count: number } | null>(null);
  // Focus mode: the HUD takes the whole screen for one set at a time.
  const [focusMode, setFocusMode] = useState(false);
  const t = useT();

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
    reportRaceProgress(); // live race: broadcast the set to every rival
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
        pendingRestSec.current = restSec;
        setDrop({ quote: pickHeavyQuote(ex), rarity: rollRarity(), exercise: ex?.name ?? 'Lift', weightKg: set.weightKg });
      } else if (restTimerEnabled) {
        openRest(restSec);
      }
    } else if (restTimerEnabled) {
      openRest(restSec);
    }

    // Voice cue: read the next set aloud, hands-free.
    if (useSettings.getState().voiceCoach) {
      const a = useWorkout.getState().active;
      for (const we2 of a?.exercises ?? []) {
        const nextSet = we2.sets.find((st) => !st.completed);
        if (nextSet) { speak(setCue(exerciseById(we2.exerciseId)?.name ?? 'Next set', nextSet.weightKg, nextSet.reps)); break; }
      }
    }
  }

  function finish() {
    raceWorkoutEnded(); // report final progress / leave an undecided race
    // Auto-tag any PRs with whatever's playing in the CD player ("...to Till I Collapse").
    const nowPlaying = usePlayer.getState().active ? MOCK_TRACKS[usePlayer.getState().index] : null;
    const res = finishWorkout(nowPlaying);
    if (!res) return;
    reportDuelWorkout(res.workout); // active duels advance by what you really did
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
      setPrBurst({ label: newPrs.length === 1 ? `${newPrs[0].exerciseName} · ${newPrs[0].weightKg}kg` : `${newPrs.length} new records`, count: newPrs.length });
      toast(`${headline} · +${newPrs.length * 75} XP`);
      // Share the win with friends (respects the Share-activity preference).
      if (useSettings.getState().shareActivity) {
        const base = newPrs.length === 1
          ? `🏆 New PR: ${newPrs[0].exerciseName}: ${newPrs[0].weightKg}kg × ${newPrs[0].reps} (e1RM ${Math.round(newPrs[0].e1rm)}kg)`
          : `🏆 Smashed ${newPrs.length} PRs: ${newPrs.map((p) => p.exerciseName).join(', ')}`;
        const body = nowPlaying ? `${base} 🎧 to ${nowPlaying.title}` : base;
        useSocial.getState().publishPost(body);
      }
    } else {
      toast(`Session forged 🔥 ${completedSets} sets · ${Math.round(totalVolume).toLocaleString()} kg`);
    }
    setTimeout(() => navigate('/quests'), newPrs.length ? 2200 : 1500);
  }

  async function discard() {
    if (completedSets > 0) {
      const ok = await askConfirm({
        title: 'Discard this workout?',
        body: `${completedSets} completed ${completedSets === 1 ? 'set' : 'sets'} will be lost. This cannot be undone.`,
        confirmLabel: 'Discard',
        cancelLabel: 'Keep training',
        tone: 'danger',
      });
      if (!ok) return;
    }
    raceWorkoutEnded();
    discardWorkout();
    navigate('/home');
  }

  return (
    <div className="px-4 pt-12 pb-32 space-y-4">
      {celebrating && <Confetti />}
      <AnimatePresence>{prBurst && <PrBurstOverlay data={prBurst} />}</AnimatePresence>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{active.name}</h1>
          <p className="text-sm text-muted"><SessionClock startedAt={active.date} /> · {completedSets} {t('sets ·')} {Math.round(totalVolume).toLocaleString()} kg</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFocusMode(true); haptic('tap'); }}
            aria-label={t('focus.enter')}
            title={t('focus.enter')}
            className="grid place-items-center w-10 h-10"
          >
            <Crosshair size={18} className="text-accent-2" />
          </button>
          <button
            onClick={() => { const v = !voiceCoach; setSetting('voiceCoach', v); haptic('tap'); if (v) speak('Voice cues on'); }}
            aria-label={voiceCoach ? t('Turn off voice cues') : t('Turn on voice cues')}
            className="grid place-items-center w-10 h-10"
          >
            {voiceCoach ? <Volume2 size={18} className="text-accent" /> : <VolumeX size={18} className="text-muted" />}
          </button>
          <Badge color="rgb(var(--success))">{t('LIVE')}</Badge>
        </div>
      </header>

      <RaceBar />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={active.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
      {active.exercises.map((we) => {
        const ex = exerciseById(we.exerciseId);
        const last = we.sets[we.sets.length - 1];
        const loaded = !ex || isLoadedLift(ex);
        // Progression advice is about adding load; it means nothing for a run.
        // It is read from what you did LAST session, not from the set on screen:
        // keyed to the live set, applying "+2.5 kg" just produced another "+2.5 kg".
        const prev = last && loaded ? lastSetFor(we.exerciseId, we.sets.length - 1) : undefined;
        const suggestion = prev ? overloadSuggestion(prev.weightKg, prev.reps, prev.reps, prev.rpe) : null;
        const open = we.sets.filter((x) => !x.completed);
        const canApply = suggestion != null && open.some((x) => x.weightKg !== suggestion.weightKg || x.reps !== suggestion.reps);
        return (
          <Sortable key={we.id} id={we.id}>
            {(handle) => (
            <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button {...handle} aria-label={t('Drag to reorder this exercise')} className="text-muted cursor-grab active:cursor-grabbing touch-none" title={t('Drag to reorder')}><GripVertical size={16} /></button>
                {/* The lift's name is the way into its detail page — cues, your
                    history, PR and progression for exactly this movement. */}
                <button onClick={() => navigate(`/exercise/${we.exerciseId}`)} className="flex items-center gap-0.5 text-left">
                  <span className="font-semibold">{ex?.name ?? t('Exercise')}</span>
                  <ChevronRight size={14} className="text-muted" />
                </button>
                {we.supersetGroup && <Badge color="rgb(var(--accent-2))">{t('superset')}</Badge>}
              </div>
              <div className="flex items-center text-muted">
                <button onClick={() => setSubFor(we.id)} title={t('Substitute')} aria-label={`Swap ${ex?.name ?? 'exercise'} for another`} className={ICON_BTN}><Repeat size={16} /></button>
                <button
                  onClick={() => setLinkMode((m) => (m.includes(we.id) ? m.filter((x) => x !== we.id) : [...m, we.id]))}
                  title={t('Link superset')}
                  aria-label={t('Link as a superset')}
                  aria-pressed={linkMode.includes(we.id)}
                  className={`${ICON_BTN} ${linkMode.includes(we.id) ? 'text-accent-2' : ''}`}
                >
                  <Link2 size={16} />
                </button>
                <button onClick={() => removeExercise(we.id)} title={t('Remove')} aria-label={`Remove ${ex?.name ?? 'exercise'}`} className={ICON_BTN}>✕</button>
              </div>
            </div>

            <div className="space-y-1.5">
              {we.sets.map((s, i) => (
                <SetRow
                  key={s.id}
                  set={s}
                  index={i}
                  ghost={lastSetFor(we.exerciseId, i)}
                  timed={!loaded}
                  onChange={(patch) => updateSet(we.id, s.id, patch)}
                  onComplete={() => handleComplete(we.id, s)}
                  onDelete={() => removeSet(we.id, s.id)}
                  onLongPress={() => setNoteFor({ weId: we.id, setId: s.id })}
                />
              ))}
            </div>

            {suggestion && (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-accent-2 flex items-center gap-1"><Flag size={12} className="shrink-0" /> {t(suggestion.note)}</p>
                {canApply && (
                  <button
                    onClick={() => { open.forEach((x) => updateSet(we.id, x.id, { weightKg: suggestion.weightKg, reps: suggestion.reps })); haptic('success'); }}
                    className="shrink-0 rounded-full bg-accent-2/12 px-3 min-h-[36px] text-xs font-semibold text-accent-2 active:scale-95 transition"
                  >
                    {t('Use')} {suggestion.weightKg} kg × {suggestion.reps}
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 justify-center py-2" onClick={() => addSet(we.id)}>
                <span className="flex items-center gap-1 text-xs"><Plus size={14} /> {t('Set')}</span>
              </Button>
              <Button variant="ghost" className="justify-center py-2" onClick={() => openRest(we.restPresetSec ?? 90)}>
                <span className="text-xs">{t('Rest')}</span>
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
          {t('Link')} {linkMode.length} {t('exercises as a superset')}
        </Button>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => setPickerOpen(true)}>
          <span className="flex items-center gap-1"><Plus size={16} /> {t('Exercise')}</span>
        </Button>
        <Button variant="ghost" className="flex-1 justify-center" disabled={cardioBusy} onClick={() => cardioRef.current?.click()}>
          <span className="flex items-center gap-1"><Camera size={16} /> {cardioBusy ? t('Reading…') : t('Cardio')}</span>
        </Button>
        <Button variant="ghost" className="justify-center" onClick={onOpenTools}><Wrench size={16} /></Button>
      </div>
      <input ref={cardioRef} type="file" accept="image/*" className="hidden" onChange={onCardioFile} />

      {/* Finish is the one thing to hit here. Discard throws the session away,
          so it sits apart, looks quiet, and asks first once there is work to lose. */}
      <Button className="w-full justify-center py-3.5" onClick={finish}>{t('Finish workout 🔥')}</Button>
      <button onClick={() => void discard()} className="mx-auto block min-h-[44px] px-4 text-xs text-muted underline underline-offset-2">{t('Discard this workout')}</button>

      <FocusHud
        open={focusMode}
        onExit={() => setFocusMode(false)}
        onComplete={handleComplete}
        onFinish={() => { setFocusMode(false); finish(); }}
      />

      <RestTimer open={restOpen} onClose={() => setRestOpen(false)} autoStartSec={restSeed} nonce={restNonce} />
      <HeavyDrop drop={drop} onClose={() => { setDrop(null); if (restTimerEnabled) openRest(pendingRestSec.current); }} />

      {/* Exercise picker */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('Add exercise')}>
        <ExercisePicker onPick={(id) => { addExercise(id); setPickerOpen(false); haptic('tap'); }} />
      </Sheet>

      {/* Substitution */}
      <Sheet open={!!subFor} onClose={() => setSubFor(null)} title={t('Substitute exercise')}>
        {subFor && (() => {
          const base = exerciseById(active.exercises.find((e) => e.id === subFor)?.exerciseId ?? '');
          return base
            ? <SubstituteList key={subFor} base={base} onPick={(id) => { swapExercise(subFor, id); setSubFor(null); }} />
            : <p className="text-sm text-muted">{t('This exercise is no longer in the library.')}</p>;
        })()}
      </Sheet>

      {/* Long-press: note / history / swap */}
      <Sheet open={!!noteFor} onClose={() => setNoteFor(null)} title={t('Set options')}>
        {noteFor && (
          <div className="space-y-3">
            <textarea
              placeholder={t('Add a note (form cue, pain, tempo)…')}
              defaultValue={active.exercises.find((e) => e.id === noteFor.weId)?.sets.find((s) => s.id === noteFor.setId)?.note ?? ''}
              onChange={(e) => updateSet(noteFor.weId, noteFor.setId, { note: e.target.value })}
              className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-24"
            />
            <button onClick={() => { setSubFor(noteFor.weId); setNoteFor(null); }} className="w-full text-left flex items-center gap-2 text-sm py-2"><Repeat size={15} /> {t('Swap exercise')}</button>
            <button onClick={() => setNoteFor(null)} className="w-full text-left flex items-center gap-2 text-sm py-2"><History size={15} /> {t('Close (history shown as 👻 ghost on each set)')}</button>
          </div>
        )}
      </Sheet>

      <Sheet open={toolsOpen} onClose={onCloseTools} title={t('Lifting tools')}><Tools /></Sheet>
      <p className="text-center text-[11px] text-muted/60">{t('Swipe a set → to complete, ← to delete · long-press for notes · bodyweight')} {bodyweight}{t('kg used for rank scoring')}</p>
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

const EQUIP_PRESETS = ['Any', 'Home', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'];
const HOME_OK = ['Bodyweight', 'Dumbbell', 'Band', 'Kettlebell', 'Rings'];

function ExercisePicker({ onPick }: { onPick: (id: string) => void }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [equip, setEquip] = useState<string>('Any');
  const history = useWorkout((s) => s.history);
  const favIds = useExercises((s) => s.favouriteIds);
  const toggleFav = useExercises((s) => s.toggleFavourite);

  const equipOk = (eq: string) => equip === 'Any' || (equip === 'Home' ? HOME_OK.includes(eq) : eq === equip);
  const list = EXERCISES.filter(
    (e) => (cat === 'All' || e.category === cat) && equipOk(e.equipment) && e.name.toLowerCase().includes(q.toLowerCase()),
  ).slice(0, 40);

  // Quick-pick rails (only when you're not searching/filtering): the exercises
  // you use most recently, and the ones you starred.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof EXERCISES = [];
    for (const w of history) {
      for (const we of w.exercises) {
        if (seen.has(we.exerciseId)) continue;
        seen.add(we.exerciseId);
        const ex = exerciseById(we.exerciseId);
        if (ex) out.push(ex);
        if (out.length >= 8) return out;
      }
    }
    return out;
  }, [history]);
  const favourites = useMemo(
    () => favIds.map((id) => exerciseById(id)).filter((e): e is NonNullable<typeof e> => !!e),
    [favIds],
  );
  const showQuick = q.trim() === '' && cat === 'All' && equip === 'Any';

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search exercises…')} className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />

      {showQuick && favourites.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted mb-1.5 flex items-center gap-1"><Star size={11} className="text-accent-2" /> {t('Favourites')}</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {favourites.map((e) => <button key={e.id} onClick={() => onPick(e.id)} className="whitespace-nowrap rounded-full bg-accent-2/15 text-accent-2 px-3 py-1 text-xs">{e.name}</button>)}
          </div>
        </div>
      )}
      {showQuick && recent.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted mb-1.5">{t('Recent')}</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {recent.map((e) => <button key={e.id} onClick={() => onPick(e.id)} className="whitespace-nowrap rounded-full bg-surface-2 text-muted px-3 py-1 text-xs">{e.name}</button>)}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {EQUIP_PRESETS.map((eqp) => (
          <button key={eqp} onClick={() => setEquip(eqp)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${equip === eqp ? 'bg-accent-2 text-black' : 'bg-surface-2 text-muted'}`}>{eqp === 'Home' ? t('🏠 Home') : eqp}</button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['All', ...EXERCISE_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${cat === c ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
        {list.map((e) => {
          const fav = favIds.includes(e.id);
          return (
            <div key={e.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5">
              <button onClick={() => onPick(e.id)} className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted">{e.primary} · {e.equipment}</p>
              </button>
              <button onClick={() => { toggleFav(e.id); haptic('tap'); }} aria-label={fav ? t('Unfavourite') : t('Favourite')} className={fav ? 'text-accent-2 shrink-0' : 'text-muted shrink-0'}>
                <Star size={16} className={fav ? 'fill-accent-2' : ''} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
