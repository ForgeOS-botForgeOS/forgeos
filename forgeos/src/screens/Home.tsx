import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp, Lightbulb, ChevronRight, Watch, Moon, Footprints, MessageCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useChartKit } from '../components/chartKit';
import { Screen } from '../components/Screen';
import { Card, Ring, SectionTitle, Badge } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { DailyQuote } from '../components/DailyQuote';
import { InstallButton } from '../components/InstallButton';
import { WeeklyRecap } from '../components/WeeklyRecap';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
import { WrappedTeaser } from '../components/WrappedTeaser';
import { useT } from '../lib/i18n';
import { useUser } from '../state/userStore';
import { useNutrition } from '../state/nutritionStore';
import { useWorkout } from '../state/workoutStore';
import { useGami } from '../state/gamificationStore';
import { tipOfTheDay } from '../data/tips';
import { rankForXp, rankLabel, progressToNext } from '../data/ranks';
import { WeighInTracker } from '../components/WeighInTracker';
import { Heatmap } from '../components/Heatmap';
import { useHealth, sortedDays } from '../state/healthStore';
import { useSettings } from '../state/settingsStore';
import { readinessFromDays, type Readiness } from '../lib/readiness';
import { muscleVolume, neglectedMuscles } from '../lib/muscleVolume';
import { ReadinessCard } from '../components/Readiness';
import { weekendNudge } from '../lib/nudges';
import { last7DaysVolume, todayFocus, type TodayFocus } from '../lib/homeDash';

export default function Home() {
  const ck = useChartKit();
  const t = useT();
  const profile = useUser((s) => s.profile);
  // Derive today's macro totals from raw state (memoised) so the selector
  // returns a cached reference and the dashboard updates immediately.
  const rawLog = useNutrition((s) => s.log);
  const totals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return rawLog
      .filter((e) => e.date.slice(0, 10) === today)
      .reduce(
        (a, e) => ({ calories: a.calories + e.calories, proteinG: a.proteinG + e.proteinG, carbsG: a.carbsG + e.carbsG, fatG: a.fatG + e.fatG, sugarG: a.sugarG + e.sugarG }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 },
      );
  }, [rawLog]);
  const history = useWorkout((s) => s.history);
  const xp = useGami((s) => s.xp);
  const streak = useGami((s) => s.weekStreak);
  const navigate = useNavigate();

  const dayIdx = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const { tier } = rankForXp(xp);

  const weeklyVolume = useMemo(() => last7DaysVolume(history).map((b) => ({ ...b, label: t(b.day) })), [history, t]);
  const weekPlan = useUser((s) => s.weekPlan);

  const macros = profile?.macros ?? { calories: 2200, proteinG: 160, carbsG: 220, fatG: 60 };
  const v2 = useSettings((s) => s.designMode === 'v2');
  const muscleLoads = useMemo(() => muscleVolume(history, new Date(Date.now() - 7 * 86400000).toISOString()), [history]);

  // Extra data the V2 "A×C" Home surfaces (gauges + rails). All from existing
  // stores — no behaviour change.
  const weighIns = useUser((s) => s.weighIns);
  const heavyLifts = useGami((s) => s.heavyLifts);

  // Recovery readiness — only when the feature is on and there's actual data.
  const recoveryEnabled = useSettings((s) => s.recoveryEnabled);
  const healthDays = useHealth((s) => s.days);
  const readiness = useMemo(() => (recoveryEnabled ? readinessFromDays(sortedDays(healthDays)) : null), [recoveryEnabled, healthDays]);
  const acVitals = useMemo(() => {
    const latest = sortedDays(healthDays)[0];
    return {
      steps: latest?.steps ?? null,
      sleepH: typeof latest?.sleepMinutes === 'number' ? Math.round((latest.sleepMinutes / 60) * 10) / 10 : null,
      restingHr: latest?.restingHr ?? null,
    };
  }, [healthDays]);

  return (
    <>
      <Screen
        title={`${t('home.hi')}, ${profile?.name ?? 'Athlete'}`}
        subtitle={`${rankLabel(tier)} · ${xp.toLocaleString()} XP`}
        right={
          <div className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5" title={t('Week streak: weeks in a row you trained')} aria-label={t('Week streak: weeks in a row you trained')}>
            <Flame size={16} className="text-accent" />
            <CountUp value={streak} className="font-bold text-sm" /><span className="text-xs text-muted">{t('weeks')}</span>
          </div>
        }
      >
        {/* Install CTA — only shows in a browser, hidden once installed */}
        <InstallButton variant="banner" />

        {/* Top of Home — V2: focus hero + gauges + rails (A×C); Legacy: ring hero + status card */}
        {v2 ? (
          <HomeAC
            energyValue={totals.calories}
            energyMax={macros.calories}
            proteinValue={totals.proteinG}
            proteinMax={macros.proteinG}
            steps={acVitals.steps}
            focus={todayFocus(weekPlan, !!(history[0] && isToday(history[0].date)))}
            recoveryEnabled={recoveryEnabled}
            readiness={readiness}
            sleepH={acVitals.sleepH}
            restingHr={acVitals.restingHr}
            volumeTotal={weeklyVolume.reduce((a, b) => a + b.volume, 0)}
            weightKg={weighIns.length ? weighIns[weighIns.length - 1].weightKg : null}
            prs={heavyLifts}
            onNav={navigate}
          />
        ) : (
          <>
            <Card>
              <div className="flex items-center gap-4">
                <Ring value={totals.calories} max={macros.calories}>
                  <CountUp value={Math.round(totals.calories)} className="text-2xl font-bold font-mono" duration={500} />
                  <span className="text-[10px] text-muted">/ {macros.calories} kcal</span>
                </Ring>
                <div className="flex-1 space-y-2">
                  <MacroBar label="Protein" value={totals.proteinG} max={macros.proteinG} unit="g" color="rgb(var(--accent))" />
                  <MacroBar label="Carbs" value={totals.carbsG} max={macros.carbsG} unit="g" color="rgb(var(--accent-2))" />
                  <MacroBar label="Fat" value={totals.fatG} max={macros.fatG} unit="g" color="rgb(var(--success))" />
                </div>
              </div>
            </Card>
            <Card onClick={() => navigate('/train')} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Today’s training</p>
                <p className="font-semibold">{history[0] && isToday(history[0].date) ? 'Session logged ✅' : 'Ready when you are'}</p>
              </div>
              <Badge>Open Train</Badge>
            </Card>
          </>
        )}

        {/* End-of-week reminder: streak on the line / sessions to goal */}
        <WeekendNudge />

        {/* Recovery readiness — card when there's data, a one-time nudge otherwise.
            V2 surfaces this in the bento grid above, so only Legacy renders it here. */}
        {!v2 &&
          (readiness ? (
            <ReadinessCard r={readiness} onClick={() => navigate('/health')} />
          ) : recoveryEnabled && Object.keys(healthDays).length === 0 ? (
            <Card onClick={() => navigate('/health')} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Watch size={16} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Track recovery</p>
                  <p className="text-[12px] text-muted">Connect Garmin or log sleep to unlock readiness</p>
                </div>
              </div>
              <Badge color="rgb(var(--accent))">Set up</Badge>
            </Card>
          ) : null)}

        {/* Sleep & steps at a glance — V2 surfaces this in the recovery rail above */}
        {!v2 && <HealthGlance />}

        <DailyQuote />

        {/* Week in review */}
        {/* Fresh-month recap teaser + Monday look-back at the completed week */}
        <WrappedTeaser />
        <WeeklyReviewCard />
        <WeeklyRecap />

        {/* Weekly volume — shown on every design (V2 also has a quick total in the rail) */}
        <div>
          <SectionTitle action={<span className="text-xs text-muted flex items-center gap-1"><TrendingUp size={12} /> {t('last 7 days')}</span>}>
            {t('Volume')}
          </SectionTitle>
          <Card>
            {weeklyVolume.every((b) => b.volume === 0) ? (
              <p className="py-6 text-center text-sm text-muted">{t('No training logged in the last 7 days.')}</p>
            ) : (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolume}>
                  {ck.defs}
                  {ck.grid}
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--surface-2))' }}
                    contentStyle={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toLocaleString()} kg`, t('Volume')]}
                  />
                  <Bar dataKey="volume" fill={ck.barFill('accent', 'rgb(var(--accent))')} radius={ck.radius([6, 6, 0, 0])} {...ck.motion} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </Card>
        </div>

        {/* Muscle-group volume with productive-range (MEV–MRV) guidance */}
        {muscleLoads.some((m) => m.sets > 0) && (
          <div>
            <SectionTitle action={<span className="text-xs text-muted">{t('last 7 days')}</span>}>{t('Muscle volume')}</SectionTitle>
            <Card className="space-y-2">
              {muscleLoads.filter((m) => m.sets > 0).map((m) => {
                const color = m.status === 'good' ? 'rgb(var(--success))' : m.status === 'high' ? 'rgb(var(--danger))' : m.status === 'low' ? 'rgb(var(--warn))' : 'rgb(var(--muted))';
                const pct = Math.min(100, (m.sets / m.mrv) * 100);
                return (
                  <div key={m.muscle}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted">{m.muscle}</span>
                      <span className="font-mono">{m.sets} {t('sets')} <span className="text-muted/70">/ {m.mev}–{m.mrv}</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {(() => {
                const n = neglectedMuscles(muscleLoads);
                return n.length > 0 ? <p className="text-xs text-warn/90 pt-1">⚠ {t('Light this week')}: {n.slice(0, 4).join(', ')}{n.length > 4 ? '…' : ''}</p> : null;
              })()}
            </Card>
          </div>
        )}

        {/* Weigh-in tracker */}
        <div>
          <SectionTitle>{t('home.weighIn')}</SectionTitle>
          <WeighInTracker />
        </div>

        {/* Volume heatmap */}
        <div>
          <SectionTitle>{t('home.heatmap')}</SectionTitle>
          <Card><Heatmap /></Card>
        </div>

        {/* Two shortcuts side by side instead of two full-width cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card onClick={() => navigate('/trainer')} className="space-y-1">
            <MessageCircle size={18} className="text-accent" />
            <p className="text-sm font-semibold">{t('Trainer')}</p>
            <p className="text-xs text-muted">{t('Ask anything')}</p>
          </Card>
          <Card onClick={() => navigate('/progress')} className="space-y-1">
            <TrendingUp size={18} className="text-accent-2" />
            <p className="text-sm font-semibold">{t('Body & trends')}</p>
            <p className="text-xs text-muted">{t('Measurements, cardio')}</p>
          </Card>
        </div>

        {/* Science tip */}
        <Card className="flex gap-3 items-start">
          <Lightbulb size={18} className="text-accent-2 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{t('home.scienceTip')}</p>
            <p className="text-sm mt-1">{tipOfTheDay(dayIdx)}</p>
          </div>
        </Card>

        <button
          onClick={() => navigate('/quests')}
          className="w-full flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm min-h-[48px]"
        >
          <span>{t('Rank progress')}: {t('{n}% to the next tier', { n: Math.round(progressToNext(xp) * 100) })}</span>
          <ChevronRight size={16} />
        </button>
      </Screen>
    </>
  );
}

// 7-day sleep + steps mini charts. Rendered only when Garmin data actually
// flows in via Health Connect (same "connected" signal the Health screen uses),
// so manual-only or disconnected users never see an empty card.
// Friday-to-Sunday banner from lib/nudges: quiet unless a streak is genuinely
// on the line or the weekly session goal is still winnable.
function WeekendNudge() {
  const navigate = useNavigate();
  const weekStart = useGami((s) => s.weekStart);
  const weekSessions = useGami((s) => s.weekSessions);
  const weekStreak = useGami((s) => s.weekStreak);
  const weeklyGoal = useSettings((s) => s.weeklyGoal);
  const nudge = useMemo(
    () => weekendNudge({ weekStart, weekSessions, weekStreak, weeklyGoal }),
    [weekStart, weekSessions, weekStreak, weeklyGoal],
  );
  if (!nudge) return null;
  return (
    <Card onClick={() => navigate('/train')} className="flex items-center gap-2">
      <Flame size={16} className={nudge.kind === 'streak' ? 'text-accent' : 'text-accent-2'} />
      <p className="text-sm flex-1">{nudge.message}</p>
      <Badge color={nudge.kind === 'streak' ? 'rgb(var(--accent))' : 'rgb(var(--accent-2))'}>Train</Badge>
    </Card>
  );
}

function HealthGlance() {
  const ck = useChartKit();
  const navigate = useNavigate();
  const recoveryEnabled = useSettings((s) => s.recoveryEnabled);
  const days = useHealth((s) => s.days);

  const glance = useMemo(() => {
    const list = sortedDays(days); // newest → oldest
    if (!list.some((d) => d.source === 'healthconnect')) return null;
    const week = list.slice(0, 7).reverse(); // oldest → newest
    const rows = week.map((d) => ({
      d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(d.date + 'T12:00:00').getDay()],
      sleepH: typeof d.sleepMinutes === 'number' ? Math.round((d.sleepMinutes / 60) * 10) / 10 : null,
      steps: d.steps ?? null,
    }));
    const sleeps = rows.map((r) => r.sleepH).filter((v): v is number => v != null);
    const steps = rows.map((r) => r.steps).filter((v): v is number => v != null);
    if (!sleeps.length && !steps.length) return null;
    return {
      rows,
      avgSleepH: sleeps.length ? Math.round((sleeps.reduce((a, b) => a + b, 0) / sleeps.length) * 10) / 10 : null,
      totalSteps: steps.length ? steps.reduce((a, b) => a + b, 0) : null,
    };
  }, [days]);

  if (!recoveryEnabled || !glance) return null;

  const tick = { fontSize: 9, fill: 'rgb(var(--muted))' } as const;
  const tip = { background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 } as const;

  return (
    <Card onClick={() => navigate('/health')} className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted">Last 7 days · Garmin</p>
        <Badge>Open Health</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="flex items-center gap-1 text-[11px] text-muted mb-1">
            <Moon size={12} className="text-accent-2" /> Sleep{glance.avgSleepH != null && <span className="font-mono text-text ml-auto">Ø {glance.avgSleepH}h</span>}
          </p>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={glance.rows} margin={{ left: 0, right: 0, top: 4 }}>
                {ck.defs}
                {ck.grid}
                <XAxis dataKey="d" tick={tick} axisLine={false} tickLine={false} interval={0} />
                <YAxis hide domain={[0, 10]} />
                <Tooltip cursor={{ fill: 'rgb(var(--surface-2))' }} contentStyle={tip} formatter={(v) => [`${v} h`, 'Sleep']} />
                <ReferenceLine y={8} stroke="rgb(var(--muted))" strokeDasharray="3 3" />
                <Bar dataKey="sleepH" fill={ck.barFill('accent-2', 'rgb(var(--accent-2))')} radius={ck.radius([3, 3, 0, 0])} maxBarSize={10} {...ck.motion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="flex items-center gap-1 text-[11px] text-muted mb-1">
            <Footprints size={12} className="text-success" /> Steps{glance.totalSteps != null && <span className="font-mono text-text ml-auto">{glance.totalSteps.toLocaleString()}</span>}
          </p>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={glance.rows} margin={{ left: 0, right: 0, top: 4 }}>
                {ck.defs}
                {ck.grid}
                <XAxis dataKey="d" tick={tick} axisLine={false} tickLine={false} interval={0} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'rgb(var(--surface-2))' }} contentStyle={tip} formatter={(v) => [Number(v).toLocaleString(), 'Steps']} />
                <Bar dataKey="steps" fill={ck.barFill('success', 'rgb(var(--success))')} radius={ck.radius([3, 3, 0, 0])} maxBarSize={10} {...ck.motion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

// V2 Home: a hero that names today's session, three gauges with real numbers,
// then recovery and progress rails. A rail or gauge with nothing to show is
// left out instead of rendering dashes.
interface HomeACProps {
  energyValue: number;
  energyMax: number;
  proteinValue: number;
  proteinMax: number;
  steps: number | null;
  focus: TodayFocus;
  recoveryEnabled: boolean;
  readiness: Readiness | null;
  sleepH: number | null;
  restingHr: number | null;
  volumeTotal: number;
  weightKg: number | null;
  prs: number;
  onNav: (to: string) => void;
}

function HomeAC({ energyValue, energyMax, proteinValue, proteinMax, steps, focus, recoveryEnabled, readiness, sleepH, restingHr, volumeTotal, weightKg, prs, onNav }: HomeACProps) {
  const t = useT();
  const energyPct = energyMax > 0 ? (energyValue / energyMax) * 100 : 0;
  const proteinPct = proteinMax > 0 ? (proteinValue / proteinMax) * 100 : 0;
  const kcalLeft = Math.round(energyMax - energyValue);
  const hero = {
    done: { title: t('Session logged'), body: t('Nice work. Review it, or add another block.'), cta: t('Open Train') },
    session: { title: focus.kind === 'session' ? focus.label : '', body: t('{n} exercises planned', { n: focus.kind === 'session' ? focus.exercises : 0 }), cta: t('Start workout') },
    rest: { title: t('Rest day'), body: t('Recovery is part of the plan. Train anyway if you feel like it.'), cta: t('Train anyway') },
    open: { title: t('Ready to train'), body: t('Nothing planned for today. Pick a workout and go.'), cta: t('Start workout') },
  }[focus.kind];
  const quiet = focus.kind === 'rest' || focus.kind === 'done';
  const hasRecovery = readiness != null || sleepH != null || restingHr != null;
  return (
    <div className="space-y-3">
      <button
        onClick={() => onNav('/train')}
        className="fx-card block w-full p-5 text-left"
        style={{ background: 'linear-gradient(160deg, rgb(var(--accent) / 0.12), rgb(var(--surface)))' }}
      >
        <span className="block text-xs uppercase tracking-[0.14em] text-accent">{t('Today')}</span>
        <span className="block text-3xl font-bold uppercase italic leading-none mt-2">{hero.title}</span>
        <span className="block text-sm text-muted mt-2">{hero.body}</span>
        <span className={`mt-4 block rounded-md text-center font-bold uppercase italic tracking-wide py-3 ${quiet ? 'bg-surface-2 text-text' : 'bg-accent text-black'}`}>▸ {hero.cta}</span>
      </button>

      <Card onClick={() => onNav('/nutrition')}>
        <div className={`grid gap-2 ${steps != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Gauge
            label={t('Calories')}
            center={String(Math.abs(kcalLeft))}
            sub={kcalLeft >= 0 ? t('left') : t('over')}
            foot={t('of {n} kcal', { n: energyMax.toLocaleString() })}
            pct={energyPct}
            color="rgb(var(--accent))"
          />
          <Gauge label={t('Protein')} center={`${Math.round(proteinValue)}`} sub="g" foot={t('of {n} g', { n: proteinMax })} pct={proteinPct} color="rgb(var(--accent-2))" />
          {steps != null && <Gauge label={t('Steps')} center={fmtK(steps)} foot={t('of 10,000')} pct={(steps / 10000) * 100} color="rgb(var(--success))" />}
        </div>
      </Card>

      {hasRecovery ? (
        <Rail title={t('Recovery')} onSee={() => onNav('/health')}>
          {readiness && <Chip t={t('Readiness')} v={String(readiness.score)} s={readiness.label} />}
          {sleepH != null && <Chip t={t('Sleep')} v={String(sleepH)} s="h" />}
          {restingHr != null && <Chip t={t('Resting HR')} v={String(restingHr)} s="bpm" />}
        </Rail>
      ) : recoveryEnabled ? (
        <Card onClick={() => onNav('/health')} className="flex items-center gap-3">
          <Watch size={18} className="text-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('Track your recovery')}</p>
            <p className="text-xs text-muted">{t('Connect a watch or log your sleep to see how ready you are.')}</p>
          </div>
          <Badge color="rgb(var(--accent))">{t('Set up')}</Badge>
        </Card>
      ) : null}

      <Rail title={t('Progress')} onSee={() => onNav('/progress')}>
        <Chip t={t('Volume · 7 days')} v={fmtK(volumeTotal)} s="kg" />
        {weightKg != null && <Chip t={t('Weight')} v={String(weightKg)} s="kg" />}
        <Chip t={t('PRs')} v={String(prs)} s={t('all-time')} />
      </Rail>
    </div>
  );
}

function Gauge({ label, center, sub, foot, pct, color }: { label: string; center: string; sub?: string; foot?: string; pct: number; color: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <div
        className="grid place-items-center rounded-full"
        style={{ width: 84, height: 84, background: `conic-gradient(${color} ${p}%, rgb(var(--surface-2)) 0)` }}
      >
        <div className="grid place-items-center rounded-full bg-surface" style={{ width: 68, height: 68 }}>
          <span className="leading-none">
            <span className="block font-mono font-bold text-lg leading-none">{center}</span>
            {sub && <span className="block text-xs text-muted mt-0.5">{sub}</span>}
          </span>
        </div>
      </div>
      {foot && <span className="text-xs text-muted">{foot}</span>}
    </div>
  );
}

function Rail({ title, onSee, children }: { title: string; onSee: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.12em] text-muted">{title}</p>
        <button onClick={onSee} className="min-h-[40px] pl-4 text-xs uppercase tracking-wide text-accent font-semibold">{t('See all')} ▸</button>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{children}</div>
    </div>
  );
}

function Chip({ t, v, s }: { t: string; v: string; s?: string }) {
  return (
    <div className="fx-card shrink-0 min-w-[104px] flex-1 p-3">
      <p className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">{t}</p>
      <p className="font-mono font-bold text-lg mt-1.5 leading-none whitespace-nowrap">
        {v}
        {s && <span className="text-muted text-xs font-medium"> {s}</span>}
      </p>
    </div>
  );
}

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n));
}

function MacroBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-muted">{label}</span>
        <span className="font-mono">{Math.round(value)}/{max}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function isToday(iso: string) {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}
