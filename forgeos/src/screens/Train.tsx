import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Dumbbell, Plus, Wrench, Repeat, AlertTriangle, Brain, History, Camera, Watch, Moon, HeartPulse, BookmarkPlus } from 'lucide-react';

import type { ReactNode } from 'react';
import { Screen } from '../components/Screen';
import { Card, Button, Sheet, Badge, SectionTitle, Pill } from '../components/ui';

import { ActiveSession } from './TrainActive';

import { Tools } from '../components/train/Tools';

import { toast, celebrate } from '../lib/toast';
import { askText } from '../lib/dialog';
import { ROUTINE_NAME_MAX } from '../lib/routines';
import { RoutinesCard } from '../components/train/RoutinesCard';

import { useT } from '../lib/i18n';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { useSettings } from '../state/settingsStore';
import { useGami } from '../state/gamificationStore';

import { exerciseById } from '../data/exercises';

import { detectPlateaus, recommendBlock, trainingLoadWarning } from '../lib/analytics';
import { readinessFromDays, trainingGuidance, recoveryTrend, overtrainingRisk } from '../lib/readiness';
import { ReadinessChip } from '../components/Readiness';
import { useHealth, sortedDays } from '../state/healthStore';

import { scanCardio, type CardioSource } from '../lib/vision';
import { CardioFields } from '../components/CardioForm';
import { newCardioData, metricTypeFor, primaryValueLabel, type CardioData } from '../lib/cardio';

import { haptic } from '../lib/haptics';
import { personalTips } from '../lib/personalCoach';

import type { Workout } from '../types';

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
  // Apprentice Mode keeps the one thing this screen is for — starting today's
  // session — and hides the coaching layers that only mean something once you
  // have months of data: readiness, periodisation, plateaus, load warnings.
  const simple = useSettings((s) => s.apprentice);
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
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('Readiness')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-mono font-bold text-3xl leading-none">{readiness.score}</span>
                      <span className="uppercase tracking-wide text-sm" style={{ color: readiness.color }}>{readiness.label}</span>
                    </div>
                  </div>
                  <Badge color={readiness.color}>{t('load:')} {loadLabel}</Badge>
                </div>
                <div className="v2-meter mt-3" style={{ height: 12 }}>
                  <div className="v2-meter-fill" style={{ width: `${readiness.score}%`, background: readiness.color }} />
                  <div className="v2-meter-seg" />
                </div>
                <p className="text-sm mt-2 font-semibold" style={{ color: readiness.color }}>{guide.headline}</p>
                <p className="text-[12px] text-muted">{guide.detail}</p>
                {(readiness.level === 'rundown' || readiness.level === 'rest') && lightDay && todayPlan && !todayPlan.rest && lightDay.label !== todayPlan.label && (
                  <Button variant="outline" className="w-full justify-center mt-2 py-1.5" onClick={() => { startWorkout(`${lightDay.label} (light)`, lightDay.exerciseIds, { targets: lightDay.targets, maxWeightKg: gymMax }); haptic('success'); toast(`Swapped to ${lightDay.label}: listen to your body 🙏`); }}>
                    {t('Swap today for')} {lightDay.label} ({lightDay.exerciseIds.length} {t('lifts)')}
                  </Button>
                )}
              </Card>
            );
          })()}

          <Card className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{t('Today')}</p>
              <p className="font-bold uppercase italic text-xl leading-tight truncate">{todayPlan && !todayPlan.rest ? todayPlan.label : todayPlan?.rest ? t('Rest day') : t('No plan')}</p>
            </div>
            {todayPlan && !todayPlan.rest ? (
              <Button className="shrink-0" onClick={() => { startWorkout(todayPlan.label, todayPlan.exerciseIds, { targets: todayPlan.targets, maxWeightKg: gymMax }); haptic('success'); }}>
                <span className="flex items-center gap-1.5"><Dumbbell size={15} /> {t('Start')}</span>
              </Button>
            ) : (
              <Button variant="outline" className="shrink-0" onClick={() => { startWorkout('Freestyle session'); haptic('success'); }}>{t('Start')}</Button>
            )}
          </Card>
          <Button variant="ghost" className="w-full justify-center" onClick={() => setCustomOpen(true)}>
            <span className="flex items-center gap-2"><Plus size={16} /> {t('Start a custom workout')}</span>
          </Button>

          <Card>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1">{t('Coaching')}</p>
            <LedgerRow k={t('Next block')} v={<span className="capitalize">{rec.nextBlock}</span>} />
            <LedgerRow k={t('Avg RPE')} v={rec.avgRpe || '–'} />
            <LedgerRow k={t('Avg volume / wk')} v={`${rec.weeklyVolume.toLocaleString()} kg`} />
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
              <span className="flex items-center gap-2"><Dumbbell size={16} /> {t('Start')} {todayPlan.label}</span>
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted text-sm">{todayPlan?.rest ? t('Planned rest day, but you can still train.') : t('No plan for today.')}</p>
            <Button variant="outline" className="w-full justify-center mt-3" onClick={() => { startWorkout('Freestyle session'); haptic('success'); }}>
              {t('Start an empty workout')}
            </Button>
          </>
        )}
        <Button variant="ghost" className="w-full justify-center mt-2" onClick={() => setCustomOpen(true)}>
          <span className="flex items-center gap-2"><Plus size={16} /> {t('Start a custom workout')}</span>
        </Button>
      </Card>
      )}

      <CustomWorkoutSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onStart={(name) => { startWorkout(name); setCustomOpen(false); haptic('success'); toast(`“${name}” started 💪`); }}
        pastWorkouts={history.filter((w) => !w.cardio && w.exercises.length > 0).slice(0, 8)}
        onRepeat={(id) => { if (repeatWorkout(id)) { setCustomOpen(false); haptic('success'); toast(t('Loaded a past session 💪')); } }}
      />

      {/* Your coach — tailored to what you told us at sign-up (goal, experience, the words you typed) */}
      {!simple && tips.length > 0 && (
        <Card className="space-y-2 border-accent-2/30 bg-accent-2/5">
          <p className="text-xs uppercase tracking-wide text-muted">{t('Your coach')}</p>
          {tips.map((tip) => (
            <p key={tip.text} className="text-sm flex items-start gap-2">
              <span className="shrink-0">{tip.icon}</span>
              <span>{t(tip.text)}</span>
            </p>
          ))}
        </Card>
      )}

      {/* Your routines — named, reusable sessions. This replaced a "Do it again"
          card that could only ever offer the single most recent workout. */}
      <RoutinesCard lastStrength={lastStrength} />

      {/* Recovery readiness — last night's data steering today's effort (Legacy;
          V2 shows this as the readiness console at the top). */}
      {!v2 && !simple && readiness && (() => {
        const guide = trainingGuidance(readiness.level);
        const pct = Math.round((guide.multiplier - 1) * 100);
        const loadLabel = guide.multiplier === 0 ? 'rest day' : pct === 0 ? 'load: as planned' : `load: ${pct > 0 ? '+' : ''}${pct}%`;
        return (
          <Card className="flex items-start gap-3" style={{ borderColor: readiness.color }}>
            <Moon size={18} className="mt-0.5 shrink-0" style={{ color: readiness.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-muted">{t('Today’s readiness')}</span>
                <ReadinessChip r={readiness} />
                <Badge color={readiness.color}>{loadLabel}</Badge>
              </div>
              <p className="text-sm mt-1 font-semibold" style={{ color: readiness.color }}>{guide.headline}</p>
              <p className="text-[12px] text-muted">{guide.detail}</p>
              {/* Smart swap: when run down, offer the week's lightest session instead */}
              {(readiness.level === 'rundown' || readiness.level === 'rest') && lightDay && todayPlan && !todayPlan.rest && lightDay.label !== todayPlan.label && (
                <Button variant="outline" className="w-full justify-center mt-2 py-1.5" onClick={() => { startWorkout(`${lightDay.label} (light)`, lightDay.exerciseIds, { targets: lightDay.targets, maxWeightKg: gymMax }); haptic('success'); toast(`Swapped to ${lightDay.label}: listen to your body 🙏`); }}>
                  {t('Swap today for')} {lightDay.label} ({lightDay.exerciseIds.length} {t('lifts)')}
                </Button>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Overtraining alarm — sustained recovery red flags, not one bad night */}
      {!simple && otRisk && otRisk.level !== 'ok' && (
        <Card className={`flex gap-3 items-start ${otRisk.level === 'high' ? 'border-danger/60' : 'border-warn/50'}`}>
          <HeartPulse size={18} className={`mt-0.5 shrink-0 ${otRisk.level === 'high' ? 'text-danger' : 'text-warn'}`} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{otRisk.level === 'high' ? t('Take a deload week') : t('Recovery watch')}</p>
            {otRisk.reasons.map((r) => <p key={r} className="text-sm mt-1">{r}</p>)}
            <p className="text-[11px] text-muted mt-1">{otRisk.level === 'high' ? t('Drop weights ~40% for a few sessions: you’ll come back stronger.') : t('Nothing drastic: just keep an eye on sleep this week.')}</p>
          </div>
        </Card>
      )}

      {/* Deload / overtraining watch */}
      {!simple && loadWarning && (
        <Card className={`flex gap-3 items-start ${loadWarning.level === 'spike' ? 'border-danger/50' : 'border-warn/50'}`}>
          <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${loadWarning.level === 'spike' ? 'text-danger' : 'text-warn'}`} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{loadWarning.level === 'spike' ? t('Load spike') : t('Fatigue building')}</p>
            <p className="text-sm mt-1">{loadWarning.message}</p>
          </div>
        </Card>
      )}

      {/* Adaptive periodisation (Legacy — V2 folds this into the coaching ledger) */}
      {!v2 && !simple && (
      <Card className="flex gap-3 items-start">
        <Brain size={18} className="text-accent-2 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{t('Periodisation engine')}</p>
          <p className="text-sm mt-1">{t('Next block:')} <b className="capitalize">{rec.nextBlock}</b></p>
          <p className="text-xs text-muted mt-1">{t(rec.reason)}</p>
          <p className="text-[11px] text-muted/70 mt-1">{t('avg RPE')} {rec.avgRpe || '–'} {t('· about')} {rec.weeklyVolume.toLocaleString()} {t('kg a week on average')}</p>
        </div>
      </Card>
      )}

      {/* Plateau breaker */}
      {!simple && plateaus.length > 0 && (
        <div>
          <SectionTitle>{t('Plateau breaker')}</SectionTitle>
          {plateaus.map((p) => (
            <Card key={p.exerciseId} className="flex gap-3 items-start border-warn/40">
              <AlertTriangle size={18} className="text-warn mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">{p.exerciseName}{t(': stuck')} {p.weeksStuck} {t('weeks')}</p>
                <p className="text-xs text-muted mt-1">{p.suggestion}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {!simple && (
          <Button variant="ghost" className="flex-1 justify-center" onClick={() => setToolsOpen(true)}>
            <span className="flex items-center gap-2"><Wrench size={16} /> {t('Tools')}</span>
          </Button>
        )}
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => navigate('/history')}>
          <span className="flex items-center gap-2"><History size={16} /> {t('History')}</span>
        </Button>
      </div>

      {!simple && <CardioScanCard />}

      <Sheet open={toolsOpen} onClose={() => setToolsOpen(false)} title={t('Lifting tools')}>
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
  const t = useT();
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
      setScanMeta({ confidence: 0, tip: 'Could not read it: enter the numbers manually.' });
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
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{t('Log cardio')}</p>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" disabled={busy} onClick={() => pick('watch')}>
          <span className="flex items-center gap-2"><Watch size={16} /> {busy && source === 'watch' ? t('Reading…') : t('From watch')}</span>
        </Button>
        <Button variant="ghost" className="flex-1 justify-center" disabled={busy} onClick={() => pick('machine')}>
          <span className="flex items-center gap-2"><Camera size={16} /> {busy && source === 'machine' ? t('Reading…') : t('Machine')}</span>
        </Button>
      </div>
      <Button variant="ghost" className="w-full justify-center" onClick={() => setManualOpen(true)}>
        <span className="flex items-center gap-2"><Plus size={16} /> {t('Log manually')}</span>
      </Button>
      <p className="text-[11px] text-muted/70 text-center">{t('Snap your watch or a machine console: we read distance, time & speed, and you can add your own metrics. Distance + time earn XP; beat your best for a cardio PR 🏃')}</p>

      <ManualCardioSheet open={manualOpen} onClose={() => setManualOpen(false)} onLog={(d) => { reward(d); setManualOpen(false); }} />

      <Sheet open={!!draft} onClose={() => { setDraft(null); setScanMeta(null); }} title={source === 'watch' ? t('Review watch session') : t('Review cardio')}>
        {draft && (
          <div className="space-y-3">
            {scanMeta && <p className="text-[11px] text-muted">{t('Read from your')} {source === 'watch' ? 'watch' : 'console'}{t('. Adjust anything. Confidence')} {Math.round(scanMeta.confidence * 100)}%.</p>}
            <CardioFields data={draft} onChange={setDraft} />
            {scanMeta?.tip && <p className="text-xs text-muted">💡 {scanMeta.tip}</p>}
            <Button className="w-full justify-center" onClick={logIt}>{t('Log session')}</Button>
          </div>
        )}
      </Sheet>
    </Card>
  );
}

function CustomWorkoutSheet({ open, onClose, onStart, pastWorkouts, onRepeat }: { open: boolean; onClose: () => void; onStart: (name: string) => void; pastWorkouts: Workout[]; onRepeat: (id: string) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const saveRoutine = useWorkout((s) => s.saveRoutine);
  const suggestName = useWorkout((s) => s.suggestName);
  const suggestions = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Arms', 'Chest & Back', 'Conditioning'];

  // Saving a past session as a routine used to be a star that only reordered
  // this list. Now it names the thing and puts it on the Train screen.
  async function keep(w: Workout) {
    const chosen = await askText({
      title: 'Name this routine',
      body: 'It appears at the top of Train, ready to start in one tap.',
      defaultValue: suggestName(w.id),
      confirmLabel: 'Save',
      required: true,
      maxLength: ROUTINE_NAME_MAX,
    });
    if (!chosen) return;
    const saved = saveRoutine(w.id, chosen);
    if (saved) { haptic('success'); toast(`“${saved.name}” saved as a routine 📌`); }
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('Custom workout')}>
      <div className="space-y-3">
        <p className="text-[11px] text-muted">{t('Name a fresh session: add exercises as you go.')}</p>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onStart(name.trim()); }}
          placeholder={t('e.g. Peter’s Power Hour')}
          className="w-full rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => <Pill key={s} active={name === s} onClick={() => setName(s)}>{s}</Pill>)}
        </div>
        <Button className="w-full justify-center" disabled={!name.trim()} onClick={() => onStart(name.trim())}>{t('Start workout')}</Button>

        {pastWorkouts.length > 0 && (
          <div className="pt-3 border-t border-line space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted">{t('Or repeat a past session: weights pre-filled')}</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {pastWorkouts.map((w) => (
                <div key={w.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
                  <button onClick={() => onRepeat(w.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <p className="text-[11px] text-muted">{w.exercises.length} {w.exercises.length === 1 ? 'exercise' : 'exercises'} · {new Date(w.date).toLocaleDateString()}</p>
                  </button>
                  <span className="flex items-center gap-1 text-xs text-accent shrink-0"><Repeat size={13} /> {t('Load')}</span>
                  <button
                    onClick={() => void keep(w)}
                    aria-label={`Save ${w.name} as a routine`}
                    className="shrink-0 rounded-lg p-1.5 text-muted active:bg-line"
                  >
                    <BookmarkPlus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function ManualCardioSheet({ open, onClose, onLog }: { open: boolean; onClose: () => void; onLog: (d: CardioData) => void }) {
  const t = useT();
  const [data, setData] = useState<CardioData>(newCardioData());
  useEffect(() => { if (open) setData(newCardioData()); }, [open]); // fresh defaults each open
  const valid = data.distanceKm > 0 || data.durationMin > 0;
  return (
    <Sheet open={open} onClose={onClose} title={t('Log cardio')}>
      <div className="space-y-3">
        <p className="text-[11px] text-muted">{t('Distance and time both earn XP. Add your own metrics: HR, elevation, splits, whatever you track. Beat your longest distance or time for a cardio PR 🏃')}</p>
        <CardioFields data={data} onChange={setData} />
        <Button className="w-full justify-center" disabled={!valid} onClick={() => onLog(data)}>{t('Log')} {data.machine || 'cardio'}</Button>
      </div>
    </Sheet>
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
