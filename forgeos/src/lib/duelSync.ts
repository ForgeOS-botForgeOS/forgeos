import type { Duel, DuelMetric, Friend, Workout } from '../types';
import { isBackendLive, supabase } from './supabase';
import { useSocial } from '../state/socialStore';
import { useGami } from '../state/gamificationStore';
import { celebrate, toast } from './toast';
import {
  DUEL_WIN_COINS,
  DUEL_WIN_XP,
  applyMyGain,
  duelGainFromWorkout,
  isLiveDuel,
  mergeTheirProgress,
  settleAtDeadline,
} from './duels';

// Glue between the pure duel rules (duels.ts) and the outside world: the
// workout screen reports finished workouts here, and live duels sync through
// the Supabase `duels` table (one row per duel, one progress column per side).
// Everything degrades gracefully — no backend, no table, or a mock friend all
// fall back to the local simulated-opponent duel.

interface DuelRow {
  id: string;
  metric: DuelMetric;
  target: number;
  challenger: string;
  opponent: string;
  challenger_progress: number;
  opponent_progress: number;
  ends_at: string;
  created_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function payoutIfJustSettled(previousStatus: Duel['status'], d: Duel): void {
  if (previousStatus !== 'active' || d.status === 'active') return;
  if (d.status === 'won') {
    useGami.getState().addXp(DUEL_WIN_XP);
    useGami.getState().addCoins(DUEL_WIN_COINS);
    celebrate();
    toast(`Challenge won vs ${d.opponentName}! +${DUEL_WIN_XP} XP · 🪙${DUEL_WIN_COINS} 🏆`);
  } else {
    toast(`Challenge vs ${d.opponentName} lost — get them next time.`, 'info');
  }
}

/** Called from Train's finish(): every active duel advances by what you really did. */
export function reportDuelWorkout(workout: Workout): void {
  const duels = useSocial.getState().duels;
  if (duels.length === 0) return;
  const next = duels.map((d) => {
    const gained = duelGainFromWorkout(d.metric, workout);
    const after = applyMyGain(d, gained, !isLiveDuel(d));
    payoutIfJustSettled(d.status, after);
    return after;
  });
  useSocial.setState({ duels: next });
  void pushMyDuelProgress();
}

async function pushMyDuelProgress(): Promise<void> {
  if (!isBackendLive || !supabase) return;
  for (const d of useSocial.getState().duels) {
    if (!isLiveDuel(d)) continue;
    const column = d.side === 'challenger' ? 'challenger_progress' : 'opponent_progress';
    await supabase
      .from('duels')
      .update({ [column]: d.myProgress, updated_at: new Date().toISOString() })
      .eq('id', d.id);
  }
}

/**
 * Start a duel. Real cloud friend + live backend → a synced row both phones
 * poll; otherwise the classic local duel with a simulated opponent.
 */
export async function challengeFriend(friend: Friend, metric: DuelMetric, target: number, days: number): Promise<void> {
  const endsAt = new Date(Date.now() + days * 86_400_000).toISOString();
  if (isBackendLive && supabase && UUID_RE.test(friend.id)) {
    const me = (await supabase.auth.getUser()).data.user?.id;
    if (me) {
      const id = crypto.randomUUID();
      const { error } = await supabase.from('duels').insert({
        id,
        metric,
        target,
        challenger: me,
        opponent: friend.id,
        ends_at: endsAt,
      });
      if (!error) {
        useSocial.getState().upsertDuel({
          id,
          opponentName: friend.name,
          opponentAvatar: friend.avatarSeed,
          metric,
          target,
          myProgress: 0,
          theirProgress: 0,
          createdAt: new Date().toISOString(),
          endsAt,
          status: 'active',
          opponentId: friend.id,
          side: 'challenger',
        });
        return;
      }
      // Table missing or RLS said no — fall through to the local duel.
    }
  }
  useSocial.getState().startDuel(friend.name, friend.avatarSeed, metric, target, days);
}

async function opponentDisplay(id: string): Promise<{ name: string; avatar: string }> {
  const fallback = { name: 'A rival', avatar: '⚔️' };
  if (!supabase) return fallback;
  // Masked friend-facing view first, raw table as fallback (same pattern as
  // fetchFriendsRemote in repositories.ts).
  let row = (await supabase.from('friend_profiles').select('id, name').eq('id', id).maybeSingle()).data;
  if (!row) row = (await supabase.from('profiles').select('id, name').eq('id', id).maybeSingle()).data;
  const name = (row as { name?: string } | null)?.name;
  if (!name) return fallback;
  return { name, avatar: name.slice(0, 2).toUpperCase() };
}

/**
 * Pull live duel rows: discover incoming challenges, fold in opponents' real
 * progress, settle deadlines, and pay out any duel that just resolved. Also
 * settles purely local duels, so it's safe (and useful) to call in mock mode.
 */
export async function syncDuels(): Promise<void> {
  const local = useSocial.getState().duels;
  const previousStatus = new Map(local.map((d) => [d.id, d.status]));
  let merged: Duel[] = [...local];

  if (isBackendLive && supabase) {
    const me = (await supabase.auth.getUser()).data.user?.id;
    if (me) {
      const { data } = await supabase
        .from('duels')
        .select('*')
        .or(`challenger.eq.${me},opponent.eq.${me}`);
      for (const raw of (data ?? []) as DuelRow[]) {
        const side: Duel['side'] = raw.challenger === me ? 'challenger' : 'opponent';
        const myTotal = Number(side === 'challenger' ? raw.challenger_progress : raw.opponent_progress);
        const theirTotal = Number(side === 'challenger' ? raw.opponent_progress : raw.challenger_progress);
        const existing = merged.find((d) => d.id === raw.id);
        if (existing) {
          merged = merged.map((d) => (d.id === raw.id ? mergeTheirProgress(d, theirTotal) : d));
        } else {
          // A challenge from a friend we haven't seen yet — mirror it locally.
          const opp = await opponentDisplay(side === 'challenger' ? raw.opponent : raw.challenger);
          merged = [
            {
              id: raw.id,
              opponentName: opp.name,
              opponentAvatar: opp.avatar,
              metric: raw.metric,
              target: Number(raw.target),
              myProgress: myTotal,
              theirProgress: theirTotal,
              createdAt: raw.created_at,
              endsAt: raw.ends_at,
              status: 'active',
              opponentId: side === 'challenger' ? raw.opponent : raw.challenger,
              side,
            },
            ...merged,
          ];
          toast(`⚔️ ${opp.name} challenged you — first to ${raw.target}!`, 'info');
        }
      }
    }
  }

  const settled = merged.map((d) => settleAtDeadline(d, Date.now()));
  for (const d of settled) payoutIfJustSettled(previousStatus.get(d.id) ?? 'active', d);
  useSocial.setState({ duels: settled });
}
