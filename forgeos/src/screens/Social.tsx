import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Share2, X,
  MessageCircle, Send, Trash2, Zap, Dumbbell, Plus, 
  
} from 'lucide-react';
import { isBackendLive } from '../lib/supabase';

import { Screen } from '../components/Screen';
import { Card, Button, Pill, Badge, SectionTitle, Sheet } from '../components/ui';

import { useSocial } from '../state/socialStore';

import { useSettings } from '../state/settingsStore';
import { useGami } from '../state/gamificationStore';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { BUILT_IN_AUTHOR, starterRoutines, trainingNowLabel } from '../lib/socialSeed';

import { rankForXp, rankLabel } from '../data/ranks';
import { generateShareCard, downloadDataUrl } from '../lib/shareCard';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';

import { friendActivity } from '../lib/friendActivity';

import { useT } from '../lib/i18n';
import type { FeedPost, Friend } from '../types';
import { Avatar } from './SocialShared';
import { timeAgo } from '../lib/socialTime';
import { Friends } from './SocialFriends';
import { Race } from './SocialRace';

const REACTIONS = ['🔥', '💪', '👏', '🐐', '🧠'];
type Tab = 'feed' | 'friends' | 'race' | 'market';

export default function Social() {
  const t = useT();
  // Deep links (e.g. joining a race) can open a specific tab via ?tab=.
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const wanted = params.get('tab');
    return wanted === 'friends' || wanted === 'race' || wanted === 'market' ? wanted : 'feed';
  });
  const marketEnabled = useSettings((s) => s.marketplaceEnabled);
  const v2 = useSettings((s) => s.designMode === 'v2');
  const requests = useSocial((s) => s.requests);
  const incoming = requests.filter((r) => r.direction === 'incoming').length;

  const tabDefs: { id: Tab; label: string; badge: number }[] = [
    { id: 'feed', label: t('s.feed'), badge: 0 },
    { id: 'friends', label: t('s.friends'), badge: incoming },
    { id: 'race', label: t('s.race'), badge: 0 },
    ...(marketEnabled ? [{ id: 'market' as Tab, label: t('s.market'), badge: 0 }] : []),
  ];

  return (
    <Screen title={t('nav.social')} subtitle={t('Iron sharpens iron.')}>
      {v2 ? (
        <div data-noswipe className="flex gap-5 border-b border-line overflow-x-auto no-scrollbar">
          {tabDefs.map((d) => (
            <button
              key={d.id}
              onClick={() => setTab(d.id)}
              className={`relative shrink-0 pt-1 pb-2 text-sm uppercase tracking-wide ${tab === d.id ? 'text-text font-semibold' : 'text-muted'}`}
            >
              {t(d.label)}
              {d.badge > 0 && <span className="ml-1 rounded-full bg-accent-2 px-1.5 text-[10px] font-bold text-black">{d.badge}</span>}
              {tab === d.id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent" />}
            </button>
          ))}
        </div>
      ) : (
        <div data-noswipe className="flex gap-2 overflow-x-auto no-scrollbar">
          <Pill active={tab === 'feed'} onClick={() => setTab('feed')}>{t('s.feed')}</Pill>
          <Pill active={tab === 'friends'} onClick={() => setTab('friends')}>
            {t('s.friends')}{incoming > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{incoming}</span>}
          </Pill>
          <Pill active={tab === 'race'} onClick={() => setTab('race')}>{t('s.race')}</Pill>
          {marketEnabled && <Pill active={tab === 'market'} onClick={() => setTab('market')}>{t('s.market')}</Pill>}
        </div>
      )}

      {tab === 'feed' && <Feed onRace={() => setTab('race')} />}
      {tab === 'friends' && <Friends />}
      {tab === 'race' && <Race />}
      {tab === 'market' && marketEnabled && <Marketplace />}
    </Screen>
  );
}

/* ------------------------------- FEED ------------------------------- */

function Feed({ onRace }: { onRace: () => void }) {
  const t = useT();
  const feed = useSocial((s) => s.feed);
  const refreshFeed = useSocial((s) => s.refreshFeed);
  const friends = useSocial((s) => s.friends);
  const v2 = useSettings((s) => s.designMode === 'v2');
  const [filter, setFilter] = useState<'all' | 'friends' | 'mine'>('all');
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    const fresh = await refreshFeed();
    setRefreshing(false);
    haptic(fresh ? 'tap' : 'warning');
    if (fresh === null) toast(t('Could not reach the feed. Check your connection.'), 'error');
    else toast(fresh === 0 ? 'You are up to date' : `${fresh} new ${fresh === 1 ? 'post' : 'posts'}`);
  }

  const shown = feed.filter((p) => (filter === 'mine' ? p.mine : filter === 'friends' ? !p.mine : true));
  const liveFriends = friends.filter((f) => f.trainingNow);

  return (
    <div className="space-y-3">
      {/* V2 "live-first": a training-now strip that jumps to the Race tab */}
      {v2 && liveFriends.length > 0 && (
        <button
          onClick={onRace}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left"
          style={{ border: '1px solid rgb(var(--success) / 0.35)', background: 'rgb(var(--success) / 0.06)' }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'rgb(var(--success))', boxShadow: '0 0 0 3px rgb(var(--success) / 0.2)' }} />
          <span className="text-[13px] flex-1">
            <b className="text-success">{trainingNowLabel(liveFriends.map((f) => f.name))}</b> {t('training now')}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-accent shrink-0">{t('Race ▸')}</span>
        </button>
      )}
      <StoriesRow />
      <Composer onShareCard={() => setShareOpen(true)} />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'friends', 'mine'] as const).map((f) => (
            <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Pill>
          ))}
        </div>
        {isBackendLive && (
          <button className="text-xs text-muted flex items-center gap-1 min-h-[40px] px-1 disabled:opacity-50" disabled={refreshing} onClick={() => void refresh()}>
            <Zap size={13} /> {refreshing ? t('Checking…') : t('Refresh')}
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <Card className="text-center space-y-1 py-6">
          <p className="text-sm font-semibold">{filter === 'friends' ? t('No posts from friends yet') : t('Your feed is empty')}</p>
          <p className="text-xs text-muted">
            {friends.length === 0
              ? t('Add a gym partner in the Friends tab and their workouts show up here.')
              : t('Post a workout above, or check back after your friends train.')}
          </p>
        </Card>
      )}

      {shown.map((p) => <PostCard key={p.id} post={p} />)}

      <ShareCardSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

// Double-tap anywhere on a post to drop a 🔥 — Instagram's signature gesture,
// reframed as a "spotter's cheer" for the gym.
const DOUBLE_TAP_EMOJI = '🔥';

function PostCard({ post: p }: { post: FeedPost }) {
  const t = useT();
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
          <p className="text-sm font-semibold">{p.authorName}{p.mine && <span className="ml-1 text-[10px] text-muted">{t('· you')}</span>}</p>
          <p className="text-[11px] text-muted">{timeAgo(p.createdAt)}</p>
        </div>
        {p.mine && (
          <button onClick={() => { deletePost(p.id); haptic('tap'); }} aria-label={t('Delete post')} className="text-muted hover:text-danger"><Trash2 size={15} /></button>
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
            {p.workoutSummary.sets > 0 && <><span>{p.workoutSummary.sets} {t('sets')}</span>·</>}
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
  const t = useT();
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
          placeholder={t('Add a comment…')} className="flex-1 rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm" />
        <Button className="px-3" disabled={!text.trim()} onClick={() => { addComment(postId, text); setText(''); haptic('tap'); }}><Send size={15} /></Button>
      </div>
    </div>
  );
}

function Composer({ onShareCard }: { onShareCard: () => void }) {
  const t = useT();
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
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('Flex something: a PR, a streak, a win…')}
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
            <Dumbbell size={12} /> {t('Attach last workout')}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 justify-center" onClick={post}>{t('Post to feed')}</Button>
        <Button variant="ghost" className="justify-center px-3" onClick={onShareCard}><Share2 size={16} /></Button>
      </div>
    </Card>
  );
}

function ShareCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
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
    <Sheet open={open} onClose={onClose} title={t('Workout share card')}>
      <div className="space-y-3">
        {!last && <p className="text-sm text-muted">{t('Finish a workout to generate a real summary. Showing a sample otherwise.')}</p>}
        {url ? (
          <>
            <img src={url} alt={t('share card')} className="w-40 mx-auto rounded-xl border border-line" />
            <div className="flex gap-2">
              <Button className="flex-1 justify-center" onClick={() => downloadDataUrl(url, 'forgeos-card.png')}>{t('Save image')}</Button>
              <Button variant="ghost" className="flex-1 justify-center" onClick={() => { publishPost('Just forged a session 🔥', { summary: last ? { volumeKg: Math.round(last.totalVolumeKg ?? 0), sets: last.exercises.reduce((a, e) => a + e.sets.length, 0), durationMin: 45 } : undefined, imageUrl: url ?? undefined }); onClose(); }}>{t('Post to feed')}</Button>
            </div>
          </>
        ) : (
          <Button className="w-full justify-center" onClick={make}>{t('Generate card')}</Button>
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
  const t = useT();
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
            <span className="text-[10px] text-muted truncate w-full text-center">{g.mine ? t('You') : g.name}</span>
          </button>
        ))}
      </div>
      {viewer !== null && <StoryViewer groups={groups} start={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

function StoryViewer({ groups, start, onClose }: { groups: StoryGroup[]; start: number; onClose: () => void }) {
  const tr = useT();
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
          <span className="text-sm font-semibold text-white drop-shadow">{group.mine ? tr('Your story') : group.name}</span>
          <button onClick={onClose} aria-label={tr('Close story')} className="ml-auto text-white/90 p-1"><X size={20} /></button>
        </div>

        {/* tap zones */}
        <button aria-label={tr('Previous')} onClick={prev} className="absolute inset-y-0 left-0 w-1/3 z-[5]" />
        <button aria-label={tr('Next')} onClick={next} className="absolute inset-y-0 right-0 w-2/3 z-[5]" />

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

/* ---------------------------- MARKETPLACE ---------------------------- */

function Marketplace() {
  const t = useT();
  const owned = useSocial((s) => s.ownedRoutineIds);
  const published = useSocial((s) => s.publishedRoutines);
  const buy = useSocial((s) => s.buyRoutine);
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const savePlanAs = useUser((s) => s.savePlanAs);
  const navigate = useNavigate();

  const all = useMemo(() => [...published, ...starterRoutines()], [published]);

  function purchase(id: string, price: number, title: string) {
    if (owned.includes(id)) return;
    if (spend(price)) { buy(id); celebrate(); toast(`Unlocked “${title}” 🎉`); } else { haptic('warning'); toast(`Not enough coins: need 🪙${price}.`, 'error'); }
  }
  function applyPlan(r: typeof all[number]) {
    if (!r.plan) return;
    setWeekPlan(r.plan); savePlanAs(r.title); haptic('success'); toast(`“${r.title}” loaded into your plan`); navigate('/plan');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle>{t('Routine marketplace')}</SectionTitle>
        <Badge color="rgb(var(--accent-2))">🪙 {coins}</Badge>
      </div>
      <Button variant="ghost" className="w-full justify-center" onClick={() => navigate('/plan')}>{t('Publish your plan → open editor')}</Button>
      {all.map((r) => {
        const isOwned = owned.includes(r.id);
        return (
          <Card key={r.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{r.title} {r.byMe && <Badge color="rgb(var(--success))">{t('yours')}</Badge>}</p>
              <Badge>{r.focus}</Badge>
            </div>
            <p className="text-xs text-muted">
              {r.author === BUILT_IN_AUTHOR && !r.byMe ? t('Built-in program') : `by ${r.author}${r.authorRank ? ` (${r.authorRank})` : ''}`} · {r.weeks} wk · {r.daysPerWeek} {t('days/wk')}
            </p>
            {isOwned && r.plan ? (
              <Button className="w-full justify-center" onClick={() => applyPlan(r)}>{t('Use this plan')}</Button>
            ) : (
              <Button variant={isOwned ? 'ghost' : 'primary'} className="w-full justify-center" disabled={isOwned} onClick={() => purchase(r.id, r.priceCoins, r.title)}>
                {isOwned ? t('Owned ✓') : `Buy · 🪙 ${r.priceCoins}`}
              </Button>
            )}
          </Card>
        );
      })}
      <p className="text-[11px] text-muted/70 flex items-center gap-1"><Store size={12} /> {t('Publish your own plan from the week-plan editor; buyers can adopt it in one tap.')}</p>
    </div>
  );
}
