import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Moon, Footprints, HeartPulse, Flame, Watch, RefreshCw, FileUp,
  Copy, Check, Trash2, Plus, BatteryCharging, AlertTriangle, Smartphone,
} from 'lucide-react';
import { Card, Button, Badge, SectionTitle } from '../components/ui';
import { useHealth, sortedDays } from '../state/healthStore';
import { parseHealthText, HEALTH_CSV_TEMPLATE, sleepToMinutes } from '../lib/health';
import { readinessFromDays, recoveryTrend } from '../lib/readiness';
import { ReadinessHero } from '../components/Readiness';
import { Sparkline } from '../components/Sparkline';
import {
  platformSupportsHealthConnect, healthConnectAvailable,
  requestHealthConnectPermissions, readHealthConnect, configureBackgroundSync,
} from '../lib/healthConnect';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { openTutorial } from '../components/Tutorial';
import type { HealthDay } from '../types';

function fmtSleep(min?: number): string {
  if (!min) return '—';
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function relTime(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function Health() {
  const navigate = useNavigate();
  const days = useHealth((s) => s.days);
  const lastSyncAt = useHealth((s) => s.lastSyncAt);
  const ingest = useHealth((s) => s.ingest);
  const upsertDay = useHealth((s) => s.upsertDay);
  const removeDay = useHealth((s) => s.removeDay);

  const list = useMemo(() => sortedDays(days), [days]);
  const latest = list[0];
  const readiness = useMemo(() => readinessFromDays(list), [list]);
  const trend = useMemo(() => recoveryTrend(list), [list]);

  const [hcStatus, setHcStatus] = useState<'checking' | 'ready' | 'unavailable' | 'web'>('checking');
  const [syncing, setSyncing] = useState(false);
  // "Connected" once auto-synced data has actually arrived on this device.
  const hasAutoData = useMemo(() => list.some((d) => d.source === 'healthconnect'), [list]);
  const connected = hcStatus === 'ready' && hasAutoData;

  useEffect(() => {
    if (!platformSupportsHealthConnect()) { setHcStatus('web'); return; }
    healthConnectAvailable().then(async (ok) => {
      setHcStatus(ok ? 'ready' : 'unavailable');
      // Seamless: if we already have permission, silently refresh on open.
      if (ok) {
        const rows = await readHealthConnect(21); // returns [] without permission
        if (rows.length) ingest(rows, 'healthconnect');
      }
    });
  }, [ingest]);

  // Keep data fresh while the screen stays open (no-op without permission).
  useEffect(() => {
    if (hcStatus !== 'ready') return;
    const id = setInterval(async () => {
      const rows = await readHealthConnect(21);
      if (rows.length) ingest(rows, 'healthconnect');
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [hcStatus, ingest]);

  async function autoSync() {
    setSyncing(true);
    haptic('tap');
    try {
      const granted = await requestHealthConnectPermissions();
      if (!granted) { toast('Health Connect permission was not granted.', 'info'); return; }
      // From now on data also flows while the app is closed; user-initiated,
      // so it may prompt once for the notification permission (Android 13+).
      void configureBackgroundSync(true, { interactive: true });
      const rows = await readHealthConnect(21);
      if (!rows.length) { toast('Connected, but no data came back yet. Make sure Garmin Connect is syncing to Health Connect.', 'info'); return; }
      const n = ingest(rows, 'healthconnect');
      celebrate();
      toast(`Synced ${n} day(s) from Health Connect 🔥`, 'success');
    } finally { setSyncing(false); }
  }

  return (
    <div className="px-4 pt-12 pb-10 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
        {lastSyncAt && (
          <span className={`text-[11px] ${Date.now() - lastSyncAt > 12 * 3600 * 1000 ? 'text-warn' : 'text-muted'}`}>
            Synced {relTime(lastSyncAt)}
          </span>
        )}
      </div>

      <div className="text-center space-y-1">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center"><Watch className="text-accent" size={24} /></div>
        <h1 className="text-2xl font-extrabold tracking-tight">Health &amp; recovery</h1>
        <p className="text-sm text-muted">Pull in sleep and daily activity from Garmin — automatically on the app, or by import anywhere.</p>
      </div>

      {/* Recovery readiness hero */}
      {readiness && <ReadinessHero r={readiness} />}

      {/* Today / last-night summary */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={Moon} label="Sleep" value={fmtSleep(latest?.sleepMinutes)} sub={latest?.sleepScore ? `Score ${latest.sleepScore}` : latest?.date} />
        <Stat icon={Footprints} label="Steps" value={latest?.steps != null ? latest.steps.toLocaleString() : '—'} sub={latest?.date} />
        <Stat icon={HeartPulse} label="Resting HR" value={latest?.restingHr != null ? `${latest.restingHr} bpm` : '—'} />
        <Stat icon={Flame} label="Active kcal" value={latest?.activeCalories != null ? latest.activeCalories.toLocaleString() : '—'} sub={latest?.bodyBattery != null ? `Body Battery ${latest.bodyBattery}` : undefined} />
      </div>

      {/* 7-day recovery trends */}
      {trend.scores.length >= 2 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">7-day recovery</p>
            {trend.avgScore != null && <Badge color={readiness?.color ?? 'rgb(var(--accent))'}>avg {trend.avgScore}</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <Sparkline values={trend.scores} color={readiness?.color ?? 'rgb(var(--accent))'} />
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <TrendStat label="Avg sleep" value={trend.avgSleepMin != null ? fmtDur(trend.avgSleepMin) : '—'} />
              <TrendStat label="Sleep debt" value={trend.sleepDebtMin > 0 ? `-${fmtDur(trend.sleepDebtMin)}` : 'none'} warn={trend.sleepDebtMin >= 240} />
              <TrendStat
                label="Rest HR"
                value={trend.rhrAvg != null ? `${trend.rhrAvg}` : '—'}
                sub={trend.rhrDrift != null && trend.rhrDrift !== 0 ? `${trend.rhrDrift > 0 ? '▲' : '▼'}${Math.abs(trend.rhrDrift)}` : undefined}
                warn={(trend.rhrDrift ?? 0) >= 3}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Garmin connection — one clear card with one clear action, in every state */}
      <Card className="border-accent/40 bg-accent/5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Watch size={18} className="text-accent" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Garmin auto-sync</p>
            <p className="text-[11px] text-muted">Sleep &amp; activity flow in on their own — even with the app closed.</p>
          </div>
          {connected && <Badge color="rgb(var(--success))">Connected</Badge>}
        </div>

        {connected ? (
          <>
            <p className="text-[11px] text-muted flex items-start gap-1.5">
              <Check size={13} className="mt-0.5 shrink-0 text-success" /> All set — nothing else to do. New data shows up here by itself.
            </p>
            <Button variant="ghost" className="w-full justify-center" disabled={syncing} onClick={autoSync}>
              <span className="flex items-center gap-1.5"><RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Syncing…' : 'Sync now'}</span>
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <SetupStep n={1} done={hcStatus === 'ready' || hcStatus === 'unavailable'}>Install the <b>ForgeOS Android app</b></SetupStep>
              <SetupStep n={2} done={hcStatus === 'ready'}>In <b>Garmin Connect</b>: profile picture → Settings → <b>Health Connect</b> → allow sleep &amp; activity</SetupStep>
              <SetupStep n={3}>Tap the button — one permission screen, then it’s automatic forever</SetupStep>
            </div>
            {hcStatus === 'ready' && (
              <Button className="w-full justify-center" disabled={syncing} onClick={autoSync}>
                <span className="flex items-center gap-1.5"><Watch size={15} className={syncing ? 'animate-pulse' : ''} />{syncing ? 'Connecting…' : 'Connect Garmin'}</span>
              </Button>
            )}
            {hcStatus === 'web' && (
              <Button className="w-full justify-center" onClick={() => navigate('/download')}>
                <span className="flex items-center gap-1.5"><Smartphone size={15} /> Get the Android app</span>
              </Button>
            )}
            {hcStatus === 'unavailable' && (
              <>
                <Button className="w-full justify-center" onClick={() => window.open('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata', '_blank')}>
                  <span className="flex items-center gap-1.5"><BatteryCharging size={15} /> Get Health Connect</span>
                </Button>
                <p className="text-[11px] text-warn flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Health Connect isn’t ready on this phone yet. It’s built into Android 14+; on older Android install it from Play. Also grab the newest ForgeOS APK from the download page — older ones can’t auto-sync.</p>
              </>
            )}
            {hcStatus === 'checking' && (
              <Button className="w-full justify-center" disabled>
                <span className="flex items-center gap-1.5"><RefreshCw size={15} className="animate-spin" /> Checking this phone…</span>
              </Button>
            )}
          </>
        )}
        <button onClick={() => openTutorial('garmin')} className="w-full text-center text-[11px] text-accent">
          How does Garmin sync work?
        </button>
      </Card>

      <ManualImport onImport={(rows) => { const n = ingest(rows, 'import'); if (n) { celebrate(); toast(`Imported ${n} day(s) 🎉`, 'success'); } else toast('No usable days found in that file.', 'info'); }} />

      <QuickLog onSave={(d) => { upsertDay(d); haptic('success'); toast('Logged today’s recovery.'); }} />

      {/* Recent days */}
      {list.length > 0 && (
        <div>
          <SectionTitle>Recent days</SectionTitle>
          <div className="space-y-1.5">
            {list.slice(0, 14).map((d) => (
              <Card key={d.date} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="text-[11px] text-muted flex flex-wrap gap-x-2">
                    {d.sleepMinutes != null && <span>{fmtSleep(d.sleepMinutes)} sleep</span>}
                    {d.steps != null && <span>{d.steps.toLocaleString()} steps</span>}
                    {d.restingHr != null && <span>{d.restingHr} bpm</span>}
                    {d.activeCalories != null && <span>{d.activeCalories} kcal</span>}
                  </p>
                </div>
                <Badge>{d.source === 'healthconnect' ? 'auto' : d.source}</Badge>
                <button onClick={() => { removeDay(d.date); haptic('warning'); }} className="text-muted hover:text-warn p-1" aria-label="Delete day"><Trash2 size={15} /></button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted/60 text-center">Your health data stays on your device. Nothing is uploaded.</p>
    </div>
  );
}

function SetupStep({ n, done, children }: { n: number; done?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${done ? 'bg-success/20 text-success' : 'bg-surface-2 text-muted'}`}>
        {done ? <Check size={11} /> : n}
      </span>
      <p className={`text-[11px] leading-snug ${done ? 'text-muted' : ''}`}>{children}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Moon; label: string; value: string; sub?: string }) {
  return (
    <Card className="space-y-0.5 py-3">
      <div className="flex items-center gap-1.5 text-muted text-[11px] uppercase tracking-wide"><Icon size={13} /> {label}</div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[11px] text-muted truncate">{sub}</p>}
    </Card>
  );
}

function TrendStat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-sm font-bold ${warn ? 'text-warn' : ''}`}>
        {value}{sub && <span className="text-[10px] font-normal text-muted ml-0.5">{sub}</span>}
      </p>
    </div>
  );
}

function ManualImport({ onImport }: { onImport: (rows: HealthDay[]) => void }) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function analyze(input: string) {
    const { days, notes, format } = parseHealthText(input);
    setCount(days.length);
    if (days.length) { haptic('tap'); onImport(days); setText(''); setCount(null); }
    else { haptic('warning'); toast(`${notes[0] ?? 'Nothing recognised'} (${format})`, 'info'); }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <FileUp size={18} className="text-accent-2 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Import from a file or paste</p>
          <p className="text-[11px] text-muted">Garmin export, a CSV, or JSON — we match the columns for you.</p>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setCount(null); }}
        placeholder={'Paste CSV or JSON here, e.g.\n' + HEALTH_CSV_TEMPLATE}
        className="w-full h-28 rounded-xl bg-surface-2 border border-line px-3 py-2 text-xs font-mono"
      />
      {count === 0 && <p className="text-[11px] text-warn">No rows matched a date + a metric.</p>}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => fileRef.current?.click()}>
          <span className="flex items-center gap-1.5 text-sm"><FileUp size={14} /> File</span>
        </Button>
        <Button className="flex-1 justify-center" disabled={!text.trim()} onClick={() => analyze(text)}>Import paste</Button>
      </div>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(HEALTH_CSV_TEMPLATE); setCopied(true); toast('Template copied — fill it in a notes/Sheets app.'); setTimeout(() => setCopied(false), 2000); } catch { toast('Could not copy — select the placeholder text.', 'error'); } }}
        className="text-[11px] text-accent flex items-center gap-1 mx-auto"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy the CSV template'}
      </button>
      <input ref={fileRef} type="file" accept=".csv,.json,.txt,text/csv,application/json,text/plain" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) analyze(await f.text()); }} />
    </Card>
  );
}

function QuickLog({ onSave }: { onSave: (d: HealthDay) => void }) {
  const [open, setOpen] = useState(false);
  const [sleep, setSleep] = useState('');
  const [steps, setSteps] = useState('');
  const [rhr, setRhr] = useState('');

  function save() {
    const day: HealthDay = { date: todayKey(), source: 'manual', updatedAt: Date.now() };
    const sm = sleepToMinutes(sleep);
    if (sm) day.sleepMinutes = sm;
    if (steps) day.steps = parseInt(steps, 10) || undefined;
    if (rhr) day.restingHr = parseInt(rhr, 10) || undefined;
    if (day.sleepMinutes == null && day.steps == null && day.restingHr == null) { toast('Fill in at least one field.', 'info'); return; }
    onSave(day);
    setSleep(''); setSteps(''); setRhr(''); setOpen(false);
  }

  if (!open) return (
    <Button variant="outline" className="w-full justify-center" onClick={() => setOpen(true)}>
      <span className="flex items-center gap-1.5"><Plus size={15} /> Log today by hand</span>
    </Button>
  );

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Today’s recovery</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[11px] text-muted">Sleep<input value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7h 30m" className="w-full mt-0.5 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-text" /></label>
          <label className="text-[11px] text-muted">Steps<input value={steps} onChange={(e) => setSteps(e.target.value)} inputMode="numeric" placeholder="9000" className="w-full mt-0.5 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-text" /></label>
          <label className="text-[11px] text-muted">Rest HR<input value={rhr} onChange={(e) => setRhr(e.target.value)} inputMode="numeric" placeholder="52" className="w-full mt-0.5 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-text" /></label>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 justify-center" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="flex-1 justify-center" onClick={save}>Save</Button>
        </div>
      </Card>
    </motion.div>
  );
}
