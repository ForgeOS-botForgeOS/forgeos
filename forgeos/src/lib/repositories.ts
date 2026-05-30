import { supabase, isBackendLive } from './supabase';
import type { FeedPost, UserProfile, Workout } from '../types';

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
  };
}
