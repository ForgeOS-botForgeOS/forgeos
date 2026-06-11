import type { BodyStat, PR } from '../../types';
import type { CanonicalDay, CanonicalProgress, TrustLevel } from './canonical';
import type { StreakDecision } from './streak';
import { EXERCISES } from '../../data/exercises';
import { e1rm as estE1rm } from '../fitness';

// The concrete set of changes we intend to apply to ForgeOS's stores. Values are
// CANDIDATES — the merge step keeps the better of (current, candidate), so an
// import can only ever help.
export interface ForgePatch {
  source: string;
  trust: TrustLevel;
  xp: number;
  coins: number;
  welcomeCoins: number; // small migration reward, always added
  streakDays: number;
  bestStreak: number;
  heavyLifts: number;
  graceFreeze: boolean; // set lastSessionDate = today so migration day can't break the streak
  weeklyGoal?: number;
  memberSince?: string;
  prs: PR[];
  importedDays: CanonicalDay[];
  bodyStats: BodyStat[];
  achievementsImported: number;
  notes: string[]; // things that couldn't be transferred — be honest
}

const MAX_HISTORY = 365; // batch/cap very large imports
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function matchExercise(name: string): { id: string; name: string } {
  const n = name.toLowerCase();
  const hit = EXERCISES.find((e) => n.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(n));
  return hit ? { id: hit.id, name: hit.name } : { id: `imp-${slug(name)}`, name };
}

export function mapToForge(c: CanonicalProgress, streak: StreakDecision): ForgePatch {
  const notes: string[] = [];

  const prs: PR[] = (c.personalBests ?? []).map((p) => {
    const ex = matchExercise(p.name);
    const weightKg = p.weightKg ?? 0;
    const reps = p.reps ?? 1;
    const e1 = p.e1rm ?? (weightKg ? estE1rm(weightKg, reps) : 0);
    return { id: `imp:pb:${slug(p.name)}`, exerciseId: ex.id, exerciseName: ex.name, weightKg, reps, e1rm: Math.round(e1), date: p.date ?? c.memberSince ?? new Date().toISOString() };
  }).filter((p) => p.e1rm > 0 || p.weightKg > 0);

  const bodyStats: BodyStat[] = (c.bodyStats ?? []).map((b) => ({
    date: b.date, weightKg: b.weightKg, bodyFatPct: b.bodyFatPct, waistCm: b.waistCm, chestCm: b.chestCm, armCm: b.armCm, thighCm: b.thighCm, hipCm: b.hipCm,
  }));

  // Things ForgeOS can't faithfully represent — surfaced to the user.
  if (c.level?.rank) notes.push(`Source rank "${c.level.rank}" — ForgeOS ranks come from XP, so your imported XP sets your rank instead.`);
  if (c.currency?.coins && c.trust === 'low') notes.push('Currency from a screenshot is capped — connect via file/API to bring over more.');
  if (c.totals?.timeMinutes) notes.push(`${Math.round(c.totals.timeMinutes / 60)}h of logged time noted, but ForgeOS tracks sessions & volume rather than total minutes.`);

  return {
    source: c.source,
    trust: c.trust,
    xp: Math.round(c.totals?.xp ?? 0),
    coins: Math.round(c.currency?.coins ?? 0),
    welcomeCoins: 50,
    streakDays: streak.keptCurrent,
    bestStreak: streak.recordLongest,
    heavyLifts: Math.round(c.totals?.heavyLifts ?? 0),
    graceFreeze: streak.graceFreeze,
    weeklyGoal: c.settings?.weeklyGoal ? Math.max(1, Math.min(7, Math.round(c.settings.weeklyGoal))) : undefined,
    memberSince: c.memberSince,
    prs,
    importedDays: (c.history ?? []).slice(-MAX_HISTORY),
    bodyStats,
    achievementsImported: c.achievements?.length ?? 0,
    notes,
  };
}
