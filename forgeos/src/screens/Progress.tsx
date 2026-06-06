import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, TrendingDown, TrendingUp, Camera, Trophy, Footprints, Dumbbell, Target, Flame } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Button, Sheet, SectionTitle, Badge, Pill } from '../components/ui';
import { CountUp } from '../components/CountUp';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';
import type { BodyStat } from '../types';

const MEASURES: { key: keyof BodyStat; label: string; unit: string; step: number }[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg', step: 0.1 },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%', step: 0.1 },
  { key: 'waistCm', label: 'Waist', unit: 'cm', step: 0.5 },
  { key: 'chestCm', label: 'Chest', unit: 'cm', step: 0.5 },
  { key: 'armCm', label: 'Arm', unit: 'cm', step: 0.5 },
  { key: 'thighCm', label: 'Thigh', unit: 'cm', step: 0.5 },
  { key: 'hipCm', label: 'Hip', unit: 'cm', step: 0.5 },
];

type Tab = 'body' | 'cardio' | 'strength';

export default function Progress() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('body');
  const weekStreak = useGami((s) => s.weekStreak);
  const weekSessions = useGami((s) => s.weekSessions);
  const goal = useSettings((s) => s.weeklyGoal);

  const weekPct = Math.min(100, (weekSessions / Math.max(1, goal)) * 100);

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Progress</h1>
        <p className="text-sm text-muted">Your body, your numbers, over time.</p>
      </div>

      {/* Weekly adherence — ties to the new week-based streak */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionTitle action={<span className="flex items-center gap-1 text-accent text-xs font-bold"><Flame size={13} /> <CountUp value={weekStreak} /> wk</span>}>This week</SectionTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-accent rounded-full transition-all" style={{ width: `${weekPct}%` }} /></div>
          </div>
          <span className="font-mono text-sm">{Math.min(weekSessions, goal)}/{goal}</span>
        </div>
        <p className="text-[11px] text-muted">{weekSessions >= goal ? 'Week complete — streak secured 🔥' : `${goal - weekSessions} more planned session(s) to keep your week streak.`}</p>
      </Card>

      <div className="flex gap-2">
        <Pill active={tab === 'body'} onClick={() => setTab('body')}>Body</Pill>
        <Pill active={tab === 'cardio'} onClick={() => setTab('cardio')}>Cardio</Pill>
        <Pill active={tab === 'strength'} onClick={() => setTab('strength')}>Strength</Pill>
      </div>

      {tab === 'body' && <BodyPanel />}
      {tab === 'cardio' && <CardioPanel />}
      {tab === 'strength' && <StrengthPanel />}
    </div>
  );
}

/* ------------------------------- BODY ------------------------------- */

function BodyPanel() {
  const bodyStats = useUser((s) => s.bodyStats);
  const weighIns = useUser((s) => s.weighIns);
  const addBodyStat = useUser((s) => s.addBodyStat);
  const [logOpen, setLogOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const latest = bodyStats[bodyStats.length - 1];
  const prev = bodyStats[bodyStats.length - 2];

  const weightSeries = useMemo(
    () => weighIns.slice(-30).map((w) => ({ d: w.date.slice(5), kg: Math.round(w.weightKg * 10) / 10 })),
    [weighIns],
  );
  const photos = useMemo(() => bodyStats.filter((b) => b.photo).slice(-12).reverse(), [bodyStats]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await compressImage(file, 480, 0.7);
    addBodyStat({ photo: dataUrl });
    haptic('success');
    toast('Progress photo saved 📸');
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button className="flex-1 justify-center" onClick={() => setLogOpen(true)}><span className="flex items-center gap-1"><Plus size={15} /> Log measurements</span></Button>
        <Button variant="ghost" className="justify-center px-3" onClick={() => photoRef.current?.click()}><Camera size={16} /></Button>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      </div>

      {/* current measurements grid */}
      <div className="grid grid-cols-2 gap-2">
        {MEASURES.map((m) => {
          const cur = latest?.[m.key] as number | undefined;
          const old = prev?.[m.key] as number | undefined;
          const delta = cur != null && old != null ? Math.round((cur - old) * 10) / 10 : null;
          return (
            <Card key={m.key} className="py-3">
              <p className="text-[11px] text-muted">{m.label}</p>
              <div className="flex items-end justify-between">
                <p className="font-mono font-bold text-lg">{cur != null ? cur : '—'}<span className="text-[10px] text-muted ml-0.5">{cur != null ? m.unit : ''}</span></p>
                {delta != null && delta !== 0 && (
                  <span className={`text-[10px] flex items-center gap-0.5 ${delta < 0 ? 'text-success' : 'text-accent-2'}`}>
                    {delta < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}{Math.abs(delta)}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* weight trend */}
      {weightSeries.length > 1 && (
        <Card>
          <SectionTitle>Weight trend</SectionTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ left: -20, right: 6, top: 6 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} interval="preserveStartEnd" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} />
                <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} kg`, 'Weight']} />
                <Line type="monotone" dataKey="kg" stroke="rgb(var(--accent))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* progress photos */}
      {photos.length > 0 && (
        <Card>
          <SectionTitle>Progress photos</SectionTitle>
          <div className="flex gap-2 overflow-x-auto no-scrollbar" data-noswipe>
            {photos.map((b) => (
              <div key={b.date} className="shrink-0 text-center">
                <img src={b.photo} alt={b.date} className="h-32 w-24 rounded-xl object-cover border border-line" />
                <p className="text-[10px] text-muted mt-1">{b.date.slice(5)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {bodyStats.length === 0 && <p className="text-sm text-muted text-center py-4">Log your first measurements to start tracking 📈</p>}

      <MeasureSheet open={logOpen} onClose={() => setLogOpen(false)} latest={latest} onSave={(patch) => { addBodyStat(patch); setLogOpen(false); haptic('success'); toast('Measurements logged 📏'); }} />
    </div>
  );
}

function MeasureSheet({ open, onClose, latest, onSave }: { open: boolean; onClose: () => void; latest?: BodyStat; onSave: (patch: Partial<BodyStat>) => void }) {
  const [vals, setVals] = useState<Record<string, number>>({});
  const get = (k: keyof BodyStat) => vals[k as string] ?? (latest?.[k] as number | undefined) ?? defaultFor(k);
  return (
    <Sheet open={open} onClose={onClose} title="Log measurements">
      <div className="space-y-2.5">
        <p className="text-[11px] text-muted">Only the ones you change are saved. Track what matters to you.</p>
        {MEASURES.map((m) => (
          <div key={m.key} className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted">{m.label} <span className="text-[10px]">({m.unit})</span></span>
            <div className="flex items-center gap-1">
              <button onClick={() => setVals((v) => ({ ...v, [m.key]: Math.max(0, Math.round((get(m.key) - m.step) * 10) / 10) }))} className="w-8 h-8 rounded-md bg-surface-2">−</button>
              <input type="number" value={get(m.key)} onChange={(e) => setVals((v) => ({ ...v, [m.key]: Math.max(0, Number(e.target.value) || 0) }))} className="w-16 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-center font-mono" />
              <button onClick={() => setVals((v) => ({ ...v, [m.key]: Math.round((get(m.key) + m.step) * 10) / 10 }))} className="w-8 h-8 rounded-md bg-surface-2">+</button>
            </div>
          </div>
        ))}
        <Button className="w-full justify-center" disabled={Object.keys(vals).length === 0} onClick={() => onSave(vals as Partial<BodyStat>)}>Save today’s snapshot</Button>
      </div>
    </Sheet>
  );
}

function defaultFor(k: keyof BodyStat): number {
  if (k === 'weightKg') return 80;
  if (k === 'bodyFatPct') return 18;
  if (k === 'waistCm') return 84;
  if (k === 'chestCm') return 100;
  if (k === 'armCm') return 38;
  if (k === 'thighCm') return 58;
  if (k === 'hipCm') return 96;
  return 0;
}

/* ------------------------------ CARDIO ------------------------------ */

function CardioPanel() {
  const history = useWorkout((s) => s.history);
  const cardio = useMemo(() => history.filter((w) => w.cardio).map((w) => w.cardio!), [history]);

  const totalDist = cardio.reduce((a, c) => a + c.distanceKm, 0);
  const totalMin = cardio.reduce((a, c) => a + c.durationMin, 0);
  const bestDist = Math.max(0, ...cardio.map((c) => c.distanceKm));
  const bestDur = Math.max(0, ...cardio.map((c) => c.durationMin));
  const bestPace = Math.min(...cardio.filter((c) => c.distanceKm > 0).map((c) => c.durationMin / c.distanceKm), Infinity);

  const series = useMemo(
    () => history.filter((w) => w.cardio).slice(0, 12).reverse().map((w) => ({ d: w.date.slice(5, 10), km: Math.round(w.cardio!.distanceKm * 10) / 10 })),
    [history],
  );

  if (cardio.length === 0) {
    return (
      <Card className="text-center space-y-2">
        <Footprints className="mx-auto text-muted" />
        <p className="font-semibold">No cardio logged yet</p>
        <p className="text-sm text-muted">Log a run/row/ride in the Train tab — distance &amp; time earn XP and set PRs.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="py-3 text-center"><CountUp value={Math.round(totalDist * 10) / 10} className="font-mono font-bold text-lg" format={(n) => `${n}`} /><p className="text-[10px] text-muted">km total</p></Card>
        <Card className="py-3 text-center"><CountUp value={Math.round(totalMin)} className="font-mono font-bold text-lg" /><p className="text-[10px] text-muted">min total</p></Card>
        <Card className="py-3 text-center"><CountUp value={cardio.length} className="font-mono font-bold text-lg" /><p className="text-[10px] text-muted">sessions</p></Card>
      </div>

      <Card className="space-y-2">
        <SectionTitle action={<Trophy size={14} className="text-accent-2" />}>Personal bests</SectionTitle>
        <BestRow label="Longest distance" value={`${Math.round(bestDist * 10) / 10} km`} />
        <BestRow label="Longest time" value={`${Math.round(bestDur)} min`} />
        {bestPace !== Infinity && <BestRow label="Best pace" value={`${Math.floor(bestPace)}:${String(Math.round((bestPace % 1) * 60)).padStart(2, '0')} /km`} />}
      </Card>

      {series.length > 1 && (
        <Card>
          <SectionTitle>Distance per session</SectionTitle>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -22, right: 6, top: 6 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} />
                <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} km`, 'Distance']} />
                <Bar dataKey="km" fill="rgb(var(--accent-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function BestRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted">{label}</span><span className="font-mono font-semibold">{value}</span></div>;
}

/* ----------------------------- STRENGTH ----------------------------- */

function StrengthPanel() {
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);

  const volSeries = useMemo(
    () => history.filter((w) => !w.cardio).slice(0, 12).reverse().map((w) => ({ d: w.date.slice(5, 10), kg: Math.round(w.totalVolumeKg ?? 0) })),
    [history],
  );
  const topPrs = useMemo(() => [...prs].sort((a, b) => b.e1rm - a.e1rm).slice(0, 6), [prs]);

  return (
    <div className="space-y-3">
      {volSeries.length > 1 ? (
        <Card>
          <SectionTitle action={<Dumbbell size={14} className="text-accent" />}>Volume per session</SectionTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volSeries} margin={{ left: -12, right: 6, top: 6 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Volume']} />
                <Bar dataKey="kg" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Card className="text-center space-y-2"><Target className="mx-auto text-muted" /><p className="text-sm text-muted">Finish a couple of workouts to see your volume trend.</p></Card>
      )}

      <Card className="space-y-2">
        <SectionTitle action={<Trophy size={14} className="text-accent-2" />}>PR hall</SectionTitle>
        {topPrs.length === 0 && <p className="text-sm text-muted">No PRs yet — your heaviest sets land here.</p>}
        {topPrs.map((pr) => (
          <div key={pr.id} className="flex items-center justify-between">
            <span className="text-sm">{pr.exerciseName}</span>
            <span className="font-mono text-sm">{pr.weightKg}kg×{pr.reps} <Badge color="rgb(var(--accent-2))">e1RM {pr.e1rm}</Badge></span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

// Downscale + compress an image to a small data URL so progress photos fit in
// localStorage without bloating it.
function compressImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}
