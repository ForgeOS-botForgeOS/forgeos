import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, MapPin, RefreshCw, BookOpen, Music, Lock, CalendarDays, LogOut, Languages, Trophy, Bell, Database, HelpCircle, Shield, Globe2, LineChart, Smartphone, Download, Pencil, Watch, Gift } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button, Toggle, Badge, SectionTitle, Pill } from '../components/ui';
import { pushMyActivity } from '../lib/activitySync';
import { configureBackgroundSync } from '../lib/healthConnect';
import { checkForApkUpdate } from '../lib/appUpdate';
import { installApkUpdate } from '../lib/webUpdate';
import { useHealth } from '../state/healthStore';
import { useSettings } from '../state/settingsStore';
import { useUser } from '../state/userStore';
import { useGami } from '../state/gamificationStore';
import { rankForXp, rankLabel } from '../data/ranks';
import { pendingCount, syncQueue } from '../lib/offlineQueue';
import { useT, LANGUAGES } from '../lib/i18n';
import { QUOTE_GENRES } from '../data/quotes';
import { requestNotifyPermission } from '../lib/reminders';
import { exportData, importData } from '../lib/backup';
import { useCosmetics } from '../state/cosmeticsStore';
import { cosmeticById } from '../data/cosmetics';
import { openTutorial } from '../components/Tutorial';
import { ChangePasswordSheet, PasscodeSheet } from '../components/SecuritySheets';
import { toast } from '../lib/toast';
import { pushCloudBackup, pullCloudBackup, cloudSyncAvailable } from '../lib/cloudSync';
import { signOutEverywhere } from '../lib/supabase';
import { useWorkout } from '../state/workoutStore';
import { useQuotes } from '../state/quoteStore';
import { ACHIEVEMENTS } from '../data/achievements';
import { shareProfile, generateProfileCard, type PublicProfile } from '../lib/profileShare';
import { downloadDataUrl } from '../lib/shareCard';
import { EXERCISES } from '../data/exercises';
import type { ThemeId } from '../types';
import { haptic } from '../lib/haptics';

const THEMES: { id: ThemeId; name: string; locked: boolean; unlockRank: string }[] = [
  { id: 'forge-dark', name: 'Forge Dark', locked: false, unlockRank: '' },
  { id: 'iron-dawn', name: 'Iron Dawn', locked: false, unlockRank: '' },
  { id: 'crimson-titan', name: 'Crimson Titan', locked: false, unlockRank: '' },
  { id: 'arctic-steel', name: 'Arctic Steel', locked: false, unlockRank: '' },
  { id: 'daybreak-light', name: 'Daybreak (light)', locked: false, unlockRank: '' },
  { id: 'paper-light', name: 'Paper (light)', locked: false, unlockRank: '' },
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
  const updateProfile = useUser((u) => u.updateProfile);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const xp = useGami((g) => g.xp);
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [gymBusy, setGymBusy] = useState(false);
  const [gymMsg, setGymMsg] = useState<string | null>(null);
  const [pwSheet, setPwSheet] = useState(false);
  const [passcodeSheet, setPasscodeSheet] = useState<null | 'set' | 'change'>(null);
  const [cloudConfirm, setCloudConfirm] = useState(false);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updating, setUpdating] = useState(false);
  useEffect(() => { void checkForApkUpdate().then((u) => setUpdateReady(u.available)); }, []);

  // One-tap core update: the app downloads the APK itself and Android's
  // installer takes over. Old APKs without the native method fall back to the
  // classic download page.
  async function handleApkUpdate() {
    setUpdating(true);
    toast('Getting the update… Android will ask you to confirm 📲', 'info');
    const started = await installApkUpdate();
    setUpdating(false);
    if (!started) navigate('/download');
  }
  const equippedTitle = useCosmetics((c) => c.equippedTitle);
  const equippedFrame = useCosmetics((c) => c.equippedFrame);
  const ownedCosmetics = useCosmetics((c) => c.owned);

  function saveName() {
    const next = nameDraft.trim();
    setEditingName(false);
    if (!next || next === profile?.name) return;
    updateProfile({ name: next });
    void pushMyActivity(); // let friends see the new name
    haptic('success');
    toast('Name updated ✅');
  }

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

  function buildSummary(): PublicProfile {
    const w = useWorkout.getState();
    const g = useGami.getState();
    const q = useQuotes.getState();
    const { tier, index } = rankForXp(g.xp);
    const stats = {
      sessions: w.history.length,
      prs: w.prs.length,
      streak: g.streakDays,
      totalVolumeKg: w.history.reduce((a, x) => a + (x.totalVolumeKg ?? 0), 0),
      quotes: q.collected.length,
      coins: g.coins,
      rankIndex: index,
      heavyLifts: g.heavyLifts,
      cardioKm: w.history.reduce((a, x) => a + (x.cardio?.distanceKm ?? 0), 0),
      sleepNights8h: Object.values(useHealth.getState().days).filter((d) => (d.sleepMinutes ?? 0) >= 480).length,
      totalSteps: Object.values(useHealth.getState().days).reduce((a, d) => a + (d.steps ?? 0), 0),
    };
    const achievements = ACHIEVEMENTS.filter((a) => a.value(stats) >= a.goal).length;
    const bestLifts = [...w.prs].sort((a, b) => b.e1rm - a.e1rm).slice(0, 3).map((p) => ({ name: p.exerciseName, e1rm: p.e1rm }));
    return { name: profile?.name ?? 'Athlete', rank: rankLabel(tier), xp: g.xp, streak: g.weekStreak, sessions: w.history.length, achievements, title: title ?? undefined, bestLifts };
  }
  async function shareMyProfile() {
    const r = await shareProfile(buildSummary());
    if (r === 'copied') toast('Public profile link copied to clipboard.');
    else toast('Profile shared 🔥');
  }

  const { tier } = rankForXp(xp);
  const rankIdx = RANK_ORDER.indexOf(tier.name);

  useEffect(() => {
    void pendingCount().then(setPending);
  }, []);

  function themeUnlocked(t: (typeof THEMES)[number]) {
    if (!t.locked) return true;
    if (rankIdx >= RANK_ORDER.indexOf(t.unlockRank)) return true;
    // Or bought in the Forge Shop.
    return ownedCosmetics.some((id) => cosmeticById(id)?.type === 'theme' && cosmeticById(id)?.value === t.id);
  }

  const title = equippedTitle ? cosmeticById(equippedTitle)?.value : null;
  const frame = equippedFrame ? cosmeticById(equippedFrame)?.value : null;

  return (
    <Screen title={profile?.name ?? 'You'} subtitle={title ?? (profile?.email ?? `${profile?.authProvider ?? 'guest'} account`)}>
      {/* APK update nudge — only appears when a newer build is published */}
      {updateReady && (
        <Card className="border-accent/40 bg-accent/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0"><Download size={18} className="text-accent" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Core update ready</p>
            <p className="text-[11px] text-muted">Tap Update — the app fetches it and Android asks to confirm the install. Nothing is lost.</p>
          </div>
          <Button disabled={updating} onClick={() => { void handleApkUpdate(); }}>{updating ? 'Getting it…' : 'Update'}</Button>
        </Card>
      )}

      {/* Identity card with equipped cosmetics */}
      <Card className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full p-[3px]" style={{ background: frame ?? 'rgb(var(--line))' }}>
          <div className="w-full h-full rounded-full bg-surface-2 flex items-center justify-center text-lg font-extrabold text-accent">
            {(profile?.name ?? 'Y').slice(0, 2).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              maxLength={24}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              onBlur={saveName}
              placeholder="Your name"
              className="w-full rounded-lg bg-surface-2 border border-line px-2 py-1 text-sm font-bold"
            />
          ) : (
            <button
              onClick={() => { setNameDraft(profile?.name ?? ''); setEditingName(true); haptic('tap'); }}
              className="flex items-center gap-1.5 font-bold text-left"
            >
              <span className="truncate">{profile?.name ?? 'You'}</span>
              <Pencil size={13} className="text-muted shrink-0" />
            </button>
          )}
          {title && <p className="text-xs text-accent-2 font-semibold">“{title}”</p>}
        </div>
        <Button variant="ghost" className="py-1.5" onClick={() => navigate('/shop')}>Shop</Button>
      </Card>

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
                {!unlocked && <p className="text-[10px]" style={{ color: 'rgb(var(--muted))' }}>{th.unlockRank} rank · or buy in Shop</p>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm">Auto day / night</p>
            <p className="text-[11px] text-muted">Light by day, dark at night</p>
          </div>
          <Toggle checked={s.autoTheme} onChange={(v) => s.set('autoTheme', v)} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm flex items-center gap-1.5">New design <span className="text-[10px] rounded-full bg-accent/15 text-accent px-1.5 py-0.5 font-semibold">v2</span></p>
            <p className="text-[11px] text-muted">Redesigned, more animated look · off = the classic app</p>
          </div>
          <Toggle checked={s.uiPolish} onChange={(v) => { s.set('uiPolish', v); haptic('tap'); }} />
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
          <Row label="Share activity" desc="Let friends see your real sessions & PRs">
            <Toggle checked={s.shareActivity} onChange={(v) => { s.set('shareActivity', v); void pushMyActivity(); }} />
          </Row>
          <Row label={t('p.streakGambling')} desc="Wager coins on session targets">
            <Toggle checked={s.streakGambling} onChange={(v) => s.set('streakGambling', v)} />
          </Row>
          <Row label="Pre-fill from last time" desc="New sets start at your last weights and reps">
            <Toggle checked={s.prefillWeights} onChange={(v) => s.set('prefillWeights', v)} />
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
          <Row label="Health & recovery" desc="Sleep, readiness & Garmin sync">
            <Toggle checked={s.recoveryEnabled} onChange={(v) => { s.set('recoveryEnabled', v); void configureBackgroundSync(v, { bedtime: s.bedtimeNudge }); }} />
          </Row>
          {s.recoveryEnabled && (
            <Row label="Bedtime reminder" desc="Evening nudge when sleep debt builds">
              <Toggle checked={s.bedtimeNudge} onChange={(v) => { s.set('bedtimeNudge', v); void configureBackgroundSync(true, { bedtime: v }); }} />
            </Row>
          )}
          {s.recoveryEnabled && (
            <Row label="Import watch workouts" desc="Garmin runs & sessions join your history">
              <Toggle checked={s.autoImportWorkouts} onChange={(v) => s.set('autoImportWorkouts', v)} />
            </Row>
          )}
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
      <Button variant="ghost" className="w-full justify-center" onClick={() => navigate('/plan')}>
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
        <Button variant="outline" className="py-1.5" onClick={async () => { const r = await syncQueue(); setPending(0); haptic('success'); toast(`Synced ${r.synced} item(s).`); }}>{t('p.syncNow')}</Button>
      </Card>

      <Card className="flex items-center justify-between" onClick={() => navigate('/spotify')}>
        <div className="flex items-center gap-2"><Music size={16} className="text-muted" /><span className="text-sm">{t('p.spotify')}</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/library')}>
        <div className="flex items-center gap-2"><BookOpen size={16} className="text-muted" /><span className="text-sm">Exercise library</span></div>
        <Badge>{EXERCISES.length}</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/calendar')}>
        <div className="flex items-center gap-2"><CalendarDays size={16} className="text-muted" /><span className="text-sm">Workout calendar</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/achievements')}>
        <div className="flex items-center gap-2"><Trophy size={16} className="text-muted" /><span className="text-sm">Achievements</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/wrapped')}>
        <div className="flex items-center gap-2"><Gift size={16} className="text-muted" /><span className="text-sm">Forge Wrapped — last month's recap</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/progress')}>
        <div className="flex items-center gap-2"><LineChart size={16} className="text-muted" /><span className="text-sm">Progress &amp; body</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>
      {s.recoveryEnabled && (
        <Card className="flex items-center justify-between" onClick={() => navigate('/health')}>
          <div className="flex items-center gap-2"><Watch size={16} className="text-muted" /><span className="text-sm">Health &amp; recovery (Garmin sync)</span></div>
          <Badge color="rgb(var(--accent))">Open</Badge>
        </Card>
      )}
      <Card className="flex items-center justify-between" onClick={() => navigate('/download')}>
        <div className="flex items-center gap-2"><Smartphone size={16} className="text-muted" /><span className="text-sm">Get the app (install / APK)</span></div>
        <Badge color="rgb(var(--accent))">Open</Badge>
      </Card>
      <Card className="flex items-center justify-between" onClick={() => navigate('/import-progress')}>
        <div className="flex items-center gap-2"><Download size={16} className="text-muted" /><span className="text-sm">Import progress from another app</span></div>
        <Badge color="rgb(var(--accent-2))">Open</Badge>
      </Card>

      {/* Training & rewards */}
      <div>
        <SectionTitle action={<Trophy size={14} className="text-muted" />}>Training &amp; rewards</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Weekly session goal</span>
            <div className="flex items-center gap-1">
              <button onClick={() => s.set('weeklyGoal', Math.max(1, s.weeklyGoal - 1))} className="w-8 h-8 rounded-md bg-surface-2">−</button>
              <span className="w-8 text-center font-mono text-sm">{s.weeklyGoal}</span>
              <button onClick={() => s.set('weeklyGoal', Math.min(7, s.weeklyGoal + 1))} className="w-8 h-8 rounded-md bg-surface-2">+</button>
            </div>
          </div>
          <p className="text-[11px] text-muted -mt-1">Your streak counts <b>weeks</b> you hit this many planned sessions — not daily gym days.</p>
          <div className="flex items-center justify-between">
            <div><p className="text-sm">Heavy-set quote drops</p><p className="text-[11px] text-muted">Rare/legendary quotes past 100 kg</p></div>
            <Toggle checked={s.heavyQuotesEnabled} onChange={(v) => s.set('heavyQuotesEnabled', v)} />
          </div>
        </Card>
      </div>
      <Card className="flex items-center justify-between" onClick={() => openTutorial()}>
        <div className="flex items-center gap-2"><HelpCircle size={16} className="text-muted" /><span className="text-sm">Replay app tour</span></div>
        <Badge>{t('common.open')}</Badge>
      </Card>

      {/* Workout reminders */}
      <div>
        <SectionTitle action={<Bell size={14} className="text-muted" />}>Workout reminders</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Daily reminder</span>
            <Toggle checked={s.reminder.enabled} onChange={async (v) => { if (v) { const ok = await requestNotifyPermission(); if (!ok) { toast('Enable notifications in your browser to use reminders.', 'error'); return; } } s.set('reminder', { ...s.reminder, enabled: v }); }} />
          </div>
          {s.reminder.enabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Time</span>
                <input type="time" value={s.reminder.time} onChange={(e) => s.set('reminder', { ...s.reminder, time: e.target.value })} className="rounded-lg bg-surface-2 border border-line px-3 py-1.5 text-sm" />
              </div>
              <div className="flex gap-1 justify-between">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
                  const on = s.reminder.days.includes(i);
                  return (
                    <button key={d} onClick={() => s.set('reminder', { ...s.reminder, days: on ? s.reminder.days.filter((x) => x !== i) : [...s.reminder.days, i] })} className={`flex-1 rounded-lg py-1.5 text-[10px] ${on ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{d}</button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted/70">Fires while the app is open or in the background. Say “notify me when…” for one-offs.</p>
            </>
          )}
        </Card>
      </div>

      {/* Public profile */}
      <div>
        <SectionTitle action={<Globe2 size={14} className="text-muted" />}>Public profile</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm">Shareable profile</p><p className="text-[11px] text-muted">Let others view your rank & stats via a link</p></div>
            <Toggle checked={s.publicProfile} onChange={(v) => s.set('publicProfile', v)} />
          </div>
          {s.publicProfile ? (
            <div className="flex gap-2">
              <Button className="flex-1 justify-center" onClick={shareMyProfile}>Share profile</Button>
              <Button variant="ghost" className="flex-1 justify-center" onClick={() => downloadDataUrl(generateProfileCard(buildSummary()), 'forgeos-profile.png')}>Save card</Button>
            </div>
          ) : (
            <p className="text-[11px] text-muted/70">Turn on to generate a read-only share link and a profile card.</p>
          )}
        </Card>
      </div>

      {/* Security */}
      <div>
        <SectionTitle action={<Shield size={14} className="text-muted" />}>Security</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm">App passcode lock</p><p className="text-[11px] text-muted">Ask for a code on launch</p></div>
            <Toggle checked={s.appLock.enabled} onChange={(v) => {
              if (v) setPasscodeSheet('set');
              else s.set('appLock', { enabled: false, code: '' });
            }} />
          </div>
          {s.appLock.enabled && (
            <Button variant="ghost" className="w-full justify-center" onClick={() => setPasscodeSheet('change')}>Change passcode</Button>
          )}
          <Button variant="ghost" className="w-full justify-center" onClick={() => setPwSheet(true)}>Change account password</Button>
        </Card>
      </div>

      <ChangePasswordSheet open={pwSheet} onClose={() => setPwSheet(false)} />
      <PasscodeSheet
        open={passcodeSheet !== null}
        mode={passcodeSheet ?? 'set'}
        onClose={() => setPasscodeSheet(null)}
        onSave={(code) => s.set('appLock', { enabled: true, code })}
      />

      {/* Backup */}
      <div>
        <SectionTitle action={<Database size={14} className="text-muted" />}>Backup & restore</SectionTitle>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 justify-center" onClick={exportData}>Export file</Button>
          <Button variant="ghost" className="flex-1 justify-center" onClick={() => backupFileRef.current?.click()}>Import file</Button>
        </div>
        {cloudSyncAvailable() && (
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" className="flex-1 justify-center" onClick={async () => {
              const r = await pushCloudBackup();
              toast(r === 'ok' ? 'Backed up to the cloud ☁️' : r === 'unauth' ? 'Log in with email to use cloud backup.' : 'Cloud backup failed — try again.', r === 'ok' ? 'success' : 'error');
            }}>☁️ Back up to cloud</Button>
            <Button variant="ghost" className="flex-1 justify-center" onClick={async () => {
              if (cloudConfirm) {
                const r = await pullCloudBackup();
                if (r === 'restored') { toast('Restoring…'); setTimeout(() => location.reload(), 600); }
                else toast(r === 'none' ? 'No cloud backup found.' : r === 'unauth' ? 'Log in to restore.' : 'Restore failed.', 'error');
                setCloudConfirm(false);
              } else { setCloudConfirm(true); toast('Tap again to replace local data with your cloud backup.', 'info'); }
            }}>{cloudConfirm ? 'Confirm restore' : 'Restore from cloud'}</Button>
          </div>
        )}
        <input ref={backupFileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { await importData(f); toast('Backup restored ✅'); } catch { toast('That file is not a valid ForgeOS backup.', 'error'); } } }} />
      </div>

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

      <Button variant="outline" className="w-full justify-center text-danger" onClick={async () => {
        if (!confirm('Sign out and reset this device’s profile? Your cloud account stays saved.')) return;
        await signOutEverywhere(); // kill the Supabase session + block auto re-sign-in
        reset();
        navigate('/onboarding', { replace: true });
      }}>
        <span className="flex items-center gap-2"><LogOut size={16} /> Sign out</span>
      </Button>

      <p className="text-center text-[11px] text-muted pb-2">
        ForgeOS {__APP_VERSION__ === 'dev' ? 'dev build' : `v${__APP_VERSION__}`}
      </p>
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

