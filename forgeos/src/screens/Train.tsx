import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Plus, Wrench, Link2, Repeat, AlertTriangle, Brain, Flag, History, GripVertical, Camera, Watch, Moon, HeartPulse, Star, Volume2, VolumeX, Crosshair, ChevronRight } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { Screen } from '../components/Screen';
import { Card, Button, Sheet, Badge, SectionTitle, Pill } from '../components/ui';
import { SetRow } from '../components/train/SetRow';
import { RestTimer } from '../components/train/RestTimer';
import { FocusHud } from '../components/train/FocusHud';
import { RaceBar } from '../components/train/RaceBar';
import { reportRaceProgress, raceWorkoutEnded } from '../lib/raceSession';
import { reportDuelWorkout } from '../lib/duelSync';
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
import { useExercises } from '../state/exerciseStore';
import { EXERCISES, exerciseById, substitutesFor, EXERCISE_CATEGORIES } from '../data/exercises';
import { detectPlateaus, recommendBlock, trainingLoadWarning } from '../lib/analytics';
import { readinessFromDays, trainingGuidance, recoveryTrend, overtrainingRisk } from '../lib/readiness';
import { ReadinessChip } from '../components/Readiness';
import { useHealth, sortedDays } from '../state/healthStore';
import { overloadSuggestion, volumeOf } from '../lib/fitness';
import { scanCardio, type CardioSource } from '../lib/vision';
import { CardioFields } from '../components/CardioForm';
import { newCardioData, metricTypeFor, primaryValueLabel, type CardioData } from '../lib/cardio';
import { xpForSet } from '../data/ranks';
import { haptic } from '../lib/haptics';
import { personalTips } from '../lib/personalCoach';
import { speak, setCue } from '../lib/speech';
import { usePlayer } from '../state/playerStore';
import { MOCK_TRACKS } from '../lib/spotify';
import type { SetEntry, Workout } from '../types';

export default function Train() {
  const active = useWorkout((s) => s.active);
  const history = useWorkout((s) => s.history);
  const profile = useUser((s) => s.profile);
  const weekPlan = useUser((s) => s.weekPlan);
  const tips = useMemo(() => personalTips(profile, 3), [profile]);
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
  const v2 = useSettings((s) => s.designMode === 'v2');
  const healthDays = useHealth((s) => s.days);
  const readiness = useMemo(() => (recoveryEnabled ? readinessFromDays(sortedDays(healthDays)) : null), [recoveryEnabled, healthDays]);
  const otRisk = useMemo(
    () => (recoveryEnabled ? overtrainingRisk(recoveryTrend(sortedDays(healthDays))) : null),
    [recoveryEnabled, healthDays],
  );
  // The week's lightest non-rest session (fewest exercises) — swap target on bad days.
  const lightDay = useMemo(() => {
    const days = weekPlan?.days.filter((d) => !d.rest && d.exerciseIds.length > 0) ?? [];
    return days.length ? [...days].sort((a, b) => a.exerciseIds.length - b.exerciseIds.length)[0] : null;
  }, [weekPlan]);

  const todayPlan = useMemo(() => {
    if (!weekPlan) return null;
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = map[new Date().getDay()];
    return weekPlan.days.find((d) => d.day === today) ?? null;
  }, [weekPlan]);

  if (active) return <ActiveSession onOpenTools={() => setToolsOpen(true)} toolsOpen={toolsOpen} onCloseTools={() => setToolsOpen(false)} />;

  return (
    <Screen title={t('train.title')} subtitle={t('train.subtitle')}>
      {/* V2 "Readiness console" pre-workout top: readiness meter + compact launcher
          + coaching ledger. Same data/handlers as Legacy, reorganised. */}
      {v2 && (
        <>
          {readiness && (() => {
            const guide = trainingGuidance(readiness.level);
            const pct = Math.round((guide.multiplier - 1) * 100);
            const loadLabel = guide.multiplier === 0 ? 'rest day' : pct === 0 ? 'as planned' : `${pct > 0 ? '+' : ''}${pct}%`;
            return (
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Readiness</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-mono font-bold text-3xl leading-none">{readiness.score}</span>
                      <span className="uppercase tracking-wide text-sm" style={{ color: readiness.color }}>{readiness.label}</span>
                    </div>
                  </div>
                  <Badge color={readiness.color}>load: {loadLabel}</Badge>
                </div>
                <div className="v2-meter mt-3" style={{ height: 12 }}>
                  <div className="v2-meter-fill" style={{ width: `${readiness.score}%`, background: readiness.color }} />
                  <div className="v2-meter-seg" />
                </div>
                <p className="text-sm mt-2 font-semibold" style={{ color: readiness.color }}>{guide.headline}</p>
                <p className="text-[12px] text-muted">{guide.detail}</p>
                {(readiness.level === 'rundown' || readiness.level === 'rest') && lightDay && todayPlan && !todayPlan.rest && lightDay.label !== todayPlan.label && (
                  <Button variant="outline" className="w-full justify-center mt-2 py-1.5" onClick={() => { startWorkout(`${lightDay.label} (light)`, lightDay.exerciseIds, { targets: lightDay.targets, maxWeightKg: gymMax }); haptic('success'); toast(`Swapped to ${lightDay.label} — listen to your body 🙏`); }}>
                    Swap today for {lightDay.label} ({lightDay.exerciseIds.length} lifts)
                  </Button>
                )}
              </Card>
            );
          })()}

          <Card className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Today</p>
              <p className="font-bold uppercase italic text-xl leading-tight truncate">{todayPlan && !todayPlan.rest ? todayPlan.label : todayPlan?.rest ? 'Rest day' : 'No plan'}</p>
            </div>
            {todayPlan && !todayPlan.rest ? (
              <Button className="shrink-0" onClick={() => { startWorkout(todayPlan.label, todayPlan.exerciseIds, { targets: todayPlan.targets, maxWeightKg: gymMax }); haptic('success'); }}>
                <span className="flex items-center gap-1.5"><Dumbbell size={15} /> Start</span>
              </Button>
            ) : (
              <Button variant="outline" className="shrink-0" onClick={() => { startWorkout('Freestyle session'); haptic('success'); }}>Start</Button>
            )}
          </Card>
          <Button variant="ghost" className="w-full justify-center" onClick={() => setCustomOpen(true)}>
            <span className="flex items-center gap-2"><Plus size={16} /> Start a custom workout</span>
          </Button>

          <Card>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1">Coaching</p>
            <LedgerRow k="Next block" v={<span className="capitalize">{rec.nextBlock}</span>} />
            <LedgerRow k="Avg RPE" v={rec.avgRpe || '—'} />
            <LedgerRow k="Volume · wk" v={`${rec.weeklyVolume.toLocaleString()} kg`} />
          </Card>
        </>
      )}

      {/* Today's plan (Legacy) */}
      {!v2 && (
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
      )}

      <CustomWorkoutSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onStart={(name) => { startWorkout(name); setCustomOpen(false); haptic('success'); toast(`“${name}” started 💪`); }}
        pastWorkouts={history.filter((w) => !w.cardio && w.exercises.length > 0).slice(0, 8)}
        onRepeat={(id) => { if (repeatWorkout(id)) { setCustomOpen(false); haptic('success'); toast('Loaded a past session 💪'); } }}
      />

      {/* Your coach — tailored to what you told us at sign-up (goal, experience, the words you typed) */}
      {tips.length > 0 && (
        <Card className="space-y-2 border-accent-2/30 bg-accent-2/5">
          <p className="text-xs uppercase tracking-wide text-muted">Your coach</p>
          {tips.map((tip) => (
            <p key={tip.text} className="text-sm flex items-start gap-2">
              <span className="shrink-0">{tip.icon}</span>
              <span>{tip.text}</span>
            </p>
          ))}
        </Card>
      )}

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

      {/* Recovery readiness — last night's data steering today's effort (Legacy;
          V2 shows this as the readiness console at the top). */}
      {!v2 && readiness && (() => {
        const guide = trainingGuidance(readiness.level);
        const pct = Math.round((guide.multiplier - 1) * 100);
        const loadLabel = guide.multiplier === 0 ? 'rest day' : pct === 0 ? 'load: as planned' : `load: ${pct > 0 ? '+' : ''}${pct}%`;
        return (
          <Card className="flex items-start gap-3" style={{ borderColor: readiness.color }}>
            <Moon size={18} className="mt-0.5 shrink-0" style={{ color: readiness.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-muted">Today’s readiness</span>
                <ReadinessChip r={readiness} />
                <Badge color={readiness.color}>{loadLabel}</Badge>
              </div>
              <p className="text-sm mt-1 font-semibold" style={{ color: readiness.color }}>{guide.headline}</p>
              <p className="text-[12px] text-muted">{guide.detail}</p>
              {/* Smart swap: when run down, offer the week's lightest session instead */}
              {(readiness.level === 'rundown' || readiness.level === 'rest') && lightDay && todayPlan && !todayPlan.rest && lightDay.label !== todayPlan.label && (
                <Button variant="outline" className="w-full justify-center mt-2 py-1.5" onClick={() => { startWorkout(`${lightDay.label} (light)`, lightDay.exerciseIds, { targets: lightDay.targets, maxWeightKg: gymMax }); haptic('success'); toast(`Swapped to ${lightDay.label} — listen to your body 🙏`); }}>
                  Swap today for {lightDay.label} ({lightDay.exerciseIds.length} lifts)
                </Button>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Overtraining alarm — sustained recovery red flags, not one bad night */}
      {otRisk && otRisk.level !== 'ok' && (
        <Card className={`flex gap-3 items-start ${otRisk.level === 'high' ? 'border-danger/60' : 'border-warn/50'}`}>
          <HeartPulse size={18} className={`mt-0.5 shrink-0 ${otRisk.level === 'high' ? 'text-danger' : 'text-warn'}`} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{otRisk.level === 'high' ? 'Take a deload week' : 'Recovery watch'}</p>
            {otRisk.reasons.map((r) => <p key={r} className="text-sm mt-1">{r}</p>)}
            <p className="text-[11px] text-muted mt-1">{otRisk.level === 'high' ? 'Drop weights ~40% for a few sessions — you’ll come back stronger.' : 'Nothing drastic — just keep an eye on sleep this week.'}</p>
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

      {/* Adaptive periodisation (Legacy — V2 folds this into the coaching ledger) */}
      {!v2 && (
      <Card className="flex gap-3 items-start">
        <Brain size={18} className="text-accent-2 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Periodisation engine</p>
          <p className="text-sm mt-1">Next block: <b className="capitalize">{rec.nextBlock}</b></p>
          <p className="text-xs text-muted mt-1">{rec.reason}</p>
          <p className="text-[11px] text-muted/70 mt-1">avg RPE {rec.avgRpe || '—'} · ~{rec.weeklyVolume.toLocaleString()} kg/wk</p>
        </div>
      </Card>
      )}

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

// XP reward for a cardio / sport session — the primary metric (distance, laps,
// climbing grade, or intensity) plus time, like a lift earns from weight × reps.
function cardioXp(activity: string, primary: number, durationMin: number, calories = 0) {
  const type = metricTypeFor(activity);
  const primaryBonus = type === 'distance' ? primary * 15
    : type === 'laps' ? primary * 3
    : type === 'grade' ? primary * 10
    : primary * 8; // intensity
  return Math.round(primaryBonus + durationMin * 4 + calories / 8) + 20;
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
    if (metricTypeFor(machine) === 'distance') bumpMetric('volume', Math.round(distanceKm * 1000)); // distance counts toward volume quests
    const xp = cardioXp(machine, distanceKm, durationMin, calories) + (distancePR ? 60 : 0) + (durationPR ? 40 : 0);
    addXp(xp);
    if (distancePR || durationPR) {
      celebrate();
      toast(`${machine} PR! ${distancePR ? primaryValueLabel(machine, distanceKm) : `${Math.round(durationMin)}min`} 🏆 +${xp} XP`);
    } else {
      haptic('success');
      toast(`${machine} logged 🏃 ${primaryValueLabel(machine, distanceKm)} · ${Math.round(durationMin)}min · +${xp} XP`);
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

function CustomWorkoutSheet({ open, onClose, onStart, pastWorkouts, onRepeat }: { open: boolean; onClose: () => void; onStart: (name: string) => void; pastWorkouts: Workout[]; onRepeat: (id: string) => void }) {
  const [name, setName] = useState('');
  const favouriteIds = useWorkout((s) => s.favouriteIds);
  const toggleFavourite = useWorkout((s) => s.toggleFavourite);
  const suggestions = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Arms', 'Chest & Back', 'Conditioning'];
  // Favourites float to the top of the list.
  const sortedPast = [...pastWorkouts].sort((a, b) => Number(favouriteIds.includes(b.id)) - Number(favouriteIds.includes(a.id)));
  return (
    <Sheet open={open} onClose={onClose} title="Custom workout">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">Name a fresh session — add exercises as you go.</p>
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

        {sortedPast.length > 0 && (
          <div className="pt-3 border-t border-line space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted">Or repeat a past session — ★ to favourite, weights pre-filled</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {sortedPast.map((w) => {
                const fav = favouriteIds.includes(w.id);
                return (
                  <div key={w.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
                    <button onClick={() => { toggleFavourite(w.id); haptic('tap'); }} aria-label={fav ? 'Unfavourite' : 'Favourite'} className={fav ? 'text-accent-2 shrink-0' : 'text-muted shrink-0'}>
                      <Star size={16} className={fav ? 'fill-accent-2' : ''} />
                    </button>
                    <button onClick={() => onRepeat(w.id)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <p className="text-[11px] text-muted">{w.exercises.length} exercises · {new Date(w.date).toLocaleDateString()}</p>
                    </button>
                    <span className="flex items-center gap-1 text-xs text-accent shrink-0"><Repeat size={13} /> Load</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// A big celebratory PR moment when a session sets new records.
function PrBurstOverlay({ data }: { data: { label: string; count: number } }) {
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
        <p className="text-4xl font-extrabold italic uppercase tracking-tight text-accent-2 drop-shadow">New PR!</p>
        <p className="text-lg font-semibold mt-1">{data.label}</p>
        {data.count > 1 && <p className="text-sm text-muted mt-1">{data.count} records this session</p>}
      </motion.div>
    </motion.div>
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
          ? `🏆 New PR: ${newPrs[0].exerciseName} — ${newPrs[0].weightKg}kg × ${newPrs[0].reps} (e1RM ${Math.round(newPrs[0].e1rm)}kg)`
          : `🏆 Smashed ${newPrs.length} PRs: ${newPrs.map((p) => p.exerciseName).join(', ')}`;
        const body = nowPlaying ? `${base} 🎧 to ${nowPlaying.title}` : base;
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
      <AnimatePresence>{prBurst && <PrBurstOverlay data={prBurst} />}</AnimatePresence>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{active.name}</h1>
          <p className="text-sm text-muted">{completedSets} sets · {Math.round(totalVolume).toLocaleString()} kg</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFocusMode(true); haptic('tap'); }}
            aria-label={t('focus.enter')}
            title={t('focus.enter')}
            className="p-1"
          >
            <Crosshair size={18} className="text-accent-2" />
          </button>
          <button
            onClick={() => { const v = !voiceCoach; setSetting('voiceCoach', v); haptic('tap'); if (v) speak('Voice cues on'); }}
            aria-label={voiceCoach ? 'Turn off voice cues' : 'Turn on voice cues'}
            className="p-1"
          >
            {voiceCoach ? <Volume2 size={18} className="text-accent" /> : <VolumeX size={18} className="text-muted" />}
          </button>
          <Badge color="rgb(var(--success))">LIVE</Badge>
        </div>
      </header>

      <RaceBar />

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
                {/* The lift's name is the way into its detail page — cues, your
                    history, PR and progression for exactly this movement. */}
                <button onClick={() => navigate(`/exercise/${we.exerciseId}`)} className="flex items-center gap-0.5 text-left">
                  <span className="font-semibold">{ex?.name ?? 'Exercise'}</span>
                  <ChevronRight size={14} className="text-muted" />
                </button>
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
        <Button variant="outline" className="flex-1 justify-center" onClick={() => { raceWorkoutEnded(); discardWorkout(); navigate('/home'); }}>Discard</Button>
        <Button className="flex-1 justify-center" onClick={finish}>Finish 🔥</Button>
      </div>

      <FocusHud
        open={focusMode}
        onExit={() => setFocusMode(false)}
        onComplete={handleComplete}
        onFinish={() => { setFocusMode(false); finish(); }}
      />

      <RestTimer open={restOpen} onClose={() => setRestOpen(false)} autoStartSec={restSeed} nonce={restNonce} />
      <HeavyDrop drop={drop} onClose={() => { setDrop(null); if (restTimerEnabled) openRest(90); }} />

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

// Leader-dot "ledger" row for the V2 Train coaching panel.
function LedgerRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-2">
      <span className="text-[11px] uppercase tracking-wide text-muted whitespace-nowrap">{k}</span>
      <span className="flex-1 self-center border-b border-dotted border-line" />
      <span className="text-sm font-mono whitespace-nowrap">{v}</span>
    </div>
  );
}

const EQUIP_PRESETS = ['Any', 'Home', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'];
const HOME_OK = ['Bodyweight', 'Dumbbell', 'Band', 'Kettlebell', 'Rings'];

function ExercisePicker({ onPick }: { onPick: (id: string) => void }) {
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
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />

      {showQuick && favourites.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted mb-1.5 flex items-center gap-1"><Star size={11} className="text-accent-2" /> Favourites</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {favourites.map((e) => <button key={e.id} onClick={() => onPick(e.id)} className="whitespace-nowrap rounded-full bg-accent-2/15 text-accent-2 px-3 py-1 text-xs">{e.name}</button>)}
          </div>
        </div>
      )}
      {showQuick && recent.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted mb-1.5">Recent</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {recent.map((e) => <button key={e.id} onClick={() => onPick(e.id)} className="whitespace-nowrap rounded-full bg-surface-2 text-muted px-3 py-1 text-xs">{e.name}</button>)}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {EQUIP_PRESETS.map((eqp) => (
          <button key={eqp} onClick={() => setEquip(eqp)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${equip === eqp ? 'bg-accent-2 text-black' : 'bg-surface-2 text-muted'}`}>{eqp === 'Home' ? '🏠 Home' : eqp}</button>
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
              <button onClick={() => { toggleFav(e.id); haptic('tap'); }} aria-label={fav ? 'Unfavourite' : 'Favourite'} className={fav ? 'text-accent-2 shrink-0' : 'text-muted shrink-0'}>
                <Star size={16} className={fav ? 'fill-accent-2' : ''} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
