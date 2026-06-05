import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp, Lightbulb, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Screen } from '../components/Screen';
import { Card, Ring, SectionTitle, Badge } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { DailyQuote } from '../components/DailyQuote';
import { InstallButton } from '../components/InstallButton';
import { WeeklyRecap } from '../components/WeeklyRecap';
import { useT } from '../lib/i18n';
import { useUser } from '../state/userStore';
import { useNutrition } from '../state/nutritionStore';
import { useWorkout } from '../state/workoutStore';
import { useGami } from '../state/gamificationStore';
import { tipOfTheDay } from '../data/tips';
import { rankForXp, rankLabel, progressToNext } from '../data/ranks';
import { WeighInTracker } from '../components/WeighInTracker';
import { Heatmap } from '../components/Heatmap';

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
  const streak = useGami((s) => s.streakDays);
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

  return (
    <>
      <DailyQuote />
      <Screen
        title={`${t('home.hi')}, ${profile?.name ?? 'Athlete'}`}
        subtitle={`${rankLabel(tier)} · ${xp.toLocaleString()} XP`}
        right={
          <div className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5">
            <Flame size={16} className="text-accent" />
            <CountUp value={streak} className="font-bold text-sm" />
          </div>
        }
      >
        {/* Install CTA — only shows in a browser, hidden once installed */}
        <InstallButton variant="banner" />

        {/* Calorie ring + macro donuts */}
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

        {/* Workout status */}
        <Card onClick={() => navigate('/train')} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Today’s training</p>
            <p className="font-semibold">{history[0] && isToday(history[0].date) ? 'Session logged ✅' : 'Ready when you are'}</p>
          </div>
          <Badge>Open Train</Badge>
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
        <WeeklyRecap />

        {/* Weekly volume */}
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
