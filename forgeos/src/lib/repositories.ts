import { supabase, isBackendLive } from './supabase';
import type { FeedPost, Friend, PR, UserProfile, Workout } from '../types';
import type { FriendActivity, FriendSession } from './friendActivity';
import { rankForXp, rankLabel } from '../data/ranks';

// A thin repository layer mapping domain objects <-> Supabase rows. Every
// function degrades gracefully to a no-op / null in mock mode, so the stores
// can call these unconditionally and the app behaves identically offline.

// ---- Profiles ----
export async function fetchProfile(id: string): Promise<UserProfile | null> {
  if (!isBackendLive || !supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToProfile(data);
}

export async function upsertProfile(p: UserProfile): Promise<void> {
  if (!isBackendLive || !supabase) return;
  await supabase.from('profiles').upsert(profileToRow(p));
}

// ---- Workouts ----
export async function pushWorkout(userId: string, w: Workout): Promise<boolean> {
  if (!isBackendLive || !supabase) return false;
  const { error } = await supabase.from('workouts').upsert({
    id: w.id,
    user_id: userId,
    name: w.name,
    date: w.date,
    duration_sec: w.durationSec ?? null,
    total_volume_kg: w.totalVolumeKg ?? 0,
    xp_earned: w.xpEarned ?? 0,
    spotify_track: w.spotifyTrack ?? null,
    completed: w.completed,
  });
  if (error) return false;
  // Replace sets for this workout.
  await supabase.from('sets').delete().eq('workout_id', w.id);
  const rows = w.exercises.flatMap((we) =>
    we.sets.map((s, i) => ({
      workout_id: w.id,
      exercise_id: we.exerciseId,
      set_index: i,
      weight_kg: s.weightKg,
      reps: s.reps,
      rpe: s.rpe ?? null,
      completed: s.completed,
      superset_group: we.supersetGroup ?? null,
      tut_seconds: s.tutSeconds ?? null,
      band_color: s.bandColor ?? null,
      iso_seconds: s.isoSeconds ?? null,
      note: s.note ?? null,
    })),
  );
  if (rows.length) await supabase.from('sets').insert(rows);
  return true;
}

// ---- Feed ----
export async function fetchFeed(): Promise<FeedPost[] | null> {
  if (!isBackendLive || !supabase) return null;
  const { data, error } = await supabase
    .from('feed_posts')
    .select('id, author_id, body, workout_summary, created_at, profiles(name)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: (r as { profiles?: { name?: string } }).profiles?.name ?? 'Athlete',
    avatarSeed: ((r as { profiles?: { name?: string } }).profiles?.name ?? 'A').slice(0, 2).toUpperCase(),
    body: r.body ?? '',
    workoutSummary: r.workout_summary ?? undefined,
    createdAt: r.created_at,
    reactions: {},
  }));
}

export async function publishPostRemote(authorId: string, body: string, summary?: FeedPost['workoutSummary']): Promise<void> {
  if (!isBackendLive || !supabase) return;
  await supabase.from('feed_posts').insert({ author_id: authorId, body, workout_summary: summary ?? null });
}

export async function reactRemote(postId: string, userId: string, emoji: string): Promise<void> {
  if (!isBackendLive || !supabase) return;
  await supabase.from('reactions').upsert({ post_id: postId, user_id: userId, emoji });
}

// ---- Friends (live graph + real activity) ----

// Resolve a friend code to a real user and create the mutual friendship.
// Returns the new friend (real profile) or null if not found / no backend.
export async function addFriendByCodeRemote(code: string): Promise<Friend | null> {
  if (!isBackendLive || !supabase) return null;
  const { data: fid, error } = await supabase.rpc('add_friend_by_code', { code });
  if (error || !fid) return null;
  const { data: rows } = await supabase
    .from('profiles')
    .select('id, name, xp, streak_days, last_active, training_now')
    .eq('id', String(fid))
    .limit(1);
  return rows && rows[0] ? rowToFriend(rows[0] as Row) : null;
}

// Everyone you're accepted friends with, as Friend rows.
export async function fetchFriendsRemote(): Promise<Friend[] | null> {
  if (!isBackendLive || !supabase) return null;
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return null;
  const { data: links, error } = await supabase.from('friendships').select('friend_id').eq('user_id', me).eq('status', 'accepted');
  if (error || !links) return null;
  const ids = links.map((l) => String((l as { friend_id: string }).friend_id));
  if (ids.length === 0) return [];
  const { data: profs } = await supabase.from('profiles').select('id, name, xp, streak_days, last_active, training_now').in('id', ids);
  return (profs ?? []).map((p) => rowToFriend(p as Row));
}

export async function removeFriendRemote(friendId: string): Promise<void> {
  if (!isBackendLive || !supabase) return;
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return;
  // Drop both directions of the friendship.
  await supabase.from('friendships').delete().eq('user_id', me).eq('friend_id', friendId);
  await supabase.from('friendships').delete().eq('user_id', friendId).eq('friend_id', me);
}

// A friend's REAL activity, derived from their synced workouts/PRs. Honest about
// privacy: when they've turned sharing off we return only the private flag.
export async function fetchFriendActivityRemote(friendId: string): Promise<FriendActivity | null> {
  if (!isBackendLive || !supabase) return null;
  const { data: prof } = await supabase.from('profiles').select('share_activity').eq('id', friendId).single();
  if (prof && prof.share_activity === false) {
    return { weeklySessions: 0, totalVolumeKg: 0, prs: 0, favourite: '', sessions: [], bio: '', real: true, private: true };
  }
  const [wsRes, prCountRes, topPrRes] = await Promise.all([
    // All workouts (newest first) so volume is a true lifetime total and the
    // weekly count is exact — capped at 1000 rows, ample for a personal log.
    supabase.from('workouts').select('name, date, total_volume_kg, duration_sec').eq('user_id', friendId).order('date', { ascending: false }).limit(1000),
    supabase.from('prs').select('id', { count: 'exact', head: true }).eq('user_id', friendId),
    supabase.from('prs').select('exercise_name, e1rm').eq('user_id', friendId).order('e1rm', { ascending: false }).limit(1),
  ]);
  const workouts = (wsRes.data ?? []) as { name: string; date: string; total_volume_kg: number; duration_sec: number }[];
  const now = Date.now();
  const weeklySessions = workouts.filter((w) => now - new Date(w.date).getTime() < 7 * 86400000).length;
  const totalVolumeKg = Math.round(workouts.reduce((a, w) => a + (Number(w.total_volume_kg) || 0), 0));
  const sessions: FriendSession[] = workouts.slice(0, 6).map((w) => {
    const daysAgo = Math.max(0, Math.floor((now - new Date(w.date).getTime()) / 86400000));
    const vol = Math.round(Number(w.total_volume_kg) || 0);
    const mins = Math.round((Number(w.duration_sec) || 0) / 60);
    return { kind: vol > 0 ? 'lift' : 'cardio', label: w.name ?? 'Session', detail: vol > 0 ? `${vol.toLocaleString()} kg` : `${mins} min`, daysAgo };
  });
  const topPr = (topPrRes.data ?? [])[0] as { exercise_name?: string } | undefined;
  return { weeklySessions, totalVolumeKg, prs: prCountRes.count ?? 0, favourite: topPr?.exercise_name ?? '', sessions, bio: '', real: true };
}

// Push my own status so friends see accurate rank/XP/streak/presence.
export async function syncMyActivityRemote(opts: { friendCode?: string; xp: number; streakDays: number; shareActivity: boolean; trainingNow?: boolean }): Promise<void> {
  if (!isBackendLive || !supabase) return;
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return;
  const rankTier = rankLabel(rankForXp(opts.xp).tier);
  await supabase.from('profiles').update({
    friend_code: opts.friendCode ?? null,
    xp: opts.xp,
    streak_days: opts.streakDays,
    rank_tier: rankTier,
    share_activity: opts.shareActivity,
    training_now: opts.trainingNow ?? false,
    last_active: new Date().toISOString(),
  }).eq('id', me);
  await supabase.from('leaderboard_entries').upsert({ user_id: me, xp: opts.xp, rank_tier: rankTier, public: true, updated_at: new Date().toISOString() });
}

// Mirror my PRs (one per exercise — the local source of truth) so friends see
// an accurate PR count and top lift. Replace-all keeps it exact and idempotent.
export async function pushPRsRemote(prs: PR[]): Promise<void> {
  if (!isBackendLive || !supabase) return;
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return;
  await supabase.from('prs').delete().eq('user_id', me);
  if (prs.length === 0) return;
  await supabase.from('prs').insert(prs.map((p) => ({
    user_id: me,
    exercise_id: p.exerciseId,
    exercise_name: p.exerciseName,
    weight_kg: p.weightKg,
    reps: p.reps,
    e1rm: p.e1rm,
    date: p.date,
  })));
}

function rowToFriend(p: Row): Friend {
  const name = (p.name as string) ?? 'Athlete';
  const xp = Number(p.xp) || 0;
  const lastIso = (p.last_active as string) || undefined;
  const online = lastIso ? Date.now() - new Date(lastIso).getTime() < 5 * 60000 : false;
  return {
    id: String(p.id),
    name,
    rank: rankLabel(rankForXp(xp).tier),
    xp,
    online,
    avatarSeed: name.slice(0, 2).toUpperCase(),
    trainingNow: Boolean(p.training_now) && online,
    streak: Number(p.streak_days) || 0,
    lastActiveISO: lastIso,
    friendCode: (p.friend_code as string) || undefined,
  };
}

// ---- Leaderboard ----
export async function upsertLeaderboard(userId: string, xp: number, rankTier: string, isPublic: boolean): Promise<void> {
  if (!isBackendLive || !supabase) return;
  await supabase.from('leaderboard_entries').upsert({ user_id: userId, xp, rank_tier: rankTier, public: isPublic, updated_at: new Date().toISOString() });
}

// ---- mappers ----
type Row = Record<string, unknown>;
function rowToProfile(r: Row): UserProfile {
  return {
    id: String(r.id),
    name: (r.name as string) ?? 'Athlete',
    email: (r.email as string) ?? undefined,
    sex: (r.sex as UserProfile['sex']) ?? 'male',
    age: (r.age as number) ?? 28,
    heightCm: (r.height_cm as number) ?? 178,
    weightKg: (r.weight_kg as number) ?? 80,
    goal: (r.goal as UserProfile['goal']) ?? 'recomp',
    activity: (r.activity as UserProfile['activity']) ?? 'moderate',
    experience: (r.experience as UserProfile['experience']) ?? 'beginner',
    bodyFatPct: (r.body_fat_pct as number) ?? undefined,
    tdee: (r.tdee as number) ?? 2400,
    bmr: (r.bmr as number) ?? 1800,
    macros: (r.macros as UserProfile['macros']) ?? { calories: 2200, proteinG: 160, carbsG: 220, fatG: 60 },
    quizAnswers: (r.quiz_answers as Record<string, string>) ?? {},
    onboarded: Boolean(r.onboarded),
    friendCode: (r.friend_code as string) ?? undefined,
  };
}

function profileToRow(p: UserProfile): Row {
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? null,
    sex: p.sex,
    age: p.age,
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    goal: p.goal,
    activity: p.activity,
    experience: p.experience,
    body_fat_pct: p.bodyFatPct ?? null,
    tdee: p.tdee,
    bmr: p.bmr,
    macros: p.macros,
    quiz_answers: p.quizAnswers,
    onboarded: p.onboarded,
    friend_code: p.friendCode ?? null,
  };
}
