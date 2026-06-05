import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Flame, Coins, Dice5, Crown, Music } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Card, Button, Pill, Badge, SectionTitle, Ring, Sheet } from '../components/ui';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import { useUser } from '../state/userStore';
import { useWorkout } from '../state/workoutStore';
import { QUESTS } from '../data/quests';
import { RANKS, rankForXp, rankLabel, progressToNext } from '../data/ranks';
import { buildLeaderboard } from '../lib/mockData';
import { useSocial } from '../state/socialStore';
import { MOCK_TRACKS } from '../lib/spotify';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { CountUp } from '../components/CountUp';
import { useT } from '../lib/i18n';

type Tab = 'rank' | 'quests' | 'board' | 'prs';

export default function Quests() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('rank');
  return (
    <Screen title={t('q.title')} subtitle={t('q.subtitle')}>
      <div data-noswipe className="flex gap-2 overflow-x-auto no-scrollbar">
        <Pill active={tab === 'rank'} onClick={() => setTab('rank')}>Rank</Pill>
        <Pill active={tab === 'quests'} onClick={() => setTab('quests')}>Quests</Pill>
        <Pill active={tab === 'board'} onClick={() => setTab('board')}>Leaderboard</Pill>
        <Pill active={tab === 'prs'} onClick={() => setTab('prs')}>PR Hall</Pill>
      </div>
      {tab === 'rank' && <RankPanel />}
      {tab === 'quests' && <QuestBoard />}
      {tab === 'board' && <Leaderboard />}
      {tab === 'prs' && <PrHall />}
    </Screen>
  );
}

function RankPanel() {
  const xp = useGami((s) => s.xp);
  const coins = useGami((s) => s.coins);
  const streak = useGami((s) => s.streakDays);
  const convert = useGami((s) => s.convertXpToCoins);
  const buyFreeze = useGami((s) => s.buyStreakFreeze);
  const wager = useGami((s) => s.wager);
  const startWager = useGami((s) => s.startWager);
  const rate = useSettings((s) => s.xpToCoinRate);
  const gambling = useSettings((s) => s.streakGambling);
  const { tier, next } = rankForXp(xp);
  const [convertOpen, setConvertOpen] = useState(false);
  const [wagerOpen, setWagerOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-4">
        <Ring value={progressToNext(xp)} max={1} color={tier.color}>
          <span className="text-lg font-bold">{tier.sub}</span>
          <span className="text-[9px] text-muted">tier</span>
        </Ring>
        <div className="flex-1">
          <p className="text-xl font-extrabold" style={{ color: tier.color }}>{rankLabel(tier)}</p>
          <CountUp value={xp} className="text-sm text-muted block" format={(n) => `${n.toLocaleString()} XP`} />
          {next && <p className="text-[11px] text-muted/70">{(next.minXp - xp).toLocaleString()} XP to {rankLabel(next)}</p>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3">
          <Flame className="text-accent" />
          <div><CountUp value={streak} className="font-mono font-bold text-lg block" /><p className="text-[11px] text-muted">day streak</p></div>
        </Card>
        <Card className="flex items-center gap-3">
          <Coins className="text-accent-2" />
          <div><CountUp value={coins} className="font-mono font-bold text-lg block" /><p className="text-[11px] text-muted">Forge Coins</p></div>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => setConvertOpen(true)}>Convert XP → 🪙</Button>
        <Button variant="ghost" className="flex-1 justify-center" onClick={() => { if (buyFreeze()) { haptic('success'); toast('Streak freeze bought 🧊'); } else { haptic('warning'); toast('Not enough coins for a freeze.', 'error'); } }}>Streak freeze · 🪙20</Button>
      </div>

      {gambling && (
        <Card className="space-y-2 border-warn/40">
          <p className="font-semibold flex items-center gap-2"><Dice5 size={16} className="text-warn" /> Streak gambling</p>
          {wager?.active ? (
            <p className="text-sm text-muted">Active wager: hit {wager.targetSessions} sessions · staked 🪙{wager.staked} · {wager.progress}/{wager.targetSessions} done.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Wager coins you’ll hit a session target. Win doubles your stake; miss and it’s gone.</p>
              <Button variant="outline" className="w-full justify-center" onClick={() => setWagerOpen(true)}>Place a wager</Button>
            </>
          )}
        </Card>
      )}

      {/* Rank ladder */}
      <div>
        <SectionTitle>Rank ladder</SectionTitle>
        <Card className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
          {RANKS.map((r, i) => {
            const reached = xp >= r.minXp;
            const isCurrent = r.name === tier.name && r.sub === tier.sub;
            return (
              <div key={i} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${isCurrent ? 'bg-accent/15' : ''}`}>
                <span className="text-sm" style={{ color: reached ? r.color : 'rgb(var(--muted))' }}>{rankLabel(r)}</span>
                <span className="font-mono text-xs text-muted">{r.minXp.toLocaleString()} XP {reached ? '✓' : ''}</span>
              </div>
            );
          })}
        </Card>
      </div>

      <ConvertSheet open={convertOpen} onClose={() => setConvertOpen(false)} xp={xp} rate={rate} convert={convert} />
      <WagerSheet open={wagerOpen} onClose={() => setWagerOpen(false)} coins={coins} start={startWager} />
    </div>
  );
}

function ConvertSheet({ open, onClose, xp, rate, convert }: { open: boolean; onClose: () => void; xp: number; rate: number; convert: (c: number, r: number) => boolean }) {
  const [coins, setCoins] = useState(1);
  const cost = coins * rate;
  return (
    <Sheet open={open} onClose={onClose} title="Convert XP to Forge Coins">
      <div className="space-y-3">
        <p className="text-sm text-muted">Rate: {rate} XP per coin. You have {xp.toLocaleString()} XP.</p>
        <input type="range" min={1} max={Math.max(1, Math.floor(xp / rate))} value={coins} onChange={(e) => setCoins(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
        <p className="text-center font-mono">{coins} 🪙 = {cost.toLocaleString()} XP</p>
        <Button className="w-full justify-center" disabled={cost > xp} onClick={() => { if (convert(coins, rate)) { celebrate(); toast(`Converted to 🪙${coins}`); onClose(); } }}>Convert</Button>
      </div>
    </Sheet>
  );
}

function WagerSheet({ open, onClose, coins, start }: { open: boolean; onClose: () => void; coins: number; start: (t: number, s: number, d: number) => boolean }) {
  const [target, setTarget] = useState(3);
  const [stake, setStake] = useState(10);
  return (
    <Sheet open={open} onClose={onClose} title="Place a streak wager">
      <div className="space-y-3">
        <p className="text-sm">Hit <b>{target}</b> sessions in <b>7 days</b>, staking <b>🪙{stake}</b>. Win → 🪙{stake * 2}.</p>
        <label className="text-xs text-muted">Target sessions: {target}<input type="range" min={2} max={6} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" /></label>
        <label className="text-xs text-muted">Stake: 🪙{stake}<input type="range" min={5} max={Math.max(5, coins)} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" /></label>
        <Button className="w-full justify-center" disabled={stake > coins} onClick={() => { if (start(target, stake, 7)) { haptic('success'); onClose(); } }}>Lock in wager</Button>
      </div>
    </Sheet>
  );
}

function QuestBoard() {
  const quests = useGami((s) => s.quests);
  const claim = useGami((s) => s.claimQuest);
  const claimAll = useGami((s) => s.claimAllQuests);
  const [scope, setScope] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const visible = quests
    .map((uq) => ({ uq, def: QUESTS.find((q) => q.id === uq.questId)! }))
    .filter((x) => x.def && x.def.scope === scope);

  // Every completed-but-unclaimed quest across all scopes, with total rewards.
  const claimable = quests
    .map((uq) => ({ uq, def: QUESTS.find((q) => q.id === uq.questId) }))
    .filter((x) => x.def && x.uq.completed && !x.uq.claimed);
  const totalXp = claimable.reduce((a, x) => a + (x.def?.xp ?? 0), 0);
  const totalCoins = claimable.reduce((a, x) => a + (x.def?.coins ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((s) => (
          <Pill key={s} active={scope === s} onClick={() => setScope(s)}>{s}</Pill>
        ))}
      </div>

      {claimable.length > 0 && (
        <Button className="w-full justify-center gap-2" onClick={() => { const r = claimAll(); if (r.count) { celebrate(); toast(`Claimed ${r.count} · +${r.xp.toLocaleString()} XP · 🪙${r.coins}`); } }}>
          <Trophy size={16} /> Claim all {claimable.length} · +{totalXp.toLocaleString()} XP · 🪙{totalCoins}
        </Button>
      )}
      {visible.length === 0 && <p className="text-sm text-muted">No {scope} quests assigned.</p>}
      {visible.map(({ uq, def }) => {
        const pct = Math.min(100, (uq.progress / def.target) * 100);
        return (
          <Card key={def.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{def.title}</p>
              <Badge color="rgb(var(--accent-2))">+{def.xp} XP · 🪙{def.coins}</Badge>
            </div>
            <p className="text-xs text-muted">{def.description}</p>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} /></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted font-mono">{Math.round(uq.progress).toLocaleString()} / {def.target.toLocaleString()}</span>
              {uq.completed && !uq.claimed && <Button className="py-1.5" onClick={() => { claim(def.id); haptic('success'); toast(`+${def.xp} XP · 🪙${def.coins}`); }}>Claim</Button>}
              {uq.claimed && <Badge color="rgb(var(--success))">claimed</Badge>}
            </div>
          </Card>
        );
      })}
      <p className="text-[11px] text-muted/70">Daily quests auto-assign and reset each day. ~12–15 active across all scopes.</p>
    </div>
  );
}

function Leaderboard() {
  const isPublic = useSettings((s) => s.leaderboardPublic);
  const setSetting = useSettings((s) => s.set);
  const xp = useGami((s) => s.xp);
  const name = useUser((s) => s.profile?.name ?? 'You');
  const friends = useSocial((s) => s.friends);

  if (!isPublic) {
    return (
      <Card className="text-center space-y-3">
        <Crown className="mx-auto text-muted" />
        <p className="font-semibold">Leaderboard is private</p>
        <p className="text-sm text-muted">Your rank is hidden from others. Flip it on to compete.</p>
        <Button className="w-full justify-center" onClick={() => setSetting('leaderboardPublic', true)}>Join the leaderboard</Button>
      </Card>
    );
  }

  const rows = buildLeaderboard(name, xp, friends);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button className="text-xs text-muted underline" onClick={() => setSetting('leaderboardPublic', false)}>Make private</button>
      </div>
      {rows.map((r) => (
        <Card key={r.rank} className={`flex items-center gap-3 ${r.you ? 'border-accent' : ''}`}>
          <span className="font-mono font-bold w-6 text-center text-muted">{r.rank}</span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${r.you ? 'text-accent' : ''}`}>{r.name}</p>
            <p className="text-[11px] text-muted">{r.rankTier}</p>
          </div>
          <span className="font-mono text-sm">{r.xp.toLocaleString()}</span>
        </Card>
      ))}
    </div>
  );
}

function PrHall() {
  const prs = useWorkout((s) => s.prs);
  const navigate = useNavigate();
  const [attach, setAttach] = useState<string | null>(null);
  // PRs hold an optional attached track; allow attaching one of the mock tracks.
  const setPrs = useWorkout.setState;
  const allPrs = useWorkout((s) => s.prs);

  function attachTrack(prId: string, trackId: string) {
    const track = MOCK_TRACKS.find((t) => t.id === trackId) ?? null;
    setPrs({ prs: allPrs.map((p) => (p.id === prId ? { ...p, spotifyTrack: track } : p)) });
    setAttach(null);
    haptic('success');
  }

  if (prs.length === 0) {
    return (
      <Card className="text-center space-y-2">
        <Trophy className="mx-auto text-muted" />
        <p className="font-semibold">No PRs yet</p>
        <p className="text-sm text-muted">Finish a workout — your heaviest sets land here automatically.</p>
        <Button variant="outline" className="w-full justify-center" onClick={() => navigate('/train')}>Go train</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {[...prs].sort((a, b) => b.e1rm - a.e1rm).map((pr) => (
        <Card key={pr.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm flex items-center gap-2"><Trophy size={14} className="text-accent-2" /> {pr.exerciseName}</p>
            <span className="font-mono text-sm">{pr.weightKg}kg × {pr.reps}</span>
          </div>
          <p className="text-[11px] text-muted">e1RM {pr.e1rm}kg · {new Date(pr.date).toLocaleDateString()}</p>
          {pr.spotifyTrack ? (
            <p className="text-[11px] text-accent-2 flex items-center gap-1"><Music size={11} /> {pr.spotifyTrack.title} — {pr.spotifyTrack.artist}</p>
          ) : (
            <button className="text-[11px] text-accent-2 flex items-center gap-1" onClick={() => setAttach(pr.id)}><Music size={11} /> Attach the song playing</button>
          )}
        </Card>
      ))}
      <Sheet open={!!attach} onClose={() => setAttach(null)} title="Attach a song to this PR">
        <div className="space-y-1.5">
          {MOCK_TRACKS.map((t) => (
            <button key={t.id} onClick={() => attach && attachTrack(attach, t.id)} className="w-full text-left rounded-xl bg-surface-2 px-4 py-2.5 text-sm flex items-center gap-2">
              <span>{t.albumArt}</span> {t.title} — <span className="text-muted">{t.artist}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
