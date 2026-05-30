import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, MapPin, RefreshCw, BookOpen, Music, Lock, CalendarDays, LogOut } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button, Toggle, Badge, SectionTitle, Sheet, Pill } from '../components/ui';
import { useSettings } from '../state/settingsStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { rankForXp } from '../data/ranks';
import { pendingCount, syncQueue } from '../lib/offlineQueue';
import { watchGym, DEFAULT_GYM } from '../lib/geo';
import { EXERCISES } from '../data/exercises';
import { exerciseById } from '../data/exercises';
import type { ThemeId } from '../types';
import { haptic } from '../lib/haptics';

const THEMES: { id: ThemeId; name: string; locked: boolean; unlockRank: string }[] = [
  { id: 'forge-dark', name: 'Forge Dark', locked: false, unlockRank: '' },
  { id: 'iron-dawn', name: 'Iron Dawn', locked: false, unlockRank: '' },
  { id: 'crimson-titan', name: 'Crimson Titan', locked: false, unlockRank: '' },
  { id: 'arctic-steel', name: 'Arctic Steel', locked: false, unlockRank: '' },
  { id: 'midnight-ocean', name: 'Midnight Ocean', locked: false, unlockRank: '' },
  { id: 'forest-moss', name: 'Forest Moss', locked: false, unlockRank: '' },
  { id: 'rose-quartz', name: 'Rose Quartz', locked: false, unlockRank: '' },
  { id: 'volcanic-ash', name: 'Volcanic Ash', locked: false, unlockRank: '' },
  { id: 'emerald-forge', name: 'Emerald Forge', locked: true, unlockRank: 'Gold' },
  { id: 'cyber-lime', name: 'Cyber Lime', locked: true, unlockRank: 'Gold' },
  { id: 'obsidian-platinum', name: 'Obsidian Platinum', locked: true, unlockRank: 'Platinum' },
  { id: 'royal-amethyst', name: 'Royal Amethyst', locked: true, unlockRank: 'Platinum' },
  { id: 'synthwave', name: 'Synthwave', locked: true, unlockRank: 'Legend' },
  { id: 'blood-moon', name: 'Blood Moon', locked: true, unlockRank: 'Legend' },
  { id: 'solar-flare', name: 'Solar Flare', locked: true, unlockRank: 'Strongman' },
];

const RANK_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Legend', 'Strongman'];

export default function Profile() {
  const s = useSettings();
  const profile = useUser((u) => u.profile);
  const reset = useUser((u) => u.reset);
  const xp = useGami((g) => g.xp);
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);

  const { tier } = rankForXp(xp);
  const rankIdx = RANK_ORDER.indexOf(tier.name);

  useEffect(() => {
    void pendingCount().then(setPending);
  }, []);

  // Geofenced check-in watcher — only while enabled.
  useEffect(() => {
    if (!s.geofenceEnabled) return;
    const stop = watchGym(DEFAULT_GYM, () => {
      haptic('success');
      alert('🔥 Welcome to the Forge — opening today’s workout.');
      navigate('/train');
    });
    return stop;
  }, [s.geofenceEnabled, navigate]);

  function themeUnlocked(t: (typeof THEMES)[number]) {
    if (!t.locked) return true;
    return rankIdx >= RANK_ORDER.indexOf(t.unlockRank);
  }

  return (
    <Screen title={profile?.name ?? 'You'} subtitle={profile?.email ?? `${profile?.authProvider ?? 'guest'} account`}>
      {/* Theme switcher */}
      <div>
        <SectionTitle action={<Palette size={14} className="text-muted" />}>Theme</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const unlocked = themeUnlocked(t);
            const active = s.theme === t.id;
            return (
              <button
                key={t.id}
                disabled={!unlocked}
                onClick={() => { s.set('theme', t.id); haptic('tap'); }}
                data-theme={t.id}
                className={`relative rounded-xl border p-3 text-left ${active ? 'border-accent ring-1 ring-accent' : 'border-line'} ${!unlocked ? 'opacity-50' : ''}`}
                style={{ background: 'rgb(var(--surface))' }}
              >
                <div className="flex gap-1 mb-2">
                  <span className="w-4 h-4 rounded-full" style={{ background: 'rgb(var(--accent))' }} />
                  <span className="w-4 h-4 rounded-full" style={{ background: 'rgb(var(--accent-2))' }} />
                  <span className="w-4 h-4 rounded-full" style={{ background: 'rgb(var(--surface-2))' }} />
                </div>
                <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'rgb(var(--text))' }}>
                  {t.name} {!unlocked && <Lock size={12} />}
                </p>
                {!unlocked && <p className="text-[10px]" style={{ color: 'rgb(var(--muted))' }}>Unlocks at {t.unlockRank}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quote genre */}
      <div>
        <SectionTitle action={<BookOpen size={14} className="text-muted" />}>Daily quote genre</SectionTitle>
        <div className="flex gap-2">
          <Pill active={s.quoteGenre === 'stoic'} onClick={() => s.set('quoteGenre', 'stoic')}>Stoic</Pill>
          <Pill active={s.quoteGenre === 'biblical'} onClick={() => s.set('quoteGenre', 'biblical')}>Biblical</Pill>
        </div>
      </div>

      {/* Toggles */}
      <div>
        <SectionTitle>Preferences</SectionTitle>
        <Card className="divide-y divide-line">
          <Row label="Public leaderboard" desc="Show your rank to others">
            <Toggle checked={s.leaderboardPublic} onChange={(v) => s.set('leaderboardPublic', v)} />
          </Row>
          <Row label="Streak gambling" desc="Wager coins on session targets">
            <Toggle checked={s.streakGambling} onChange={(v) => s.set('streakGambling', v)} />
          </Row>
          <Row label="Routine marketplace" desc="Buy & sell programs">
            <Toggle checked={s.marketplaceEnabled} onChange={(v) => s.set('marketplaceEnabled', v)} />
          </Row>
          <Row label="Haptics" desc="Vibration feedback">
            <Toggle checked={s.hapticsEnabled} onChange={(v) => s.set('hapticsEnabled', v)} />
          </Row>
          <Row label="Gym geofence" desc="“Welcome to the Forge” check-in">
            <Toggle checked={s.geofenceEnabled} onChange={(v) => s.set('geofenceEnabled', v)} />
          </Row>
        </Card>
      </div>

      {/* XP -> coin exchange rate */}
      <div>
        <SectionTitle>XP → Forge Coin rate</SectionTitle>
        <Card>
          <input type="range" min={50} max={300} step={10} value={s.xpToCoinRate} onChange={(e) => s.set('xpToCoinRate', Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
          <p className="text-sm text-center font-mono">{s.xpToCoinRate} XP = 🪙 1</p>
        </Card>
      </div>

      {/* Plan editor */}
      <Button variant="ghost" className="w-full justify-center" onClick={() => setPlanOpen(true)}>
        <span className="flex items-center gap-2"><CalendarDays size={16} /> Edit week plan</span>
      </Button>

      {/* Offline sync */}
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="text-muted" />
          <div>
            <p className="text-sm">Offline sync</p>
            <p className="text-[11px] text-muted">{pending} queued · {navigator.onLine ? 'online' : 'offline'}</p>
          </div>
        </div>
        <Button variant="outline" className="py-1.5" onClick={async () => { const r = await syncQueue(); setPending(0); haptic('success'); alert(`Synced ${r.synced} item(s).`); }}>Sync now</Button>
      </Card>

      <Card className="flex items-center justify-between" onClick={() => navigate('/spotify')}>
        <div className="flex items-center gap-2"><Music size={16} className="text-muted" /><span className="text-sm">Spotify player</span></div>
        <Badge>Open</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/library')}>
        <div className="flex items-center gap-2"><BookOpen size={16} className="text-muted" /><span className="text-sm">Exercise library</span></div>
        <Badge>{EXERCISES.length}</Badge>
      </Card>

      <Card className="flex items-center justify-between bg-surface-2">
        <div className="flex items-center gap-2"><MapPin size={16} className="text-muted" /><span className="text-xs text-muted">Geofence: {DEFAULT_GYM.name} · {DEFAULT_GYM.radiusM}m</span></div>
      </Card>

      <Button variant="outline" className="w-full justify-center text-danger" onClick={() => { if (confirm('Reset profile and onboarding?')) { reset(); navigate('/onboarding'); } }}>
        <span className="flex items-center gap-2"><LogOut size={16} /> Reset / sign out</span>
      </Button>

      <PlanEditor open={planOpen} onClose={() => setPlanOpen(false)} />
    </Screen>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-[11px] text-muted">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function PlanEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plan = useUser((s) => s.weekPlan);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const [editDay, setEditDay] = useState<string | null>(null);

  if (!plan) return null;

  function toggleRest(day: string) {
    setWeekPlan({ ...plan!, days: plan!.days.map((d) => (d.day === day ? { ...d, rest: !d.rest, label: d.rest ? 'Training' : 'Rest', exerciseIds: d.rest ? d.exerciseIds : [] } : d)) });
  }
  function renameDay(day: string, label: string) {
    setWeekPlan({ ...plan!, days: plan!.days.map((d) => (d.day === day ? { ...d, label } : d)) });
  }
  function swapExercise(day: string, oldId: string, newId: string) {
    setWeekPlan({ ...plan!, days: plan!.days.map((d) => (d.day === day ? { ...d, exerciseIds: d.exerciseIds.map((id) => (id === oldId ? newId : id)) } : d)) });
  }

  const day = plan.days.find((d) => d.day === editDay);

  return (
    <Sheet open={open} onClose={onClose} title="Edit week plan">
      <div className="space-y-2">
        {plan.days.map((d) => (
          <div key={d.day} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <span className="font-mono text-xs w-6">{d.day}</span>
            <input value={d.label} onChange={(e) => renameDay(d.day, e.target.value)} disabled={d.rest} className="flex-1 bg-transparent text-sm outline-none disabled:text-muted" />
            <button onClick={() => toggleRest(d.day)} className="text-[11px] text-accent-2">{d.rest ? 'make training' : 'make rest'}</button>
            {!d.rest && <button onClick={() => setEditDay(editDay === d.day ? null : d.day)} className="text-[11px] text-muted">{editDay === d.day ? 'close' : 'exercises'}</button>}
          </div>
        ))}

        {day && !day.rest && (
          <div className="rounded-xl bg-surface p-3 border border-line space-y-2">
            <p className="text-xs text-muted">{day.label} — tap an exercise to swap it</p>
            {day.exerciseIds.length === 0 && <p className="text-xs text-muted">No exercises. Generated days come pre-filled.</p>}
            {day.exerciseIds.map((id) => {
              const ex = exerciseById(id);
              const alts = EXERCISES.filter((e) => e.primary === ex?.primary).slice(0, 5);
              return (
                <details key={id} className="text-sm">
                  <summary className="cursor-pointer py-1">{ex?.name ?? id}</summary>
                  <div className="pl-3 space-y-1 mt-1">
                    {alts.map((a) => (
                      <button key={a.id} onClick={() => swapExercise(day.day, id, a.id)} className="block text-left text-xs text-muted hover:text-text">→ {a.name}</button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted/70">Change training days and swap workouts freely — saved instantly.</p>
      </div>
    </Sheet>
  );
}
