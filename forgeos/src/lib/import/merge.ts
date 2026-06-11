import type { BodyStat, WeighIn, Workout } from '../../types';
import { useGami } from '../../state/gamificationStore';
import { useWorkout } from '../../state/workoutStore';
import { useUser } from '../../state/userStore';
import { useSettings } from '../../state/settingsStore';
import { useImports, type ForgeSnapshot, type ImportRecord, type ImportSummary } from '../../state/importStore';
import type { LaneId } from './canonical';
import type { ForgePatch } from './mapToForge';
import { mergePrs, unionByDate } from './mergeRules';

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

function captureSnapshot(): ForgeSnapshot {
  const g = useGami.getState();
  const w = useWorkout.getState();
  const u = useUser.getState();
  return {
    gami: { xp: g.xp, coins: g.coins, streakDays: g.streakDays, bestStreak: g.bestStreak, weekStreak: g.weekStreak, heavyLifts: g.heavyLifts, lastSessionDate: g.lastSessionDate },
    history: structuredClone(w.history),
    prs: structuredClone(w.prs),
    joinedAt: u.profile?.joinedAt,
    weighIns: structuredClone(u.weighIns),
    bodyStats: structuredClone(u.bodyStats),
    weeklyGoal: useSettings.getState().weeklyGoal,
  };
}

function restoreSnapshot(s: ForgeSnapshot) {
  const g = useGami.getState();
  useGami.setState({ ...g, ...s.gami });
  useWorkout.setState({ ...useWorkout.getState(), history: structuredClone(s.history), prs: structuredClone(s.prs) });
  useUser.setState({ ...useUser.getState(), weighIns: structuredClone(s.weighIns), bodyStats: structuredClone(s.bodyStats), profile: useUser.getState().profile ? { ...useUser.getState().profile!, joinedAt: s.joinedAt } : null });
  useSettings.getState().set('weeklyGoal', s.weeklyGoal);
}

// Imported history days → ForgeOS workouts (drive heatmap / volume / session
// counts). Deterministic id makes re-importing idempotent (no duplicates).
function importedWorkouts(patch: ForgePatch): Workout[] {
  return patch.importedDays.map((d) => ({
    id: `imp:${patch.source}:${d.date}`,
    name: `Imported · ${patch.source}`,
    date: new Date(d.date).toISOString(),
    exercises: [],
    completed: true,
    totalVolumeKg: d.volumeKg ?? 0,
    synced: true,
    cardio: d.distanceKm || d.durationMin ? { machine: 'Imported', distanceKm: d.distanceKm ?? 0, durationMin: d.durationMin ?? 0 } : undefined,
  }));
}

const earlier = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : a || b);

/**
 * Apply a patch with the "never worse off" rule: every scalar takes max(current,
 * imported); records are unioned keeping the better value. Idempotent — re-running
 * the same import changes nothing. Returns a celebration summary.
 */
export function applyImport(patch: ForgePatch, lane: LaneId): ImportSummary {
  const snapshot = captureSnapshot();
  const firstFromSource = !useImports.getState().hasSource(patch.source);

  // ---- gamification (max everything) ----
  const g = useGami.getState();
  const newXp = Math.max(g.xp, patch.xp);
  const welcome = firstFromSource ? patch.welcomeCoins : 0;
  const newCoins = Math.max(g.coins, patch.coins) + welcome;
  const newStreak = Math.max(g.streakDays, patch.streakDays);
  const newBest = Math.max(g.bestStreak, patch.bestStreak, newStreak);
  const newHeavy = Math.max(g.heavyLifts, patch.heavyLifts);
  useGami.setState({
    xp: newXp, coins: newCoins, streakDays: newStreak, bestStreak: newBest, heavyLifts: newHeavy,
    lastSessionDate: patch.graceFreeze ? todayStr() : g.lastSessionDate,
  });

  // ---- workouts (union history by id, keep better PRs) ----
  const w = useWorkout.getState();
  const have = new Set(w.history.map((h) => h.id));
  const newDays = importedWorkouts(patch).filter((iw) => !have.has(iw.id));
  useWorkout.setState({ history: [...newDays, ...w.history].sort((a, b) => b.date.localeCompare(a.date)), prs: mergePrs(w.prs, patch.prs) });

  // ---- user (tenure + body history) ----
  const u = useUser.getState();
  const weighFromBody: WeighIn[] = patch.bodyStats.filter((b) => b.weightKg).map((b) => ({ date: b.date.slice(0, 10), weightKg: b.weightKg! }));
  const newJoined = earlier(u.profile?.joinedAt, patch.memberSince);
  useUser.setState({
    weighIns: unionByDate(u.weighIns, weighFromBody),
    bodyStats: unionByDate<BodyStat>(u.bodyStats, patch.bodyStats),
    profile: u.profile ? { ...u.profile, joinedAt: newJoined } : u.profile,
  });

  // ---- settings (fill-in) ----
  if (patch.weeklyGoal) useSettings.getState().set('weeklyGoal', patch.weeklyGoal);

  // ---- summary / celebration ----
  const tenure = newJoined ? `${Math.max(1, Math.floor((Date.now() - Date.parse(newJoined)) / 31536000000))}-year history` : `${newDays.length}-day history`;
  const parts: string[] = [];
  if (newStreak > snapshot.gami.streakDays) parts.push(`your ${newStreak}-day streak`);
  else if (patch.bestStreak) parts.push(`a ${patch.bestStreak}-day best-streak record`);
  if (newXp - snapshot.gami.xp > 0) parts.push(`${(newXp - snapshot.gami.xp).toLocaleString()} XP`);
  if (patch.achievementsImported) parts.push(`${patch.achievementsImported} badges`);
  if (newDays.length) parts.push(tenure);
  const message = parts.length ? `We brought over ${parts.join(', ').replace(/, ([^,]*)$/, ', and $1')}.` : 'Your account is now linked — nothing new to add.';

  const summary: ImportSummary = {
    source: patch.source,
    streakDays: newStreak,
    bestStreak: newBest,
    xpAdded: newXp - snapshot.gami.xp,
    coinsAdded: newCoins - snapshot.gami.coins,
    heavyLifts: newHeavy,
    historyDays: newDays.length,
    prs: patch.prs.length,
    bodyStats: patch.bodyStats.length,
    achievementsImported: patch.achievementsImported,
    memberSince: newJoined,
    notes: patch.notes,
    message,
  };

  const record: ImportRecord = { id: uid(), source: patch.source, lane, trust: patch.trust, at: new Date().toISOString(), summary, snapshot };
  useImports.getState().add(record);
  return summary;
}

/** Fully reverse an import (and any made after it, whose snapshots are now stale). */
export function undoImport(id: string): boolean {
  const rec = useImports.getState().imports.find((r) => r.id === id);
  if (!rec) return false;
  restoreSnapshot(rec.snapshot);
  useImports.getState().removeFrom(id);
  return true;
}
