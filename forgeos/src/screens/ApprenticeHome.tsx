import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Apple, Droplets, Scale, Check, Play, GraduationCap } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button } from '../components/ui';
import { ActionRow } from '../components/ActionList';
import { ModeSwitch } from '../components/ModeSwitch';
import { FeedbackLink } from '../components/Feedback';
import { SearchBar } from '../components/AppSearch';
import { useT } from '../lib/i18n';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { useNutrition } from '../state/nutritionStore';
import { useSettings } from '../state/settingsStore';
import { FIND_IT, nextStep, sessionsThisWeek, weekStart } from '../lib/apprentice';

// The Apprentice home: one screen that answers "what do I do now?" and "where
// is that thing?" — nothing else. Every number here already exists elsewhere in
// the app; what is different is that there are four of them instead of forty.
//
// It deliberately *navigates* to Train and Food rather than starting a workout
// from here. Learning that training lives behind the Train tab is the habit;
// a shortcut on the home screen would quietly prevent it.

export default function ApprenticeHome() {
  const t = useT();
  const navigate = useNavigate();
  const profile = useUser((s) => s.profile);
  const weighIns = useUser((s) => s.weighIns);
  const active = useWorkout((s) => s.active);
  const history = useWorkout((s) => s.history);
  const rawLog = useNutrition((s) => s.log);
  const water = useNutrition((s) => s.todaysWaterMl());
  const weeklyGoal = useSettings((s) => s.weeklyGoal);

  const today = new Date().toISOString().slice(0, 10);
  const kcal = useMemo(
    () => rawLog.filter((e) => e.date.slice(0, 10) === today).reduce((a, e) => a + e.calories, 0),
    [rawLog, today],
  );
  const done = useMemo(() => sessionsThisWeek(history.map((w) => w.date)), [history]);
  const trainedToday = useMemo(() => history.some((w) => w.date.slice(0, 10) === today), [history, today]);
  const weighedInThisWeek = useMemo(() => {
    const from = weekStart().getTime();
    return weighIns.some((w) => new Date(w.date).getTime() >= from);
  }, [weighIns]);

  const step = nextStep({
    hasActiveWorkout: !!active,
    trainedToday,
    sessionsThisWeek: done,
    weeklyGoal,
    kcalLogged: kcal,
    waterMl: water,
    weighedInThisWeek,
  });

  const kcalTarget = profile?.macros?.calories ?? 2200;

  return (
    <Screen title={`${t('app.hi')}, ${profile?.name ?? 'Athlete'}`} subtitle={t('app.modeSub')}>
      {/* 0 — one box that finds anything. Above the fold because "where is it?"
             is the question this whole mode exists to answer; the habit map
             below is the same answer for the six things people ask for most. */}
      <SearchBar />

      {/* 1 — the one thing to do, in one sentence, with one button */}
      <Card className="space-y-3 border-accent/40 bg-accent/5">
        <p className="text-[11px] uppercase tracking-wide text-muted">{t('app.next')}</p>
        <p className="text-lg font-bold leading-snug">{t(`app.step.${step.id}`)}</p>
        {step.id !== 'restDay' && (
          <Button className="w-full justify-center py-3" onClick={() => navigate(step.route)}>
            <span className="flex items-center gap-2 text-base">
              {step.id === 'resume' ? <Play size={17} /> : step.id === 'train' ? <Dumbbell size={17} /> : step.id === 'weighIn' ? <Scale size={17} /> : <Apple size={17} />}
              {t(`app.cta.${step.id}`)}
            </span>
          </Button>
        )}
      </Card>

      {/* 2 — today and this week, in three numbers */}
      <div className="grid grid-cols-3 gap-2">
        <Tile icon={<Dumbbell size={15} />} value={`${done}/${weeklyGoal}`} label={t('app.tile.workouts')} onClick={() => navigate('/train')} />
        <Tile icon={<Apple size={15} />} value={kcal.toLocaleString()} label={`${t('app.tile.eaten')} · ${kcalTarget.toLocaleString()}`} onClick={() => navigate('/nutrition')} />
        <Tile icon={<Droplets size={15} />} value={`${(water / 1000).toFixed(1)}L`} label={t('app.tile.water')} onClick={() => navigate('/nutrition')} />
      </div>

      {/* 3 — the habit map. Each row says where the thing lives in the FULL app,
             so what you learn here is still true after switching. */}
      <Card className="space-y-1">
        <p className="text-sm font-bold">{t('app.find')}</p>
        <p className="text-[11px] text-muted pb-1">{t('app.findSub')}</p>
        <div className="divide-y divide-line/70">
          {FIND_IT.map((e) => (
            <ActionRow key={e.id} title={t(e.labelKey)} detail={t(e.whereKey)} onClick={() => navigate(e.route)} />
          ))}
        </div>
      </Card>

      {/* 4 — the way out, always visible, never a one-way door */}
      <ModeSwitch />

      {trainedToday && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-success">
          <Check size={12} /> {t('app.trainedToday')}
        </p>
      )}
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted/70">
        <GraduationCap size={12} /> {t('app.mode')}
      </p>
      <FeedbackLink />
    </Screen>
  );
}

function Tile({ icon, value, label, onClick }: { icon: React.ReactNode; value: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-surface border border-line p-3 text-left active:scale-[0.98] transition">
      <span className="text-muted">{icon}</span>
      <p className="font-mono text-xl font-extrabold leading-tight mt-1">{value}</p>
      {/* Two lines rather than an ellipsis: in Slovak, and again in the
          bigger-controls mode, "TENTO TÝŽDEŇ" was being cut to "TENTO TÝŽ…". */}
      <p className="text-[10px] uppercase leading-tight tracking-wide text-muted line-clamp-2">{label}</p>
    </button>
  );
}
