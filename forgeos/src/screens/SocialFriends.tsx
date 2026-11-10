import { useEffect, useMemo, useState } from 'react';

import {
  Swords, Share2, Circle, UserPlus, Check, X,
  Crown, Heart, ChevronRight, UserMinus,
  RotateCw, Search, Footprints,
} from 'lucide-react';
import { isBackendLive } from '../lib/supabase';

import { Card, Button, Badge, SectionTitle, Sheet } from '../components/ui';
import { CloudStatus } from '../components/CloudStatus';
import { useSocial } from '../state/socialStore';
import { useHealth } from '../state/healthStore';

import { useGami } from '../state/gamificationStore';
import { useUser } from '../state/userStore';

import { isFriendCode } from '../lib/friendCode';
import { rankForXp, rankLabel } from '../data/ranks';

import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';
import { generateFriendCode } from '../lib/friendCode';
import { buildInviteLink, tryExtractInvite } from '../lib/invite';
import { whenLabel } from '../lib/friendActivity';
import { useFriendActivity } from '../lib/friendData';

import { useT } from '../lib/i18n';
import type { Friend } from '../types';
import { Avatar } from './SocialShared';
import { timeAgo } from '../lib/socialTime';

// The Friends tab. Split out of Social.tsx, which had grown past 1,200 lines.
/* ------------------------------ FRIENDS ------------------------------ */

export function Friends() {
  const t = useT();
  const friends = useSocial((s) => s.friends);
  const requests = useSocial((s) => s.requests);
  const addFriendByCode = useSocial((s) => s.addFriendByCode);
  const acceptRequest = useSocial((s) => s.acceptRequest);
  const declineRequest = useSocial((s) => s.declineRequest);
  const addFriendByInvite = useSocial((s) => s.addFriendByInvite);
  const syncFriends = useSocial((s) => s.syncFriends);
  const cheerFriend = useSocial((s) => s.cheerFriend);
  const profile = useUser((s) => s.profile);
  const updateProfile = useUser((s) => s.updateProfile);
  const myXp = useGami((s) => s.xp);
  const myStreak = useGami((s) => s.streakDays);
  const healthDays = useHealth((s) => s.days);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  const [openFriend, setOpenFriend] = useState<Friend | null>(null);

  useEffect(() => { void syncFriends(); }, [syncFriends]); // pull the real graph (live backend)

  const code = profile?.friendCode ?? generateFriendCode();
  const inviteLink = useMemo(() => buildInviteLink({
    v: 1,
    code,
    name: profile?.name ?? 'Athlete',
    rank: rankLabel(rankForXp(myXp).tier),
    xp: myXp,
    seed: (profile?.name ?? 'You').slice(0, 2).toUpperCase(),
    streak: myStreak,
  }), [code, profile?.name, myXp, myStreak]);
  const incoming = requests.filter((r) => r.direction === 'incoming');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');

  async function add() {
    const clean = name.trim();
    if (!clean) return;
    // Pasted an invite link / payload? Add the real person instantly.
    const invite = tryExtractInvite(clean);
    if (invite) {
      const res = addFriendByInvite(invite);
      if (res === 'self') toast(t('That\'s your own invite link 🙂'), 'info');
      else if (res === 'duplicate') toast(`${invite.name} is already in your circle`);
      else { haptic('success'); toast(`${invite.name} is now your gym partner 🤝`); }
      setName('');
      return;
    }
    // A bare friend code is looked up on the server, so it needs the cloud.
    if (isFriendCode(clean)) {
      if (!isBackendLive) { toast(t('Friend codes need a cloud account. Use an invite link instead.'), 'info'); return; }
      if (clean.toUpperCase() === code.toUpperCase()) { toast(t('That\'s your own code 🙂'), 'info'); return; }
      const friend = await addFriendByCode(clean);
      if (!friend) { haptic('warning'); toast(t('No one has that code. Check it, and make sure you are signed in.'), 'error'); return; }
      haptic('success'); toast(`${friend.name} is now your gym partner 🤝`);
      setName('');
      return;
    }
    haptic('warning');
    toast(t('That is not an invite link or a friend code (FORGE-…)'), 'error');
  }

  async function shareCode() {
    const text = `Train with me on ForgeOS 💪 Tap to add me as your gym partner:`;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: 'ForgeOS', text, url: inviteLink }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast(t('Invite link copied: paste it to a friend'));
  }

  function regenCode() {
    updateProfile({ friendCode: generateFriendCode() });
    haptic('success');
    toast(t('New friend code generated 🔁'));
  }

  const q = query.trim().toLowerCase();
  const shownFriends = q ? friends.filter((f) => f.name.toLowerCase().includes(q)) : friends;

  const board = [...friends.map((f) => ({ name: f.name, xp: f.xp, you: false })), { name: profile?.name ?? 'You', xp: myXp, you: true }]
    .sort((a, b) => b.xp - a.xp);

  // Step race: only people with synced steps this week take part.
  const monday = (() => { const n = new Date(); n.setDate(n.getDate() - ((n.getDay() + 6) % 7)); return n.toISOString().slice(0, 10); })();
  const mySteps = Object.values(healthDays).filter((d) => d.date >= monday).reduce((a, d) => a + (d.steps ?? 0), 0);
  const stepBoard = [
    ...friends.filter((f) => (f.weeklySteps ?? 0) > 0).map((f) => ({ name: f.name, steps: f.weeklySteps ?? 0, you: false })),
    ...(mySteps > 0 ? [{ name: profile?.name ?? 'You', steps: mySteps, you: true }] : []),
  ].sort((a, b) => b.steps - a.steps).slice(0, 8);

  return (
    <div className="space-y-3">
      <CloudStatus />

      {/* Your code / invite */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted">{t('Your friend code')}</p>
            <p className="font-mono font-bold text-lg">{code}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={regenCode} aria-label={t('Generate a new code')} className="rounded-full p-2 text-muted hover:text-accent"><RotateCw size={15} /></button>
            <Button onClick={shareCode}><span className="flex items-center gap-1 text-xs">{copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? t('Copied') : t('Invite link')}</span></Button>
          </div>
        </div>
        <p className="text-[11px] text-muted">{t('Share your invite link: when a friend taps it, you\'re added to each other instantly. No code typing needed.')}</p>
      </Card>

      {/* Add by name or code */}
      <Card className="space-y-2">
        <SectionTitle>{t('s.addFriend')}</SectionTitle>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }}
            aria-label={t('Invite link or friend code')} placeholder={t('Invite link or FORGE-code')} className="flex-1 rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
          <Button disabled={!name.trim()} onClick={() => void add()}><span className="flex items-center gap-1"><UserPlus size={15} /> {t('s.add')}</span></Button>
        </div>
      </Card>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div>
          <SectionTitle>{t('Friend requests')}</SectionTitle>
          {incoming.map((r) => (
            <Card key={r.id} className="flex items-center gap-3">
              <Avatar seed={r.avatarSeed} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                <p className="text-xs text-muted">{r.rank} · {r.xp.toLocaleString()} XP{r.mutuals ? ` · ${r.mutuals} mutual` : ''}</p>
              </div>
              <button onClick={() => { acceptRequest(r.id); haptic('success'); toast(`${r.name} is now your friend 🤝`); }} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black flex items-center gap-1 shrink-0"><Check size={14} /> {t('Confirm')}</button>
              <button onClick={() => { declineRequest(r.id); haptic('tap'); }} aria-label={`Delete request from ${r.name}`} className="rounded-full bg-surface-2 p-1.5 text-muted shrink-0"><X size={16} /></button>
            </Card>
          ))}
        </div>
      )}

      {/* Outgoing pending */}
      {outgoing.length > 0 && (
        <div>
          <SectionTitle>{t('Pending')}</SectionTitle>
          {outgoing.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 opacity-70">
              <Avatar seed={r.avatarSeed} />
              <div className="flex-1"><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-muted">{t('Request sent…')}</p></div>
              <Badge>{t('pending')}</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Your circle */}
      <SectionTitle action={<span className="text-[11px] text-muted">{friends.length}</span>}>{t('s.yourCircle')}</SectionTitle>
      {friends.length > 4 && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3">
          <Search size={15} className="text-muted shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search friends')} className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
          {query && <button onClick={() => setQuery('')} aria-label={t('Clear search')} className="text-muted"><X size={15} /></button>}
        </div>
      )}
      {shownFriends.map((f) => (
        <Card key={f.id} className="flex items-center gap-3">
          <button onClick={() => setOpenFriend(f)}><Avatar seed={f.avatarSeed} /></button>
          <button className="flex-1 text-left" onClick={() => setOpenFriend(f)}>
            <p className="text-sm font-semibold flex items-center gap-2">
              {f.name}
              {f.friendCode && <Check size={12} className="text-accent" aria-label={t('Added via invite link')} />}
              {f.trainingNow ? <span className="text-[10px] text-success flex items-center gap-0.5"><Circle size={7} className="fill-success" /> {t('training')}</span>
                : <Circle size={8} className={f.online ? 'text-success fill-success' : 'text-muted fill-muted'} />}
            </p>
            <p className="text-xs text-muted">{f.rank} · {f.xp.toLocaleString()} XP{f.streak ? ` · 🔥${f.streak}` : ''}</p>
          </button>
          <button onClick={() => { cheerFriend(f.id); haptic('success'); toast(`Cheered ${f.name} 👏`); }} aria-label={t('Cheer')} className={`rounded-full p-2 ${f.cheeredAt ? 'text-accent' : 'text-muted hover:text-accent'}`}>
            <Heart size={16} className={f.cheeredAt ? 'fill-accent' : ''} />
          </button>
          <ChevronRight size={16} className="text-muted" onClick={() => setOpenFriend(f)} />
        </Card>
      ))}
      {friends.length === 0 && (
        <Card className="text-center space-y-2 py-5">
          <p className="text-sm font-semibold">{t('No gym partners yet')}</p>
          <p className="text-xs text-muted">{t('Send your invite link to a friend. When they open it you are added to each other.')}</p>
          <Button className="mx-auto" onClick={shareCode}><span className="flex items-center gap-1 text-xs"><Share2 size={14} /> {t('Share invite link')}</span></Button>
        </Card>
      )}
      {friends.length > 0 && shownFriends.length === 0 && <p className="text-sm text-muted">{t('No friend matches “')}{query}”.</p>}

      {/* Friends leaderboard */}
      <div>
        <SectionTitle action={<Crown size={14} className="text-accent-2" />}>{t('Friends leaderboard')}</SectionTitle>
        <Card className="space-y-1.5">
          {board.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${r.you ? 'bg-accent/15' : ''}`}>
              <span className="font-mono w-5 text-center text-muted">{i + 1}</span>
              <span className={`flex-1 text-sm ${r.you ? 'text-accent font-semibold' : ''}`}>{r.name}{i === 0 && ' 👑'}</span>
              <span className="font-mono text-xs text-muted">{r.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Step race — friendly competition for recovery, resets every Monday */}
      {stepBoard.length > 1 && (
        <div>
          <SectionTitle action={<Footprints size={14} className="text-success" />}>{t('Step race (this week)')}</SectionTitle>
          <Card className="space-y-1.5">
            {stepBoard.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${r.you ? 'bg-accent/15' : ''}`}>
                <span className="font-mono w-5 text-center text-muted">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                <span className={`flex-1 text-sm ${r.you ? 'text-accent font-semibold' : ''}`}>{r.name}</span>
                <span className="font-mono text-xs text-muted">{r.steps.toLocaleString()} {t('steps')}</span>
              </div>
            ))}
            <p className="text-[10px] text-muted/70">{t('Synced from Garmin · friends without a tracker aren’t shown')}</p>
          </Card>
        </div>
      )}

      <FriendSheet friend={openFriend} onClose={() => setOpenFriend(null)} />
    </div>
  );
}

function FriendSheet({ friend, onClose }: { friend: Friend | null; onClose: () => void }) {
  const t = useT();
  const removeFriend = useSocial((s) => s.removeFriend);
  const startDuel = useSocial((s) => s.startDuel);
  const cheerFriend = useSocial((s) => s.cheerFriend);
  const feed = useSocial((s) => s.feed);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { activity: act } = useFriendActivity(friend);
  useEffect(() => { setConfirmRemove(false); }, [friend]);
  if (!friend || !act) return null;

  // By id, never by display name: author_name is denormalised onto the post and
  // a crafted insert can carry anyone's name, so matching on it would show a
  // forged post on the impersonated friend's own profile.
  const theirPosts = feed.filter((p) => p.authorId === friend.id).slice(0, 3);

  return (
    <Sheet open={!!friend} onClose={onClose} title={friend.name}>
      <div className="space-y-3">
        {/* header */}
        <div className="flex items-center gap-3">
          <Avatar seed={friend.avatarSeed} large />
          <div className="min-w-0">
            <p className="font-bold text-lg">{friend.name}</p>
            <p className="text-sm text-accent">{friend.rank} · {friend.xp.toLocaleString()} XP</p>
            <p className="text-[11px] text-muted">{friend.trainingNow ? t('Training now 🟢') : friend.online ? t('Online') : `Last active ${friend.lastActiveISO ? timeAgo(friend.lastActiveISO) : 'recently'}`}{friend.streak ? ` · 🔥 ${friend.streak}` : ''}</p>
          </div>
        </div>
        {/* honesty tag: is this data live & real, or a local sample? */}
        <p className="text-[10px] text-muted flex items-center gap-1">
          {act.real
            ? <><Circle size={7} className="fill-success text-success" /> {t('Live activity')}</>
            : <>{t('✦ Sample activity (no backend connected)')}</>}
        </p>

        {act.private ? (
          <div className="rounded-xl bg-surface-2 px-4 py-6 text-center">
            <p className="text-2xl mb-1">🔒</p>
            <p className="text-sm font-medium">{friend.name} {t('keeps their activity private')}</p>
            <p className="text-[11px] text-muted mt-1">{t('You can still see their rank and XP.')}</p>
          </div>
        ) : (
          <>
            {act.bio && <p className="text-[11px] text-muted italic">“{act.bio}”</p>}

            {/* stat strip */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <MiniStat v={`${act.weeklySessions}`} l="this wk" />
              <MiniStat v={`${Math.round(act.totalVolumeKg / 1000)}t`} l="volume" />
              <MiniStat v={`${act.prs}`} l="PRs" />
              <MiniStat v={friend.streak ? `${friend.streak}` : '–'} l="streak" />
            </div>
            {act.favourite && <p className="text-[11px] text-muted text-center">{t('Top lift:')} <span className="text-text font-medium">{act.favourite}</span></p>}

            {/* recent activity */}
            {act.sessions.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1">{t('Recent activity')}</p>
                <div className="space-y-1.5">
                  {act.sessions.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                      <span className="text-base">{s.kind === 'cardio' ? '🏃' : '🏋️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.label}</p>
                        <p className="text-[11px] text-muted">{s.detail}</p>
                      </div>
                      <span className="text-[11px] text-muted shrink-0">{whenLabel(s.daysAgo)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* their posts */}
            {theirPosts.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1">{t('Latest posts')}</p>
                <div className="space-y-1.5">
                  {theirPosts.map((p) => (
                    <div key={p.id} className="rounded-xl bg-surface-2 px-3 py-2">
                      {p.flex && <span className="text-[11px] text-accent font-semibold">{p.flex.icon} {p.flex.label} · </span>}
                      <span className="text-sm">{p.body}</span>
                      <span className="text-[11px] text-muted"> · {timeAgo(p.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button className="justify-center" onClick={() => { startDuel(friend.name, friend.avatarSeed, 'volume', 20000, 7); haptic('success'); toast(t('duel.challengeSent', { name: friend.name })); onClose(); }}>
            <span className="flex items-center gap-1"><Swords size={15} /> {t('duel.btn')}</span>
          </Button>
          <Button variant="ghost" className="justify-center" onClick={() => { cheerFriend(friend.id); haptic('success'); toast(`Cheered ${friend.name} 👏`); }}>
            <span className="flex items-center gap-1"><Heart size={15} /> {t('Cheer')}</span>
          </Button>
          <Button variant="ghost" className="justify-center" onClick={() => {
            if (!confirmRemove) { setConfirmRemove(true); haptic('warning'); return; }
            const name = friend.name;
            removeFriend(friend.id); haptic('tap'); toast(`Unfriended ${name}`); onClose();
          }}>
            <span className="flex items-center gap-1 text-danger"><UserMinus size={15} /> {confirmRemove ? t('Confirm?') : t('Unfriend')}</span>
          </Button>
        </div>
        {confirmRemove && <p className="text-[11px] text-muted text-center">{t('Tap “Confirm?” again to remove')} {friend.name} {t('from your circle.')}</p>}
      </div>
    </Sheet>
  );
}

function MiniStat({ v, l }: { v: string; l: string }) {
  return <div className="rounded-xl bg-surface-2 py-2"><p className="font-mono font-bold text-sm">{v}</p><p className="text-[10px] text-muted">{l}</p></div>;
}
