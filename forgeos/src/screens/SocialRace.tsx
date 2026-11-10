import { useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import {
  Swords, Wifi, Circle, Check, X,
  
  
} from 'lucide-react';
import { joinRace, isBackendLive } from '../lib/supabase';
import { RaceHub } from '../components/race/RaceHub';

import { Card, Button, Pill, Badge, SectionTitle, Sheet } from '../components/ui';

import { useSocial } from '../state/socialStore';

import { useUser } from '../state/userStore';

import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';

import { answerDuel, challengeFriend, syncDuels } from '../lib/duelSync';
import { incomingDuels, isAwaitingMyAnswer } from '../lib/duels';
import { useT } from '../lib/i18n';
import type { Duel, DuelMetric, Friend } from '../types';
import { Avatar } from './SocialShared';
import { daysLeft, type TFn } from '../lib/socialTime';

// The Live race tab: races and duels. Split out of Social.tsx, which had grown past 1,200 lines.
/* ------------------------------- RACE -------------------------------- */

export function Race() {
  return (
    <div className="space-y-3">
      {/* Real realtime races when the backend is live; offline demo otherwise. */}
      {isBackendLive ? <RaceHub /> : <LiveRace />}
      <Duels />
    </div>
  );
}

function LiveRace() {
  const t = useT();
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
          <p className="font-semibold">{t('Live race')}</p>
          <p className="text-sm text-muted">{t('Train side-by-side in real time: first to')} {TARGET.toLocaleString()} {t('kg wins.')}</p>
        </div>
        <p className="text-[11px] uppercase tracking-wide text-muted">{t('Challenge a friend')}</p>
        {online.length === 0 && <p className="text-sm text-muted">{t('Add friends first to race them.')}</p>}
        <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
          {online.map((f) => (
            <button key={f.id} onClick={() => start(f)} className="w-full flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-left">
              <Avatar seed={f.avatarSeed} />
              <div className="flex-1"><p className="text-sm font-semibold flex items-center gap-1">{f.name} {f.trainingNow && <Circle size={7} className="fill-success text-success" />}</p><p className="text-[11px] text-muted">{f.rank} · {f.xp.toLocaleString()} XP</p></div>
              <Badge color="rgb(var(--accent))">{t('Race')}</Badge>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted/70 flex items-center justify-center gap-1"><Wifi size={12} /> {t('Realtime via Supabase presence + broadcast (auto-live with keys).')}</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle action={won ? <Badge color="rgb(var(--success))">🏁 {leader.name} {t('wins')}</Badge> : <button onClick={stop} className="text-xs text-muted">{t('Leave')}</button>}>
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
        ? <Button variant="ghost" className="w-full justify-center mt-2" onClick={logRep}>{t('Log a set (+200 kg)')}</Button>
        : <Button className="w-full justify-center mt-2" onClick={stop}>{t('Finish race')}</Button>}
    </Card>
  );
}

const duelMetricLabel = (t: TFn, metric: DuelMetric): string => t(`duel.metric.${metric}`);

function rivalryLabel(t: TFn, record: { wins: number; losses: number } | undefined, rival: string): string | null {
  if (!record || record.wins + record.losses === 0) return null;
  if (record.wins > record.losses) return t('duel.youLead', { w: record.wins, l: record.losses });
  if (record.losses > record.wins) return t('duel.rivalLeads', { rival, w: record.wins, l: record.losses });
  return t('duel.tied', { w: record.wins, l: record.losses });
}

function Duels() {
  const t = useT();
  const duels = useSocial((s) => s.duels);
  const friends = useSocial((s) => s.friends);
  const clearDuel = useSocial((s) => s.clearDuel);
  const rivalry = useSocial((s) => s.rivalry);
  const [open, setOpen] = useState(false);

  // Challenges awaiting my answer are pulled out of the list entirely: they are
  // a decision, not a scoreboard, and they belong at the top.
  const incoming = useMemo(() => incomingDuels(duels), [duels]);
  const rest = useMemo(() => duels.filter((d) => !isAwaitingMyAnswer(d)), [duels]);

  function rematch(d: Duel) {
    const friend = friends.find((f) => f.id === d.opponentId) ?? {
      // Local/simulated rival — a pseudo-friend routes challengeFriend to the local path.
      id: d.opponentId ?? 'local', name: d.opponentName, avatarSeed: d.opponentAvatar, rank: '', xp: 0, online: false,
    };
    const days = Math.max(1, Math.round((new Date(d.endsAt).getTime() - new Date(d.createdAt).getTime()) / 86_400_000));
    void challengeFriend(friend, d.metric, d.target, days);
    clearDuel(d.id);
    haptic('success');
    toast(t('duel.rematchOn', { name: d.opponentName }), 'success');
  }

  // Discover incoming challenges + fold in opponents' synced progress whenever
  // the tab opens. Progress itself comes from finished workouts (duelSync.ts).
  useEffect(() => {
    void syncDuels();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>{t('duel.weeklyChallenges')}</SectionTitle>
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => setOpen(true)} disabled={friends.length === 0}><span className="text-xs flex items-center gap-1"><Swords size={14} /> {t('duel.new')}</span></Button>
      </div>
      {duels.length === 0 && <p className="text-sm text-muted">{t('duel.none')}</p>}

      {/* Challenges waiting on you, above everything else. A duel used to start
          the instant somebody sent it — you could be losing a contest, against
          a target they chose, without ever having said yes. */}
      {incoming.length > 0 && (
        <Card className="space-y-3 border-accent/50 bg-accent/5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Swords size={13} aria-hidden="true" /> {t('duel.incoming')}
          </p>
          {incoming.map((d) => (
            <div key={d.id} className="space-y-2">
              <div>
                <p className="text-sm font-semibold">{t('duel.incomingOne', { name: d.opponentName })}</p>
                <p className="text-[11px] text-muted">
                  {t('duel.firstTo', { target: d.target.toLocaleString(), metric: duelMetricLabel(t, d.metric) })}
                  {' · '}{daysLeft(t, d.endsAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 justify-center" onClick={() => { haptic('success'); void answerDuel(d.id, 'accept'); }}>
                  <span className="flex items-center gap-1.5 text-sm"><Check size={15} /> {t('duel.accept')}</span>
                </Button>
                <Button variant="ghost" className="flex-1 justify-center" onClick={() => { haptic('warning'); void answerDuel(d.id, 'decline'); }}>
                  <span className="flex items-center gap-1.5 text-sm"><X size={15} /> {t('duel.decline')}</span>
                </Button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted">{t('duel.startsOnAccept')}</p>
        </Card>
      )}

      {rest.map((d) => {
        const ended = d.status !== 'active' && d.status !== 'pending';
        const waiting = d.status === 'pending';
        const rivalry_ = rivalryLabel(t, rivalry[d.opponentName], d.opponentName);
        return (
          <Card key={d.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2"><Swords size={14} className="text-accent" /> {t('duel.vs', { name: d.opponentName })}</p>
              <span className="flex items-center gap-1.5">
                {d.side != null && <Badge color="rgb(var(--accent))">{t('duel.live')}</Badge>}
                {d.status === 'won' && (
                  <motion.span initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                    <Badge color="rgb(var(--success))">{t('duel.won')}</Badge>
                  </motion.span>
                )}
                {d.status === 'lost' && <Badge color="rgb(var(--danger))">{t('duel.lost')}</Badge>}
                {d.status === 'declined' && <Badge color="rgb(var(--muted))">{t('duel.declined')}</Badge>}
                {d.status === 'expired' && <Badge color="rgb(var(--muted))">{t('duel.expired')}</Badge>}
                {waiting && <Badge color="rgb(var(--warn))">{t('duel.pending')}</Badge>}
                {d.status === 'active' && <Badge>{daysLeft(t, d.endsAt)}</Badge>}
              </span>
            </div>
            <p className="text-[11px] text-muted">
              {t('duel.firstTo', { target: d.target.toLocaleString(), metric: duelMetricLabel(t, d.metric) })}
              {rivalry_ && <> · {rivalry_}</>}
            </p>
            {/* No bars on an unanswered challenge — there is nothing to show,
                and two empty bars read as "you are losing 0-0". */}
            {!waiting && (
              <>
                <DuelBar label={t('duel.you')} value={d.myProgress} target={d.target} me />
                <DuelBar label={d.opponentName} value={d.theirProgress} target={d.target} />
              </>
            )}
            {waiting
              ? (
                <div className="flex items-center justify-between gap-2 py-1">
                  <p className="text-[11px] text-muted">{t('duel.sentWaiting', { name: d.opponentName })}</p>
                  <Button variant="ghost" className="shrink-0 px-3 py-1.5 text-xs" onClick={() => clearDuel(d.id)}>{t('duel.clear')}</Button>
                </div>
              )
              : ended
                ? (
                  <div className="flex gap-2">
                    <Button className="flex-1 justify-center" onClick={() => rematch(d)}>{t('duel.rematch')}</Button>
                    <Button variant="ghost" className="flex-1 justify-center" onClick={() => clearDuel(d.id)}>{t('duel.clear')}</Button>
                  </div>
                )
                : <p className="text-[11px] text-muted text-center py-1">{t('duel.autoProgress')}</p>}
          </Card>
        );
      })}
      <NewDuelSheet open={open} onClose={() => setOpen(false)} friends={friends} onStart={(f, m, target, days) => { void challengeFriend(f, m, target, days); setOpen(false); haptic('success'); }} />
    </div>
  );
}

function DuelBar({ label, value, target, me }: { label: string; value: number; target: number; me?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-[11px]"><span className={me ? 'text-accent font-semibold' : 'text-muted'}>{label}</span><span className="font-mono text-muted">{value.toLocaleString()}/{target.toLocaleString()}</span></div>
      <div className="h-1.5 mt-0.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${me ? 'bg-accent' : 'bg-accent-2'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / target) * 100)}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

function NewDuelSheet({ open, onClose, friends, onStart }: { open: boolean; onClose: () => void; friends: Friend[]; onStart: (f: Friend, m: DuelMetric, target: number, days: number) => void }) {
  const t = useT();
  const [fid, setFid] = useState<string>('');
  const [metric, setMetric] = useState<DuelMetric>('volume');
  const [days, setDays] = useState(7);
  const friend = friends.find((f) => f.id === fid) ?? friends[0];
  const targets: Record<DuelMetric, number> = { volume: 20000, sets: 60, sessions: 4 };
  return (
    <Sheet open={open} onClose={onClose} title={t('duel.newTitle')}>
      <div className="space-y-3">
        <p className="text-[11px] text-muted">{t('duel.newIntro', { days })}</p>
        <p className="text-xs font-medium">{t('duel.opponent')}</p>
        <div className="flex gap-2 flex-wrap">
          {friends.map((f) => <Pill key={f.id} active={(fid || friends[0]?.id) === f.id} onClick={() => setFid(f.id)}>{f.name}</Pill>)}
        </div>
        <p className="text-xs font-medium">{t('duel.metricLabel')}</p>
        <div className="flex gap-2">
          {(['volume', 'sets', 'sessions'] as DuelMetric[]).map((m) => <Pill key={m} active={metric === m} onClick={() => setMetric(m)}>{t(`duel.metricName.${m}`)}</Pill>)}
        </div>
        <p className="text-xs font-medium">{t('duel.duration', { days })}</p>
        <input type="range" min={3} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
        <Button className="w-full justify-center" disabled={!friend} onClick={() => friend && onStart(friend, metric, targets[metric], days)}>
          {t('duel.startBtn', { target: targets[metric].toLocaleString(), metric: duelMetricLabel(t, metric), days })}
        </Button>
      </div>
    </Sheet>
  );
}
