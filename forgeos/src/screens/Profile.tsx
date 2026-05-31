import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, MapPin, RefreshCw, BookOpen, Music, Lock, CalendarDays, LogOut, Languages } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button, Toggle, Badge, SectionTitle, Sheet, Pill } from '../components/ui';
import { useSettings } from '../state/settingsStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { rankForXp } from '../data/ranks';
import { pendingCount, syncQueue } from '../lib/offlineQueue';
import { useT, LANGUAGES } from '../lib/i18n';
import { QUOTE_GENRES } from '../data/quotes';
import { watchGym } from '../lib/geo';
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
  const t = useT();
  const s = useSettings();
  const profile = useUser((u) => u.profile);
  const reset = useUser((u) => u.reset);
  const xp = useGami((g) => g.xp);
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [gymBusy, setGymBusy] = useState(false);
  const [gymMsg, setGymMsg] = useState<string | null>(null);

  function setGymToHere() {
    if (!navigator.geolocation) {
      setGymMsg('Location not available on this device.');
      return;
    }
    setGymBusy(true);
    setGymMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        s.set('gym', { ...s.gym, lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGymBusy(false);
        setGymMsg('Saved this spot as your gym ✅');
        haptic('success');
      },
      () => {
        setGymBusy(false);
        setGymMsg('Couldn’t get your location (permission denied?).');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const { tier } = rankForXp(xp);
  const rankIdx = RANK_ORDER.indexOf(tier.name);

  useEffect(() => {
    void pendingCount().then(setPending);
  }, []);

  // Geofenced check-in watcher — only while enabled, uses your saved gym.
  useEffect(() => {
    if (!s.geofenceEnabled) return;
    const stop = watchGym(s.gym, () => {
      haptic('success');
      alert('🔥 Welcome to the Forge — opening today’s workout.');
      navigate('/train');
    });
    return stop;
  }, [s.geofenceEnabled, s.gym, navigate]);

  function themeUnlocked(t: (typeof THEMES)[number]) {
    if (!t.locked) return true;
    return rankIdx >= RANK_ORDER.indexOf(t.unlockRank);
  }

  return (
    <Screen title={profile?.name ?? 'You'} subtitle={profile?.email ?? `${profile?.authProvider ?? 'guest'} account`}>
      {/* Theme switcher */}
      <div>
        <SectionTitle action={<Palette size={14} className="text-muted" />}>{t('p.theme')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((th) => {
            const unlocked = themeUnlocked(th);
            const active = s.theme === th.id;
            return (
              <button
                key={th.id}
                disabled={!unlocked}
                onClick={() => { s.set('theme', th.id); haptic('tap'); }}
                data-theme={th.id}
                className={`relative rounded-xl border p-3 text-left ${active ? 'border-accent ring-1 ring-accent' : 'border-line'} ${!unlocked ? 'opacity-50' : ''}`}
                style={{ background: 'rgb(var(--surface))' }}
              >
                <div className="flex gap-1 mb-2">
                  <span className="w-4 h-4 rounded-full" style={{ background: 'rgb(var(--accent))' }} />
                  <span className="w-4 h-4 rounded-full" style={{ background: 'rgb(var(--accent-2))' }} />
                  <span className="w-4 h-4 rounded-full" style={{ background: 'rgb(var(--surface-2))' }} />
                </div>
                <p className="text-sm font-medium flex items-center gap-1" style={{ color: 'rgb(var(--text))' }}>
                  {th.name} {!unlocked && <Lock size={12} />}
                </p>
                {!unlocked && <p className="text-[10px]" style={{ color: 'rgb(var(--muted))' }}>Unlocks at {th.unlockRank}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <SectionTitle action={<Languages size={14} className="text-muted" />}>{t('p.language')}</SectionTitle>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <Pill key={l.id} active={s.language === l.id} onClick={() => s.set('language', l.id)}>{l.label}</Pill>
          ))}
        </div>
      </div>

      {/* Quote genre */}
      <div>
        <SectionTitle action={<BookOpen size={14} className="text-muted" />}>{t('p.quoteGenre')}</SectionTitle>
        <div className="flex gap-2 flex-wrap" data-noswipe>
          {QUOTE_GENRES.map((g) => (
            <Pill key={g.id} active={s.quoteGenre === g.id} onClick={() => s.set('quoteGenre', g.id)}>{g.label}</Pill>
          ))}
          <Pill active={s.quoteGenre === 'all'} onClick={() => s.set('quoteGenre', 'all')}>All</Pill>
        </div>
        <button onClick={() => navigate('/collection')} className="text-xs text-accent-2 mt-2 flex items-center gap-1">
          <BookOpen size={13} /> View quote collection
        </button>
      </div>

      {/* Toggles */}
      <div>
        <SectionTitle>{t('p.preferences')}</SectionTitle>
        <Card className="divide-y divide-line">
          <Row label={t('p.publicLeaderboard')} desc="Show your rank to others">
            <Toggle checked={s.leaderboardPublic} onChange={(v) => s.set('leaderboardPublic', v)} />
          </Row>
          <Row label={t('p.streakGambling')} desc="Wager coins on session targets">
            <Toggle checked={s.streakGambling} onChange={(v) => s.set('streakGambling', v)} />
          </Row>
          <Row label={t('p.marketplace')} desc="Buy & sell programs">
            <Toggle checked={s.marketplaceEnabled} onChange={(v) => s.set('marketplaceEnabled', v)} />
          </Row>
          <Row label={t('p.haptics')} desc="Vibration feedback">
            <Toggle checked={s.hapticsEnabled} onChange={(v) => s.set('hapticsEnabled', v)} />
          </Row>
          <Row label={t('p.geofence')} desc="“Welcome to the Forge” check-in">
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
        <span className="flex items-center gap-2"><CalendarDays size={16} /> {t('p.editPlan')}</span>
      </Button>

      {/* Offline sync */}
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="text-muted" />
          <div>
            <p className="text-sm">{t('p.offlineSync')}</p>
            <p className="text-[11px] text-muted">{pending} queued · {navigator.onLine ? 'online' : 'offline'}</p>
          </div>
        </div>
        <Button variant="outline" className="py-1.5" onClick={async () => { const r = await syncQueue(); setPending(0); haptic('success'); alert(`Synced ${r.synced} item(s).`); }}>{t('p.syncNow')}</Button>
      </Card>

      <Card className="flex items-center justify-between" onClick={() => navigate('/spotify')}>
        <div className="flex items-center gap-2"><Music size={16} className="text-muted" /><span className="text-sm">{t('p.spotify')}</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/library')}>
        <div className="flex items-center gap-2"><BookOpen size={16} className="text-muted" /><span className="text-sm">Exercise library</span></div>
        <Badge>{EXERCISES.length}</Badge>
      </Card>

      {/* Your gym */}
      <div>
        <SectionTitle action={<MapPin size={14} className="text-muted" />}>{t('p.yourGym')}</SectionTitle>
        <Card className="space-y-3">
          <input
            value={s.gym.name}
            onChange={(e) => s.set('gym', { ...s.gym, name: e.target.value })}
            placeholder="Gym name"
            className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm"
          />
          <Button variant="outline" className="w-full justify-center" onClick={setGymToHere}>
            <span className="flex items-center gap-2"><MapPin size={15} /> {gymBusy ? t('p.locating') : t('p.useLocation')}</span>
          </Button>
          {gymMsg && <p className="text-[11px] text-accent-2">{gymMsg}</p>}
          <div>
            <p className="text-xs text-muted mb-1">{t('p.radius')}: {s.gym.radiusM} m</p>
            <input type="range" min={50} max={500} step={10} value={s.gym.radiusM} onChange={(e) => s.set('gym', { ...s.gym, radiusM: Number(e.target.value) })} className="w-full accent-[rgb(var(--accent))]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('p.maxWeight')}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => s.set('gym', { ...s.gym, maxWeightKg: Math.max(0, s.gym.maxWeightKg - 2.5) })} className="w-8 h-8 rounded-md bg-surface-2">−</button>
              <span className="font-mono font-bold w-16 text-center">{s.gym.maxWeightKg} kg</span>
              <button onClick={() => s.set('gym', { ...s.gym, maxWeightKg: s.gym.maxWeightKg + 2.5 })} className="w-8 h-8 rounded-md bg-surface-2">+</button>
            </div>
          </div>
          <p className="text-[11px] text-muted/70">{t('p.gymHint')}</p>
        </Card>
      </div>

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
