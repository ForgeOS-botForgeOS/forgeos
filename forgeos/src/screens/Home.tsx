import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp, Lightbulb, ChevronRight, Watch, Moon, Footprints } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
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
import { ReadinessCard } from '../components/Readiness';
import { weekendNudge } from '../lib/nudges';

export default function Home() {
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

  const weeklyVolume = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = labels.map((d) => ({ day: d, volume: 0 }));
    const now = new Date();
    const monday = new Date(now);
    const dow = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    for (const w of history) {
      const d = new Date(w.date);
      if (d >= monday) {
        const idx = (d.getDay() + 6) % 7;
        buckets[idx].volume += Math.round(w.totalVolumeKg ?? 0);
      }
    }
    return buckets;
  }, [history]);

  const macros = profile?.macros ?? { calories: 2200, proteinG: 160, carbsG: 220, fatG: 60 };
  const v2 = useSettings((s) => s.designMode === 'v2');

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
      <DailyQuote />
      <Screen
        title={`${t('home.hi')}, ${profile?.name ?? 'Athlete'}`}
        subtitle={`${rankLabel(tier)} · ${xp.toLocaleString()} XP`}
        right={
          <div className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5" title="Week streak — weeks you hit your planned sessions">
            <Flame size={16} className="text-accent" />
            <CountUp value={streak} className="font-bold text-sm" /><span className="text-[10px] text-muted">wk</span>
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
            trainedToday={!!(history[0] && isToday(history[0].date))}
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

        {/* Progress shortcut */}
        <Card onClick={() => navigate('/progress')} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Progress &amp; body</p>
            <p className="font-semibold">Measurements, cardio &amp; trends</p>
          </div>
          <Badge color="rgb(var(--accent-2))">Open</Badge>
        </Card>

        {/* Science tip */}
        <Card className="flex gap-3 items-start">
          <Lightbulb size={18} className="text-accent-2 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Science tip of the day</p>
            <p className="text-sm mt-1">{tipOfTheDay(dayIdx)}</p>
          </div>
        </Card>

        {/* Week in review */}
        {/* Fresh-month recap teaser + Monday look-back at the completed week */}
        <WrappedTeaser />
        <WeeklyReviewCard />
        <WeeklyRecap />

        {/* Weekly volume — shown on every design (V2 also has a quick total in the rail) */}
        <div>
          <SectionTitle action={<span className="text-xs text-muted flex items-center gap-1"><TrendingUp size={12} /> this week</span>}>
            Weekly volume
          </SectionTitle>
          <Card>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolume}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--surface-2))' }}
                    contentStyle={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="rgb(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Weigh-in tracker */}
        <div>
          <SectionTitle>Weekly weigh-in</SectionTitle>
          <WeighInTracker />
        </div>

        {/* Volume heatmap */}
        <div>
          <SectionTitle>Volume heatmap</SectionTitle>
          <Card><Heatmap /></Card>
        </div>

        <button
          onClick={() => navigate('/quests')}
          className="w-full flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm"
        >
          <span>Rank progress — {Math.round(progressToNext(xp) * 100)}% to next tier</span>
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
                <XAxis dataKey="d" tick={tick} axisLine={false} tickLine={false} interval={0} />
                <YAxis hide domain={[0, 10]} />
                <Tooltip cursor={{ fill: 'rgb(var(--surface-2))' }} contentStyle={tip} formatter={(v) => [`${v} h`, 'Sleep']} />
                <ReferenceLine y={8} stroke="rgb(var(--muted))" strokeDasharray="3 3" />
                <Bar dataKey="sleepH" fill="rgb(var(--accent-2))" radius={[3, 3, 0, 0]} maxBarSize={10} />
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
                <XAxis dataKey="d" tick={tick} axisLine={false} tickLine={false} interval={0} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'rgb(var(--surface-2))' }} contentStyle={tip} formatter={(v) => [Number(v).toLocaleString(), 'Steps']} />
                <Bar dataKey="steps" fill="rgb(var(--success))" radius={[3, 3, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}

// V2 Home — the chosen "A×C" composition: a decisive focus hero, three summary
// gauges (energy/protein/steps), and swipeable recovery + progress rails. Same
// data + navigation as Legacy, new structure. See docs/redesign/home-layout.md.
function HomeAC({
  energyValue,
  energyMax,
  proteinValue,
  proteinMax,
  steps,
  trainedToday,
  readiness,
  sleepH,
  restingHr,
  volumeTotal,
  weightKg,
  prs,
  onNav,
}: {
  energyValue: number;
  energyMax: number;
  proteinValue: number;
  proteinMax: number;
  steps: number | null;
  trainedToday: boolean;
  readiness: Readiness | null;
  sleepH: number | null;
  restingHr: number | null;
  volumeTotal: number;
  weightKg: number | null;
  prs: number;
  onNav: (to: string) => void;
}) {
  const energyPct = energyMax > 0 ? (energyValue / energyMax) * 100 : 0;
  const proteinPct = proteinMax > 0 ? (proteinValue / proteinMax) * 100 : 0;
  const stepsPct = steps != null ? (steps / 10000) * 100 : 0;
  return (
    <div className="space-y-3">
      {/* Focus hero — the one decisive action */}
      <div
        onClick={() => onNav('/train')}
        className="fx-card cursor-pointer p-5"
        style={{ background: 'linear-gradient(160deg, rgb(var(--accent) / 0.12), rgb(var(--surface)))' }}
      >
        <p className="text-[10px] uppercase tracking-[0.14em] text-accent">Today’s focus</p>
        <p className="text-3xl font-bold uppercase italic leading-none mt-2">{trainedToday ? 'Session logged' : 'Ready to train'}</p>
        <p className="text-[13px] text-muted mt-2">{trainedToday ? 'Great work — review it or add another block.' : 'Your next session is queued. Let’s move.'}</p>
        <div className="mt-4 rounded-md bg-accent text-black text-center font-bold uppercase italic tracking-wide py-3">▸ {trainedToday ? 'Open Train' : 'Start workout'}</div>
      </div>

      {/* Summary gauges — live vitals at a glance */}
      <Card>
        <div className="grid grid-cols-3 gap-2">
          <Gauge label="Energy" center={`${Math.round(energyPct)}%`} pct={energyPct} color="rgb(var(--accent))" />
          <Gauge label="Protein" center={`${Math.round(proteinValue)}g`} pct={proteinPct} color="rgb(var(--accent-2))" />
          <Gauge label="Steps" center={steps != null ? fmtK(steps) : '—'} pct={stepsPct} color="rgb(var(--success))" />
        </div>
      </Card>

      {/* Recovery rail */}
      <Rail title="Recovery" onSee={() => onNav('/health')}>
        <Chip t="Readiness" v={readiness ? String(readiness.score) : '—'} s={readiness?.label} />
        <Chip t="Sleep" v={sleepH != null ? String(sleepH) : '—'} s={sleepH != null ? 'h' : undefined} />
        <Chip t="Resting HR" v={restingHr != null ? String(restingHr) : '—'} s={restingHr != null ? 'bpm' : undefined} />
      </Rail>

      {/* Progress rail */}
      <Rail title="Progress" onSee={() => onNav('/progress')}>
        <Chip t="Volume · wk" v={fmtK(volumeTotal)} s="kg" />
        <Chip t="Weight" v={weightKg != null ? String(weightKg) : '—'} s={weightKg != null ? 'kg' : undefined} />
        <Chip t="PRs" v={String(prs)} s="all-time" />
      </Rail>
    </div>
  );
}

function Gauge({ label, center, pct, color }: { label: string; center: string; pct: number; color: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="grid place-items-center rounded-full"
        style={{ width: 66, height: 66, background: `conic-gradient(${color} ${p}%, rgb(var(--surface-2)) 0)` }}
      >
        <div className="grid place-items-center rounded-full bg-surface" style={{ width: 50, height: 50 }}>
          <span className="font-mono font-bold text-sm">{center}</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Rail({ title, onSee, children }: { title: string; onSee: () => void; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{title}</p>
        <button onClick={onSee} className="text-[10px] uppercase tracking-wide text-accent font-semibold">See all ▸</button>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{children}</div>
    </div>
  );
}

function Chip({ t, v, s }: { t: string; v: string; s?: string }) {
  return (
    <div className="fx-card shrink-0 min-w-[104px] p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted">{t}</p>
      <p className="font-mono font-bold text-lg mt-1.5 leading-none">
        {v}
        {s && <span className="text-muted text-[11px] font-medium"> {s}</span>}
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
