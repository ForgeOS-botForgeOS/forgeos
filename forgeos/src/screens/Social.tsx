import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Store, Share2, Wifi, Circle, UserPlus, Check, X,
  MessageCircle, Send, Trash2, Crown, Zap, Heart, Dumbbell, Star, ChevronRight, Plus, UserMinus,
  RotateCw, Search,
} from 'lucide-react';
import { joinRace } from '../lib/supabase';
import { Screen } from '../components/Screen';
import { Card, Button, Pill, Badge, SectionTitle, Sheet } from '../components/ui';
import { useSocial } from '../state/socialStore';
import { useSettings } from '../state/settingsStore';
import { useGami } from '../state/gamificationStore';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { MOCK_MARKETPLACE, MOCK_SUGGESTED } from '../lib/mockData';
import { rankForXp, rankLabel } from '../data/ranks';
import { generateShareCard, downloadDataUrl } from '../lib/shareCard';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { generateFriendCode } from '../lib/friendCode';
import { buildInviteLink, tryExtractInvite } from '../lib/invite';
import { friendActivity, whenLabel } from '../lib/friendActivity';
import { useFriendActivity } from '../lib/friendData';
import { useT } from '../lib/i18n';
import type { DuelMetric, FeedPost, Friend } from '../types';

const REACTIONS = ['🔥', '💪', '👏', '🐐', '🧠'];
type Tab = 'feed' | 'friends' | 'race' | 'market';

export default function Social() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('feed');
  const marketEnabled = useSettings((s) => s.marketplaceEnabled);
  const requests = useSocial((s) => s.requests);
  const incoming = requests.filter((r) => r.direction === 'incoming').length;

  return (
    <Screen title={t('nav.social')} subtitle="Iron sharpens iron.">
      <div data-noswipe className="flex gap-2 overflow-x-auto no-scrollbar">
        <Pill active={tab === 'feed'} onClick={() => setTab('feed')}>{t('s.feed')}</Pill>
        <Pill active={tab === 'friends'} onClick={() => setTab('friends')}>
          {t('s.friends')}{incoming > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{incoming}</span>}
        </Pill>
        <Pill active={tab === 'race'} onClick={() => setTab('race')}>{t('s.race')}</Pill>
        {marketEnabled && <Pill active={tab === 'market'} onClick={() => setTab('market')}>{t('s.market')}</Pill>}
      </div>

      {tab === 'feed' && <Feed />}
      {tab === 'friends' && <Friends />}
      {tab === 'race' && <Race />}
      {tab === 'market' && marketEnabled && <Marketplace />}
    </Screen>
  );
}

/* ------------------------------- FEED ------------------------------- */

function Feed() {
  const feed = useSocial((s) => s.feed);
  const refreshFeed = useSocial((s) => s.refreshFeed);
  const [filter, setFilter] = useState<'all' | 'friends' | 'mine'>('all');
  const [shareOpen, setShareOpen] = useState(false);

  const shown = feed.filter((p) => (filter === 'mine' ? p.mine : filter === 'friends' ? !p.mine : true));

  return (
    <div className="space-y-3">
      <StoriesRow />
      <Composer onShareCard={() => setShareOpen(true)} />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'friends', 'mine'] as const).map((f) => (
            <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>
          ))}
        </div>
        <button className="text-xs text-muted flex items-center gap-1" onClick={() => { haptic(refreshFeed() ? 'tap' : 'warning'); }}>
          <Zap size={13} /> Refresh
        </button>
      </div>

      {shown.length === 0 && <p className="text-sm text-muted text-center py-6">Nothing here yet — flex something above 💪</p>}

      {shown.map((p) => <PostCard key={p.id} post={p} />)}

      <ShareCardSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

// Double-tap anywhere on a post to drop a 🔥 — Instagram's signature gesture,
// reframed as a "spotter's cheer" for the gym.
const DOUBLE_TAP_EMOJI = '🔥';

function PostCard({ post: p }: { post: FeedPost }) {
  const react = useSocial((s) => s.react);
  const deletePost = useSocial((s) => s.deletePost);
  const [openComments, setOpenComments] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);

  function onMediaTap() {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (p.myReaction !== DOUBLE_TAP_EMOJI) react(p.id, DOUBLE_TAP_EMOJI);
      setBurst((n) => n + 1);
      haptic('success');
    } else {
      lastTap.current = now;
    }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <Avatar seed={p.avatarSeed} />
        <div className="flex-1">
          <p className="text-sm font-semibold">{p.authorName}{p.mine && <span className="ml-1 text-[10px] text-muted">· you</span>}</p>
          <p className="text-[11px] text-muted">{timeAgo(p.createdAt)}</p>
        </div>
        {p.mine && (
          <button onClick={() => { deletePost(p.id); haptic('tap'); }} aria-label="Delete post" className="text-muted hover:text-danger"><Trash2 size={15} /></button>
        )}
      </div>

      <div className="relative" onClick={onMediaTap}>
        {p.flex && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
            <span>{p.flex.icon}</span> {p.flex.label}
          </div>
        )}

        {p.body && <p className="text-sm mt-1">{p.body}</p>}
        {p.imageUrl && <img src={p.imageUrl} alt="" className="w-40 rounded-xl border border-line mt-1" />}

        {p.workoutSummary && (p.workoutSummary.volumeKg > 0 || p.workoutSummary.durationMin > 0) && (
          <div className="flex gap-2 text-[11px] text-muted mt-1">
            {p.workoutSummary.volumeKg > 0 && <><span>{p.workoutSummary.volumeKg.toLocaleString()} kg</span>·</>}
            {p.workoutSummary.sets > 0 && <><span>{p.workoutSummary.sets} sets</span>·</>}
            <span>{p.workoutSummary.durationMin} min</span>
          </div>
        )}

        <AnimatePresence>
          {burst > 0 && (
            <motion.div
              key={burst}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, times: [0, 0.4, 1] }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl"
            >
              {DOUBLE_TAP_EMOJI}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        {REACTIONS.map((e) => {
          const count = p.reactions[e] ?? 0;
          return (
            <button key={e} onClick={() => { react(p.id, e); haptic('tap'); }}
              className={`rounded-full px-2 py-1 text-xs ${p.myReaction === e ? 'bg-accent/20 ring-1 ring-accent' : 'bg-surface-2'}`}>
              {e} {count > 0 && <span className="text-muted">{count}</span>}
            </button>
          );
        })}
        <button onClick={() => setOpenComments((v) => !v)} className="ml-auto rounded-full bg-surface-2 px-2 py-1 text-xs text-muted flex items-center gap-1">
          <MessageCircle size={12} /> {p.comments?.length ?? 0}
        </button>
      </div>

      {openComments && <Comments postId={p.id} />}
    </Card>
  );
}

function Comments({ postId }: { postId: string }) {
  const comments = useSocial((s) => s.feed.find((p) => p.id === postId)?.comments ?? []);
  const addComment = useSocial((s) => s.addComment);
  const [text, setText] = useState('');
  return (
    <div className="space-y-2 border-t border-line pt-2">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2">
          <Avatar seed={c.avatarSeed} small />
          <div className="flex-1">
            <p className="text-[11px]"><span className="font-semibold">{c.authorName}</span> <span className="text-muted">{timeAgo(c.createdAt)}</span></p>
            <p className="text-sm">{c.body}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { addComment(postId, text); setText(''); haptic('tap'); } }}
          placeholder="Add a comment…" className="flex-1 rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm" />
        <Button className="px-3" disabled={!text.trim()} onClick={() => { addComment(postId, text); setText(''); haptic('tap'); }}><Send size={15} /></Button>
      </div>
    </div>
  );
}

function Composer({ onShareCard }: { onShareCard: () => void }) {
  const publishPost = useSocial((s) => s.publishPost);
  const profile = useUser((s) => s.profile);
  const xp = useGami((s) => s.xp);
  const streak = useGami((s) => s.streakDays);
  const prs = useWorkout((s) => s.prs);
  const last = useWorkout((s) => s.history)[0];
  const [body, setBody] = useState('');
  const [flex, setFlex] = useState<{ icon: string; label: string } | null>(null);
  const [attachWorkout, setAttachWorkout] = useState(false);

  const topPr = useMemo(() => [...prs].sort((a, b) => b.e1rm - a.e1rm)[0], [prs]);
  const { tier } = rankForXp(xp);

  const flexes: { key: string; icon: string; label: string; available: boolean }[] = [
    { key: 'pr', icon: '🏆', label: topPr ? `New PR · ${topPr.exerciseName} ${topPr.weightKg}kg` : 'New PR', available: !!topPr },
    { key: 'streak', icon: '🔥', label: `${streak}-day streak`, available: streak > 0 },
    { key: 'rank', icon: '⭐', label: `Rank · ${rankLabel(tier)}`, available: true },
    { key: 'workout', icon: '💪', label: 'Workout done', available: !!last },
  ];

  function toggleFlex(f: { icon: string; label: string }) {
    haptic('tap');
    setFlex((cur) => (cur?.label === f.label ? null : f));
  }

  function post() {
    const summary = attachWorkout && last
      ? { volumeKg: Math.round(last.totalVolumeKg ?? 0), sets: last.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0), durationMin: Math.round((last.durationSec ?? 0) / 60) || 45 }
      : undefined;
    if (!body.trim() && !flex && !summary) return;
    publishPost(body.trim() || (flex ? `${flex.icon} ${flex.label}` : 'Flexing 💪'), { flex: flex ?? undefined, summary });
    setBody(''); setFlex(null); setAttachWorkout(false);
    haptic('success');
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <Avatar seed={(profile?.name ?? 'You').slice(0, 2).toUpperCase()} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Flex something — a PR, a streak, a win…"
          className="flex-1 resize-none rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-12 focus:h-20 transition-all" />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {flexes.filter((f) => f.available).map((f) => (
          <button key={f.key} onClick={() => toggleFlex({ icon: f.icon, label: f.label })}
            className={`rounded-full px-2.5 py-1 text-xs ${flex?.label === f.label ? 'bg-accent/20 ring-1 ring-accent text-accent' : 'bg-surface-2 text-muted'}`}>
            {f.icon} {f.label}
          </button>
        ))}
        {last && (
          <button onClick={() => { setAttachWorkout((v) => !v); haptic('tap'); }}
            className={`rounded-full px-2.5 py-1 text-xs flex items-center gap-1 ${attachWorkout ? 'bg-accent/20 ring-1 ring-accent text-accent' : 'bg-surface-2 text-muted'}`}>
            <Dumbbell size={12} /> Attach last workout
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 justify-center" onClick={post}>Post to feed</Button>
        <Button variant="ghost" className="justify-center px-3" onClick={onShareCard}><Share2 size={16} /></Button>
      </div>
    </Card>
  );
}

function ShareCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useUser((s) => s.profile);
  const xp = useGami((s) => s.xp);
  const last = useWorkout((s) => s.history)[0];
  const publishPost = useSocial((s) => s.publishPost);
  const [url, setUrl] = useState<string | null>(null);

  function make() {
    const { tier } = rankForXp(xp);
    setUrl(generateShareCard({
      name: profile?.name ?? 'Athlete', rank: rankLabel(tier),
      volumeKg: Math.round(last?.totalVolumeKg ?? 0),
      sets: last?.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0) ?? 0,
      durationMin: Math.round((last?.durationSec ?? 0) / 60) || 45,
    }));
    haptic('success');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Workout share card">
      <div className="space-y-3">
        {!last && <p className="text-sm text-muted">Finish a workout to generate a real summary. Showing a sample otherwise.</p>}
        {url ? (
          <>
            <img src={url} alt="share card" className="w-40 mx-auto rounded-xl border border-line" />
            <div className="flex gap-2">
              <Button className="flex-1 justify-center" onClick={() => downloadDataUrl(url, 'forgeos-card.png')}>Save image</Button>
              <Button variant="ghost" className="flex-1 justify-center" onClick={() => { publishPost('Just forged a session 🔥', { summary: last ? { volumeKg: Math.round(last.totalVolumeKg ?? 0), sets: last.exercises.reduce((a, e) => a + e.sets.length, 0), durationMin: 45 } : undefined, imageUrl: url ?? undefined }); onClose(); }}>Post to feed</Button>
            </div>
          </>
        ) : (
          <Button className="w-full justify-center" onClick={make}>Generate card</Button>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------ STORIES ------------------------------ */
// Instagram-style stories, reframed for the gym: a ring of friends who are
// training now or were recently active, each with a few auto-advancing "what
// I'm doing" cards derived from their (deterministic) activity. Ephemeral and
// fully client-side — no store changes, nothing to fake-persist.

type Tint = 'accent' | 'accent-2' | 'success';
interface StorySlide { icon: string; headline: string; sub: string; tint: Tint }
interface StoryGroup { id: string; name: string; avatarSeed: string; mine: boolean; active: boolean; slides: StorySlide[] }

function friendSlides(f: Friend): StorySlide[] {
  const act = friendActivity(f);
  const slides: StorySlide[] = [];
  if (f.trainingNow) slides.push({ icon: '🏋️', headline: 'Training right now', sub: `${act.sessions[0]?.label ?? act.favourite} session`, tint: 'success' });
  if (f.streak && f.streak > 0) slides.push({ icon: '🔥', headline: `${f.streak}-day streak`, sub: 'Still showing up', tint: 'accent' });
  const last = act.sessions[0];
  if (last && !f.trainingNow) slides.push({ icon: last.kind === 'cardio' ? '🏃' : '🏋️', headline: last.label, sub: last.detail, tint: 'accent-2' });
  if (slides.length === 0) slides.push({ icon: '⭐', headline: f.rank, sub: `${f.xp.toLocaleString()} XP`, tint: 'accent' });
  return slides.slice(0, 3);
}

function StoriesRow() {
  const friends = useSocial((s) => s.friends);
  const profile = useUser((s) => s.profile);
  const xp = useGami((s) => s.xp);
  const streak = useGami((s) => s.streakDays);
  const last = useWorkout((s) => s.history)[0];
  const [viewer, setViewer] = useState<number | null>(null);

  const groups = useMemo<StoryGroup[]>(() => {
    const mySlides: StorySlide[] = [];
    const trainedToday = last && new Date(last.date).toDateString() === new Date().toDateString();
    if (trainedToday) mySlides.push({ icon: '🏋️', headline: 'You trained today', sub: `${Math.round((last!.totalVolumeKg ?? 0)).toLocaleString()} kg moved`, tint: 'success' });
    if (streak > 0) mySlides.push({ icon: '🔥', headline: `${streak}-day streak`, sub: 'Keep it alive', tint: 'accent' });
    mySlides.push({ icon: '⭐', headline: rankLabel(rankForXp(xp).tier), sub: `${xp.toLocaleString()} XP`, tint: 'accent-2' });

    const mine: StoryGroup = { id: 'me', name: 'Your story', avatarSeed: (profile?.name ?? 'You').slice(0, 2).toUpperCase(), mine: true, active: true, slides: mySlides.slice(0, 3) };

    const friendGroups: StoryGroup[] = [...friends]
      .sort((a, b) => Number(!!b.trainingNow) - Number(!!a.trainingNow) || Number(b.online) - Number(a.online) || b.xp - a.xp)
      .map((f) => ({ id: f.id, name: f.name, avatarSeed: f.avatarSeed, mine: false, active: !!f.trainingNow || f.online || !!(f.streak && f.streak > 0), slides: friendSlides(f) }));

    return [mine, ...friendGroups];
  }, [friends, profile?.name, xp, streak, last]);

  return (
    <>
      <div data-noswipe className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
        {groups.map((g, i) => (
          <button key={g.id} onClick={() => { haptic('tap'); setViewer(i); }} className="flex flex-col items-center gap-1 shrink-0 w-[60px]">
            <span className={`relative rounded-full p-[2.5px] ${g.active ? 'bg-gradient-to-tr from-accent via-accent-2 to-accent' : 'bg-line'}`}>
              <span className="block rounded-full p-[2px] bg-bg">
                <Avatar seed={g.avatarSeed} />
              </span>
              {g.mine && <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent text-black p-0.5 ring-2 ring-bg"><Plus size={11} strokeWidth={3} /></span>}
            </span>
            <span className="text-[10px] text-muted truncate w-full text-center">{g.mine ? 'You' : g.name}</span>
          </button>
        ))}
      </div>
      {viewer !== null && <StoryViewer groups={groups} start={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

function StoryViewer({ groups, start, onClose }: { groups: StoryGroup[]; start: number; onClose: () => void }) {
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const group = groups[gi];
  const slide = group?.slides[si];

  function next() {
    if (!group) return;
    if (si < group.slides.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); }
    else onClose();
  }
  function prev() {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(0); }
  }

  // auto-advance each slide
  useEffect(() => {
    const t = setTimeout(next, 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si]);

  if (!group || !slide) return null;
  const tint = `rgb(var(--${slide.tint}))`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[80] bg-black">
      <div className="relative h-full w-full overflow-hidden" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${tint}, rgb(var(--bg)) 70%)` }}>
        {/* progress segments */}
        <div className="absolute top-2 inset-x-3 flex gap-1 z-10">
          {group.slides.map((_, i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
              {i < si && <span className="block h-full bg-white" />}
              {i === si && <motion.span key={`${gi}-${si}`} className="block h-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 4.2, ease: 'linear' }} />}
            </span>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-6 inset-x-3 flex items-center gap-2 z-10">
          <Avatar seed={group.avatarSeed} small />
          <span className="text-sm font-semibold text-white drop-shadow">{group.mine ? 'Your story' : group.name}</span>
          <button onClick={onClose} className="ml-auto text-white/90 p-1"><X size={20} /></button>
        </div>

        {/* tap zones */}
        <button aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 w-1/3 z-[5]" />
        <button aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 w-2/3 z-[5]" />

        {/* content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-none">
          <motion.div key={`${gi}-${si}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            <div className="text-7xl mb-4">{slide.icon}</div>
            <p className="text-2xl font-extrabold text-white drop-shadow">{slide.headline}</p>
            <p className="text-sm text-white/80 mt-1">{slide.sub}</p>
          </motion.div>
        </div>

        {/* quick reactions (Instagram-style story reactions) */}
        {!group.mine && (
          <div className="absolute bottom-6 inset-x-0 z-10 flex justify-center gap-2">
            {['🔥', '💪', '👏', '🐐'].map((e) => (
              <button key={e} onClick={() => { haptic('success'); toast(`Sent ${e} to ${group.name}`); }}
                className="text-2xl rounded-full bg-white/15 backdrop-blur px-3 py-1.5 active:scale-90 transition-transform">{e}</button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------ FRIENDS ------------------------------ */

function Friends() {
  const t = useT();
  const friends = useSocial((s) => s.friends);
  const requests = useSocial((s) => s.requests);
  const sendFriendRequest = useSocial((s) => s.sendFriendRequest);
  const acceptRequest = useSocial((s) => s.acceptRequest);
  const declineRequest = useSocial((s) => s.declineRequest);
  const addFriendByInvite = useSocial((s) => s.addFriendByInvite);
  const syncFriends = useSocial((s) => s.syncFriends);
  const cheerFriend = useSocial((s) => s.cheerFriend);
  const profile = useUser((s) => s.profile);
  const updateProfile = useUser((s) => s.updateProfile);
  const myXp = useGami((s) => s.xp);
  const myStreak = useGami((s) => s.streakDays);
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
  const suggested = MOCK_SUGGESTED.filter((s) => !friends.some((f) => f.name === s.name) && !requests.some((r) => r.name === s.name));

  function add() {
    const clean = name.trim();
    if (!clean) return;
    // Pasted an invite link / payload? Add the real person instantly.
    const invite = tryExtractInvite(clean);
    if (invite) {
      const res = addFriendByInvite(invite);
      if (res === 'self') toast("That's your own invite link 🙂", 'info');
      else if (res === 'duplicate') toast(`${invite.name} is already in your circle`);
      else { haptic('success'); toast(`${invite.name} is now your gym partner 🤝`); }
      setName('');
      return;
    }
    // Otherwise treat it as a name (a request that can't be verified offline).
    sendFriendRequest(clean);
    setName('');
    haptic('success');
    toast(`Request sent to ${clean}`);
  }

  async function shareCode() {
    const text = `Train with me on ForgeOS 💪 Tap to add me as your gym partner:`;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: 'ForgeOS', text, url: inviteLink }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast('Invite link copied — paste it to a friend');
  }

  function regenCode() {
    updateProfile({ friendCode: generateFriendCode() });
    haptic('success');
    toast('New friend code generated 🔁');
  }

  const q = query.trim().toLowerCase();
  const shownFriends = q ? friends.filter((f) => f.name.toLowerCase().includes(q)) : friends;

  const board = [...friends.map((f) => ({ name: f.name, xp: f.xp, you: false })), { name: profile?.name ?? 'You', xp: myXp, you: true }]
    .sort((a, b) => b.xp - a.xp);

  return (
    <div className="space-y-3">
      {/* Your code / invite */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted">Your friend code</p>
            <p className="font-mono font-bold text-lg">{code}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={regenCode} aria-label="Generate a new code" className="rounded-full p-2 text-muted hover:text-accent"><RotateCw size={15} /></button>
            <Button onClick={shareCode}><span className="flex items-center gap-1 text-xs">{copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? 'Copied' : 'Invite link'}</span></Button>
          </div>
        </div>
        <p className="text-[11px] text-muted">Share your invite link — when a friend taps it, you're added to each other instantly. No code typing needed.</p>
      </Card>

      {/* Add by name or code */}
      <Card className="space-y-2">
        <SectionTitle>{t('s.addFriend')}</SectionTitle>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder="Paste an invite link, or a name" className="flex-1 rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />
          <Button disabled={!name.trim()} onClick={add}><span className="flex items-center gap-1"><UserPlus size={15} /> {t('s.add')}</span></Button>
        </div>
      </Card>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div>
          <SectionTitle>Friend requests</SectionTitle>
          {incoming.map((r) => (
            <Card key={r.id} className="flex items-center gap-3">
              <Avatar seed={r.avatarSeed} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                <p className="text-xs text-muted">{r.rank} · {r.xp.toLocaleString()} XP{r.mutuals ? ` · ${r.mutuals} mutual` : ''}</p>
              </div>
              <button onClick={() => { acceptRequest(r.id); haptic('success'); toast(`${r.name} is now your friend 🤝`); }} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black flex items-center gap-1 shrink-0"><Check size={14} /> Confirm</button>
              <button onClick={() => { declineRequest(r.id); haptic('tap'); }} aria-label={`Delete request from ${r.name}`} className="rounded-full bg-surface-2 p-1.5 text-muted shrink-0"><X size={16} /></button>
            </Card>
          ))}
        </div>
      )}

      {/* Outgoing pending */}
      {outgoing.length > 0 && (
        <div>
          <SectionTitle>Pending</SectionTitle>
          {outgoing.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 opacity-70">
              <Avatar seed={r.avatarSeed} />
              <div className="flex-1"><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-muted">Request sent…</p></div>
              <Badge>pending</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Your circle */}
      <SectionTitle action={<span className="text-[11px] text-muted">{friends.length}</span>}>{t('s.yourCircle')}</SectionTitle>
      {friends.length > 4 && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3">
          <Search size={15} className="text-muted shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search friends" className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="text-muted"><X size={15} /></button>}
        </div>
      )}
      {shownFriends.map((f) => (
        <Card key={f.id} className="flex items-center gap-3">
          <button onClick={() => setOpenFriend(f)}><Avatar seed={f.avatarSeed} /></button>
          <button className="flex-1 text-left" onClick={() => setOpenFriend(f)}>
            <p className="text-sm font-semibold flex items-center gap-2">
              {f.name}
              {f.friendCode && <Check size={12} className="text-accent" aria-label="Added via invite link" />}
              {f.trainingNow ? <span className="text-[10px] text-success flex items-center gap-0.5"><Circle size={7} className="fill-success" /> training</span>
                : <Circle size={8} className={f.online ? 'text-success fill-success' : 'text-muted fill-muted'} />}
            </p>
            <p className="text-xs text-muted">{f.rank} · {f.xp.toLocaleString()} XP{f.streak ? ` · 🔥${f.streak}` : ''}</p>
          </button>
          <button onClick={() => { cheerFriend(f.id); haptic('success'); toast(`Cheered ${f.name} 👏`); }} aria-label="Cheer" className={`rounded-full p-2 ${f.cheeredAt ? 'text-accent' : 'text-muted hover:text-accent'}`}>
            <Heart size={16} className={f.cheeredAt ? 'fill-accent' : ''} />
          </button>
          <ChevronRight size={16} className="text-muted" onClick={() => setOpenFriend(f)} />
        </Card>
      ))}
      {friends.length === 0 && <p className="text-sm text-muted">No friends yet — add by code or pick a suggestion below.</p>}
      {friends.length > 0 && shownFriends.length === 0 && <p className="text-sm text-muted">No friend matches “{query}”.</p>}

      {/* Suggested */}
      {suggested.length > 0 && (
        <div>
          <SectionTitle>People you may know</SectionTitle>
          {suggested.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <Avatar seed={p.avatarSeed} />
              <div className="flex-1"><p className="text-sm font-semibold">{p.name}</p><p className="text-xs text-muted">{p.rank} · {p.xp.toLocaleString()} XP</p></div>
              <Button variant="ghost" className="px-3" onClick={() => { sendFriendRequest(p.name, p); haptic('success'); toast(`Request sent to ${p.name}`); }}><span className="flex items-center gap-1 text-xs"><UserPlus size={14} /> Add</span></Button>
            </Card>
          ))}
        </div>
      )}

      {/* Friends leaderboard */}
      <div>
        <SectionTitle action={<Crown size={14} className="text-accent-2" />}>Friends leaderboard</SectionTitle>
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

      <FriendSheet friend={openFriend} onClose={() => setOpenFriend(null)} />
    </div>
  );
}

function FriendSheet({ friend, onClose }: { friend: Friend | null; onClose: () => void }) {
  const removeFriend = useSocial((s) => s.removeFriend);
  const startDuel = useSocial((s) => s.startDuel);
  const cheerFriend = useSocial((s) => s.cheerFriend);
  const feed = useSocial((s) => s.feed);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { activity: act } = useFriendActivity(friend);
  useEffect(() => { setConfirmRemove(false); }, [friend]);
  if (!friend || !act) return null;

  const theirPosts = feed.filter((p) => p.authorName === friend.name).slice(0, 3);

  return (
    <Sheet open={!!friend} onClose={onClose} title={friend.name}>
      <div className="space-y-3">
        {/* header */}
        <div className="flex items-center gap-3">
          <Avatar seed={friend.avatarSeed} large />
          <div className="min-w-0">
            <p className="font-bold text-lg">{friend.name}</p>
            <p className="text-sm text-accent">{friend.rank} · {friend.xp.toLocaleString()} XP</p>
            <p className="text-[11px] text-muted">{friend.trainingNow ? 'Training now 🟢' : friend.online ? 'Online' : `Last active ${friend.lastActiveISO ? timeAgo(friend.lastActiveISO) : 'recently'}`}{friend.streak ? ` · 🔥 ${friend.streak}` : ''}</p>
          </div>
        </div>
        {/* honesty tag: is this data live & real, or a local sample? */}
        <p className="text-[10px] text-muted flex items-center gap-1">
          {act.real
            ? <><Circle size={7} className="fill-success text-success" /> Live activity</>
            : <>✦ Sample activity (no backend connected)</>}
        </p>

        {act.private ? (
          <div className="rounded-xl bg-surface-2 px-4 py-6 text-center">
            <p className="text-2xl mb-1">🔒</p>
            <p className="text-sm font-medium">{friend.name} keeps their activity private</p>
            <p className="text-[11px] text-muted mt-1">You can still see their rank and XP.</p>
          </div>
        ) : (
          <>
            {act.bio && <p className="text-[11px] text-muted italic">“{act.bio}”</p>}

            {/* stat strip */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <MiniStat v={`${act.weeklySessions}`} l="this wk" />
              <MiniStat v={`${Math.round(act.totalVolumeKg / 1000)}t`} l="volume" />
              <MiniStat v={`${act.prs}`} l="PRs" />
              <MiniStat v={friend.streak ? `${friend.streak}` : '—'} l="streak" />
            </div>
            {act.favourite && <p className="text-[11px] text-muted text-center">Top lift: <span className="text-text font-medium">{act.favourite}</span></p>}

            {/* recent activity */}
            {act.sessions.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Recent activity</p>
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
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Latest posts</p>
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
          <Button className="justify-center" onClick={() => { startDuel(friend.name, friend.avatarSeed, 'volume', 20000, 7); haptic('success'); toast(`Challenge sent to ${friend.name} ⚔️`); onClose(); }}>
            <span className="flex items-center gap-1"><Swords size={15} /> Duel</span>
          </Button>
          <Button variant="ghost" className="justify-center" onClick={() => { cheerFriend(friend.id); haptic('success'); toast(`Cheered ${friend.name} 👏`); }}>
            <span className="flex items-center gap-1"><Heart size={15} /> Cheer</span>
          </Button>
          <Button variant="ghost" className="justify-center" onClick={() => {
            if (!confirmRemove) { setConfirmRemove(true); haptic('warning'); return; }
            const name = friend.name;
            removeFriend(friend.id); haptic('tap'); toast(`Unfriended ${name}`); onClose();
          }}>
            <span className="flex items-center gap-1 text-danger"><UserMinus size={15} /> {confirmRemove ? 'Confirm?' : 'Unfriend'}</span>
          </Button>
        </div>
        {confirmRemove && <p className="text-[11px] text-muted text-center">Tap “Confirm?” again to remove {friend.name} from your circle.</p>}
      </div>
    </Sheet>
  );
}

function MiniStat({ v, l }: { v: string; l: string }) {
  return <div className="rounded-xl bg-surface-2 py-2"><p className="font-mono font-bold text-sm">{v}</p><p className="text-[10px] text-muted">{l}</p></div>;
}

/* ------------------------------- RACE -------------------------------- */

function Race() {
  return (
    <div className="space-y-3">
      <LiveRace />
      <Duels />
    </div>
  );
}

function LiveRace() {
  const profile = useUser((s) => s.profile);
  const friends = useSocial((s) => s.friends);
  const meName = profile?.name ?? 'You';
  const meId = profile?.id ?? 'me';
  const [opponent, setOpponent] = useState<Friend | null>(null);
  const [live, setLive] = useState(false);
  const [scores, setScores] = useState<{ userId: string; name: string; volumeKg: number }[]>([]);
  const ctrl = useRef<{ broadcast: (v: number) => void; leave: () => void } | null>(null);
  const myVol = useRef(0);
  const TARGET = 8000;

  // Stronger opponents grind faster.
  const oppPace = opponent ? Math.max(120, Math.min(260, Math.round(opponent.xp / 80))) : 160;

  function start(opp: Friend) {
    haptic('tap');
    setOpponent(opp);
    myVol.current = 0;
    ctrl.current = joinRace(`duel-${opp.id}`, { userId: meId, name: meName, volumeKg: 0 }, (all) => setScores([...all].sort((a, b) => b.volumeKg - a.volumeKg)));
    setScores([{ userId: meId, name: meName, volumeKg: 0 }, { userId: opp.id, name: opp.name, volumeKg: 0 }]);
    setLive(true);
  }
  function stop() { ctrl.current?.leave(); ctrl.current = null; setLive(false); setOpponent(null); }
  function logRep() {
    myVol.current += 200;
    haptic('tap');
    ctrl.current?.broadcast(myVol.current);
    setScores((prev) => prev.map((s) => s.userId === meId ? { ...s, volumeKg: myVol.current } : (opponent && s.userId === opponent.id) ? { ...s, volumeKg: Math.min(TARGET, s.volumeKg + oppPace + Math.round(Math.random() * 60)) } : s));
  }

  const leader = scores[0];
  const won = leader && leader.volumeKg >= TARGET;
  const online = friends;

  const celebrated = useRef(false);
  useEffect(() => {
    if (!live) { celebrated.current = false; return; }
    if (won && !celebrated.current) {
      celebrated.current = true;
      const meWon = leader?.userId === meId;
      celebrate();
      toast(meWon ? 'You won the race! 🏁🔥' : `${leader?.name} took this one 🏁`, meWon ? 'success' : 'info');
    }
  }, [won, live, leader, meId]);

  if (!live) {
    return (
      <Card className="space-y-3">
        <div className="text-center space-y-1">
          <Swords className="mx-auto text-accent" />
          <p className="font-semibold">Live race</p>
          <p className="text-sm text-muted">Train side-by-side in real time — first to {TARGET.toLocaleString()} kg wins.</p>
        </div>
        <p className="text-[11px] uppercase tracking-wide text-muted">Challenge a friend</p>
        {online.length === 0 && <p className="text-sm text-muted">Add friends first to race them.</p>}
        <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
          {online.map((f) => (
            <button key={f.id} onClick={() => start(f)} className="w-full flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-left">
              <Avatar seed={f.avatarSeed} />
              <div className="flex-1"><p className="text-sm font-semibold flex items-center gap-1">{f.name} {f.trainingNow && <Circle size={7} className="fill-success text-success" />}</p><p className="text-[11px] text-muted">{f.rank} · {f.xp.toLocaleString()} XP</p></div>
              <Badge color="rgb(var(--accent))">Race</Badge>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted/70 flex items-center justify-center gap-1"><Wifi size={12} /> Realtime via Supabase presence + broadcast (auto-live with keys).</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle action={won ? <Badge color="rgb(var(--success))">🏁 {leader.name} wins</Badge> : <button onClick={stop} className="text-xs text-muted">Leave</button>}>
        vs {opponent?.name}
      </SectionTitle>
      {scores.map((s) => (
        <div key={s.userId} className="py-1.5">
          <div className="flex justify-between text-sm">
            <span className={s.userId === meId ? 'text-accent font-semibold' : ''}>{s.name}</span>
            <span className="font-mono">{Math.round(s.volumeKg).toLocaleString()} kg</span>
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, (s.volumeKg / TARGET) * 100)}%` }} /></div>
        </div>
      ))}
      {!won
        ? <Button variant="ghost" className="w-full justify-center mt-2" onClick={logRep}>Log a set (+200 kg)</Button>
        : <Button className="w-full justify-center mt-2" onClick={stop}>Finish race</Button>}
    </Card>
  );
}

const DUEL_LABEL: Record<DuelMetric, string> = { volume: 'kg volume', sessions: 'sessions', sets: 'sets' };

function Duels() {
  const duels = useSocial((s) => s.duels);
  const friends = useSocial((s) => s.friends);
  const startDuel = useSocial((s) => s.startDuel);
  const advanceDuel = useSocial((s) => s.advanceDuel);
  const clearDuel = useSocial((s) => s.clearDuel);
  const addXp = useGami((s) => s.addXp);
  const addCoins = useGami((s) => s.addCoins);
  const [open, setOpen] = useState(false);

  function onAdvance(id: string, metric: DuelMetric) {
    const step = metric === 'volume' ? 1500 : metric === 'sets' ? 3 : 1;
    advanceDuel(id, step);
    haptic('tap');
    const d = useSocial.getState().duels.find((x) => x.id === id);
    if (d?.status === 'won') { addXp(150); addCoins(20); celebrate(); toast('Challenge won! +150 XP · 🪙20 🏆'); }
    else if (d?.status === 'lost') { toast('Challenge lost — get them next time.', 'info'); }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Weekly challenges</SectionTitle>
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => setOpen(true)} disabled={friends.length === 0}><span className="text-xs flex items-center gap-1"><Swords size={14} /> New</span></Button>
      </div>
      {duels.length === 0 && <p className="text-sm text-muted">No active challenges. Throw down a gauntlet 🥊</p>}
      {duels.map((d) => {
        const ended = d.status !== 'active';
        return (
          <Card key={d.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2"><Swords size={14} className="text-accent" /> vs {d.opponentName}</p>
              {d.status === 'won' && <Badge color="rgb(var(--success))">You won 🏆</Badge>}
              {d.status === 'lost' && <Badge color="rgb(var(--danger))">Lost</Badge>}
              {d.status === 'active' && <Badge>{daysLeft(d.endsAt)}</Badge>}
            </div>
            <p className="text-[11px] text-muted">First to {d.target.toLocaleString()} {DUEL_LABEL[d.metric]}</p>
            <DuelBar label="You" value={d.myProgress} target={d.target} me />
            <DuelBar label={d.opponentName} value={d.theirProgress} target={d.target} />
            {ended
              ? <Button variant="ghost" className="w-full justify-center" onClick={() => clearDuel(d.id)}>Clear</Button>
              : <Button variant="ghost" className="w-full justify-center" onClick={() => onAdvance(d.id, d.metric)}>Log progress (+{d.metric === 'volume' ? '1,500 kg' : d.metric === 'sets' ? '3 sets' : '1 session'})</Button>}
          </Card>
        );
      })}
      <NewDuelSheet open={open} onClose={() => setOpen(false)} friends={friends} onStart={(f, m, target, days) => { startDuel(f.name, f.avatarSeed, m, target, days); setOpen(false); haptic('success'); }} />
    </div>
  );
}

function DuelBar({ label, value, target, me }: { label: string; value: number; target: number; me?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-[11px]"><span className={me ? 'text-accent font-semibold' : 'text-muted'}>{label}</span><span className="font-mono text-muted">{value.toLocaleString()}/{target.toLocaleString()}</span></div>
      <div className="h-1.5 mt-0.5 rounded-full bg-surface-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${me ? 'bg-accent' : 'bg-accent-2'}`} style={{ width: `${Math.min(100, (value / target) * 100)}%` }} /></div>
    </div>
  );
}

function NewDuelSheet({ open, onClose, friends, onStart }: { open: boolean; onClose: () => void; friends: Friend[]; onStart: (f: Friend, m: DuelMetric, target: number, days: number) => void }) {
  const [fid, setFid] = useState<string>('');
  const [metric, setMetric] = useState<DuelMetric>('volume');
  const [days, setDays] = useState(7);
  const friend = friends.find((f) => f.id === fid) ?? friends[0];
  const targets: Record<DuelMetric, number> = { volume: 20000, sets: 60, sessions: 4 };
  return (
    <Sheet open={open} onClose={onClose} title="New challenge">
      <div className="space-y-3">
        <p className="text-[11px] text-muted">Pick a friend and a target. Whoever hits it first in {days} days wins XP + coins.</p>
        <p className="text-xs font-medium">Opponent</p>
        <div className="flex gap-2 flex-wrap">
          {friends.map((f) => <Pill key={f.id} active={(fid || friends[0]?.id) === f.id} onClick={() => setFid(f.id)}>{f.name}</Pill>)}
        </div>
        <p className="text-xs font-medium">Metric</p>
        <div className="flex gap-2">
          {(['volume', 'sets', 'sessions'] as DuelMetric[]).map((m) => <Pill key={m} active={metric === m} onClick={() => setMetric(m)}>{m}</Pill>)}
        </div>
        <p className="text-xs font-medium">Duration: {days} days</p>
        <input type="range" min={3} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
        <Button className="w-full justify-center" disabled={!friend} onClick={() => friend && onStart(friend, metric, targets[metric], days)}>
          First to {targets[metric].toLocaleString()} {DUEL_LABEL[metric]} · {days}d
        </Button>
      </div>
    </Sheet>
  );
}

/* ---------------------------- MARKETPLACE ---------------------------- */

function Marketplace() {
  const owned = useSocial((s) => s.ownedRoutineIds);
  const published = useSocial((s) => s.publishedRoutines);
  const buy = useSocial((s) => s.buyRoutine);
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const savePlanAs = useUser((s) => s.savePlanAs);
  const navigate = useNavigate();

  const all = [...published, ...MOCK_MARKETPLACE];

  function purchase(id: string, price: number, title: string) {
    if (owned.includes(id)) return;
    if (spend(price)) { buy(id); celebrate(); toast(`Unlocked “${title}” 🎉`); } else { haptic('warning'); toast(`Not enough coins — need 🪙${price}.`, 'error'); }
  }
  function applyPlan(r: typeof all[number]) {
    if (!r.plan) return;
    setWeekPlan(r.plan); savePlanAs(r.title); haptic('success'); toast(`“${r.title}” loaded into your plan`); navigate('/plan');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle>Routine marketplace</SectionTitle>
        <Badge color="rgb(var(--accent-2))">🪙 {coins}</Badge>
      </div>
      <Button variant="ghost" className="w-full justify-center" onClick={() => navigate('/plan')}>Publish your plan → open editor</Button>
      {all.map((r) => {
        const isOwned = owned.includes(r.id);
        return (
          <Card key={r.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{r.title} {r.byMe && <Badge color="rgb(var(--success))">yours</Badge>}</p>
              <Badge>{r.focus}</Badge>
            </div>
            <p className="text-xs text-muted">by {r.author} ({r.authorRank}) · {r.weeks}wk · {r.daysPerWeek}d/wk · <Star size={10} className="inline" /> {r.rating}</p>
            {isOwned && r.plan ? (
              <Button className="w-full justify-center" onClick={() => applyPlan(r)}>Use this plan</Button>
            ) : (
              <Button variant={isOwned ? 'ghost' : 'primary'} className="w-full justify-center" disabled={isOwned} onClick={() => purchase(r.id, r.priceCoins, r.title)}>
                {isOwned ? 'Owned ✓' : `Buy · 🪙 ${r.priceCoins}`}
              </Button>
            )}
          </Card>
        );
      })}
      <p className="text-[11px] text-muted/70 flex items-center gap-1"><Store size={12} /> Publish your own plan from the week-plan editor; buyers can adopt it in one tap.</p>
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

function Avatar({ seed, small, large }: { seed: string; small?: boolean; large?: boolean }) {
  const size = small ? 'w-7 h-7 text-[10px]' : large ? 'w-14 h-14 text-base' : 'w-9 h-9 text-xs';
  return <div className={`${size} rounded-full bg-surface-2 flex items-center justify-center font-bold text-accent shrink-0`}>{seed}</div>;
}

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 0 ? 'ending' : `${d}d left`;
}
