import { useState, useRef } from 'react';
import { Users, Swords, Store, Share2, Wifi, Circle } from 'lucide-react';
import { joinRace } from '../lib/supabase';
import { Screen } from '../components/Screen';
import { Card, Button, Pill, Badge, SectionTitle, Sheet } from '../components/ui';
import { useSocial } from '../state/socialStore';
import { useSettings } from '../state/settingsStore';
import { useGami } from '../state/gamificationStore';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { MOCK_FRIENDS, MOCK_MARKETPLACE } from '../lib/mockData';
import { rankForXp, rankLabel } from '../data/ranks';
import { generateShareCard, downloadDataUrl } from '../lib/shareCard';
import { haptic } from '../lib/haptics';

const REACTIONS = ['🔥', '💪', '👏', '🐐', '🧠'];
type Tab = 'feed' | 'friends' | 'race' | 'market';

export default function Social() {
  const [tab, setTab] = useState<Tab>('feed');
  const marketEnabled = useSettings((s) => s.marketplaceEnabled);

  return (
    <Screen title="Social" subtitle="Iron sharpens iron.">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <Pill active={tab === 'feed'} onClick={() => setTab('feed')}>Feed</Pill>
        <Pill active={tab === 'friends'} onClick={() => setTab('friends')}>Friends</Pill>
        <Pill active={tab === 'race'} onClick={() => setTab('race')}>Live Race</Pill>
        {marketEnabled && <Pill active={tab === 'market'} onClick={() => setTab('market')}>Marketplace</Pill>}
      </div>

      {tab === 'feed' && <Feed />}
      {tab === 'friends' && <Friends />}
      {tab === 'race' && <Race />}
      {tab === 'market' && marketEnabled && <Marketplace />}
    </Screen>
  );
}

function Feed() {
  const feed = useSocial((s) => s.feed);
  const react = useSocial((s) => s.react);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button variant="ghost" className="w-full justify-center" onClick={() => setShareOpen(true)}>
        <span className="flex items-center gap-2"><Share2 size={16} /> Generate workout share card</span>
      </Button>
      {feed.map((p) => (
        <Card key={p.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Avatar seed={p.avatarSeed} />
            <div>
              <p className="text-sm font-semibold">{p.authorName}</p>
              <p className="text-[11px] text-muted">{timeAgo(p.createdAt)}</p>
            </div>
          </div>
          <p className="text-sm">{p.body}</p>
          {p.workoutSummary && (
            <div className="flex gap-2 text-[11px] text-muted">
              <span>{p.workoutSummary.volumeKg.toLocaleString()} kg</span>·
              <span>{p.workoutSummary.sets} sets</span>·
              <span>{p.workoutSummary.durationMin} min</span>
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap">
            {REACTIONS.map((e) => {
              const count = p.reactions[e] ?? 0;
              return (
                <button
                  key={e}
                  onClick={() => { react(p.id, e); haptic('tap'); }}
                  className={`rounded-full px-2 py-1 text-xs ${p.myReaction === e ? 'bg-accent/20 ring-1 ring-accent' : 'bg-surface-2'}`}
                >
                  {e} {count > 0 && <span className="text-muted">{count}</span>}
                </button>
              );
            })}
          </div>
        </Card>
      ))}
      <ShareCardSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
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
    const data = {
      name: profile?.name ?? 'Athlete',
      rank: rankLabel(tier),
      volumeKg: Math.round(last?.totalVolumeKg ?? 0),
      sets: last?.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0) ?? 0,
      durationMin: Math.round((last?.durationSec ?? 0) / 60) || 45,
    };
    setUrl(generateShareCard(data));
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
              <Button variant="ghost" className="flex-1 justify-center" onClick={() => { publishPost('Just forged a session 🔥', last ? { volumeKg: Math.round(last.totalVolumeKg ?? 0), sets: last.exercises.reduce((a, e) => a + e.sets.length, 0), durationMin: 45 } : undefined); onClose(); }}>Post to feed</Button>
            </div>
          </>
        ) : (
          <Button className="w-full justify-center" onClick={make}>Generate card</Button>
        )}
      </div>
    </Sheet>
  );
}

function Friends() {
  return (
    <div className="space-y-2">
      <SectionTitle>Your circle</SectionTitle>
      {MOCK_FRIENDS.map((f) => (
        <Card key={f.id} className="flex items-center gap-3">
          <Avatar seed={f.avatarSeed} />
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-2">
              {f.name}
              <Circle size={8} className={f.online ? 'text-success fill-success' : 'text-muted fill-muted'} />
            </p>
            <p className="text-xs text-muted">{f.rank} · {f.xp.toLocaleString()} XP</p>
          </div>
          <Badge>{f.online ? 'online' : 'offline'}</Badge>
        </Card>
      ))}
      <Button variant="outline" className="w-full justify-center mt-2"><span className="flex items-center gap-2"><Users size={16} /> Invite a friend</span></Button>
    </div>
  );
}

function Race() {
  const profile = useUser((s) => s.profile);
  const meName = profile?.name ?? 'You';
  const meId = profile?.id ?? 'me';
  const [live, setLive] = useState(false);
  const [scores, setScores] = useState<{ userId: string; name: string; volumeKg: number }[]>([]);
  const ctrl = useRef<{ broadcast: (v: number) => void; leave: () => void } | null>(null);
  const myVol = useRef(0);
  const TARGET = 8000;

  function start() {
    haptic('tap');
    myVol.current = 0;
    ctrl.current = joinRace('lobby-marcus', { userId: meId, name: meName, volumeKg: 0 }, (all) => setScores([...all].sort((a, b) => b.volumeKg - a.volumeKg)));
    // Seed an opponent locally so the board is alive even in mock mode.
    setScores([{ userId: meId, name: meName, volumeKg: 0 }, { userId: 'marcus', name: 'Marcus', volumeKg: 0 }]);
    setLive(true);
  }
  function stop() {
    ctrl.current?.leave();
    ctrl.current = null;
    setLive(false);
  }
  function logRep() {
    myVol.current += 200;
    haptic('tap');
    ctrl.current?.broadcast(myVol.current);
    // In mock mode there is no remote echo, so advance both locally.
    setScores((prev) => prev.map((s) => (s.userId === meId ? { ...s, volumeKg: myVol.current } : s.userId === 'marcus' ? { ...s, volumeKg: Math.min(TARGET, s.volumeKg + 150 + ((myVol.current / 200) % 3) * 40) } : s)));
  }

  const leader = scores[0];
  const won = leader && leader.volumeKg >= TARGET;

  return (
    <div className="space-y-3">
      <Card className="text-center space-y-3">
        <Swords className="mx-auto text-accent" />
        <p className="font-semibold">Multiplayer live race</p>
        <p className="text-sm text-muted">Train side-by-side in real time — first to {TARGET.toLocaleString()} kg wins. Scoreboard updates live.</p>
        <Button className="w-full justify-center" onClick={() => (live ? stop() : start())}>
          {live ? 'Leave race' : 'Start a race vs Marcus'}
        </Button>
        <p className="text-[11px] text-muted/70 flex items-center justify-center gap-1"><Wifi size={12} /> Realtime via Supabase presence + broadcast (auto-live with keys).</p>
      </Card>
      {live && (
        <Card>
          <SectionTitle action={won ? <Badge color="rgb(var(--success))">🏁 {leader.name} wins</Badge> : undefined}>Live scoreboard</SectionTitle>
          {scores.map((s) => (
            <div key={s.userId} className="py-1.5">
              <div className="flex justify-between text-sm">
                <span className={s.userId === meId ? 'text-accent font-semibold' : ''}>{s.name}</span>
                <span className="font-mono">{Math.round(s.volumeKg).toLocaleString()} kg</span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, (s.volumeKg / TARGET) * 100)}%` }} /></div>
            </div>
          ))}
          {!won && <Button variant="ghost" className="w-full justify-center mt-2" onClick={logRep}>Log a set (+200 kg)</Button>}
          <p className="text-[11px] text-muted/70 mt-2">Local co-op link also available — share a session code to train in the same room.</p>
        </Card>
      )}
    </div>
  );
}

function Marketplace() {
  const owned = useSocial((s) => s.ownedRoutineIds);
  const buy = useSocial((s) => s.buyRoutine);
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);

  function purchase(id: string, price: number) {
    if (owned.includes(id)) return;
    if (spend(price)) {
      buy(id);
      haptic('success');
    } else {
      haptic('warning');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle>Routine marketplace</SectionTitle>
        <Badge color="rgb(var(--accent-2))">🪙 {coins}</Badge>
      </div>
      {MOCK_MARKETPLACE.map((r) => {
        const isOwned = owned.includes(r.id);
        return (
          <Card key={r.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{r.title}</p>
              <Badge>{r.focus}</Badge>
            </div>
            <p className="text-xs text-muted">by {r.author} ({r.authorRank}) · {r.weeks}wk · {r.daysPerWeek}d/wk · ⭐ {r.rating}</p>
            <Button variant={isOwned ? 'ghost' : 'primary'} className="w-full justify-center" disabled={isOwned} onClick={() => purchase(r.id, r.priceCoins)}>
              {isOwned ? 'Owned ✓' : `Buy · 🪙 ${r.priceCoins}`}
            </Button>
          </Card>
        );
      })}
      <p className="text-[11px] text-muted/70 flex items-center gap-1"><Store size={12} /> High-rank athletes publish programs; toggle the marketplace off in Settings.</p>
    </div>
  );
}

function Avatar({ seed }: { seed: string }) {
  return <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-accent">{seed}</div>;
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
