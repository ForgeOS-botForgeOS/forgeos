-- ForgeOS — Supabase schema (Postgres + Auth + RLS)
-- Run in the Supabase SQL editor. Auth users live in auth.users; we mirror a
-- public profile and own all training/social/economy data with row-level security.

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- Profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Athlete',
  email text,
  sex text check (sex in ('male','female')),
  age int,
  height_cm numeric,
  weight_kg numeric,
  goal text,
  activity text,
  experience text,
  body_fat_pct numeric,
  tdee int,
  bmr int,
  macros jsonb,
  quiz_answers jsonb default '{}'::jsonb,
  xp bigint default 0,
  coins int default 50,
  streak_days int default 0,
  onboarded boolean default false,
  created_at timestamptz default now()
);

-- ---------- Exercises (shared catalogue) ----------
create table if not exists exercises (
  id text primary key,
  name text not null,
  category text not null,
  primary_muscle text not null,
  secondary text[] default '{}',
  equipment text,
  is_core boolean default false,
  video_url text
);

-- ---------- Workouts & sets ----------
create table if not exists workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date timestamptz default now(),
  duration_sec int,
  total_volume_kg numeric default 0,
  xp_earned int default 0,
  spotify_track jsonb,
  completed boolean default false
);

create table if not exists sets (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id text references exercises(id),
  set_index int not null,
  weight_kg numeric not null,
  reps int not null,
  rpe numeric,
  completed boolean default false,
  superset_group text,
  tut_seconds int,
  band_color text,
  iso_seconds int,
  note text
);

-- ---------- PRs & weigh-ins ----------
create table if not exists prs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text references exercises(id),
  exercise_name text,
  weight_kg numeric,
  reps int,
  e1rm numeric,
  date timestamptz default now(),
  spotify_track jsonb
);

create table if not exists weigh_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  unique (user_id, date)
);

-- ---------- Social ----------
create table if not exists friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text default 'pending', -- pending | accepted | blocked
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create table if not exists feed_posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text,
  workout_summary jsonb,
  created_at timestamptz default now()
);

create table if not exists reactions (
  post_id uuid not null references feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  primary key (post_id, user_id, emoji)
);

create table if not exists leaderboard_entries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint default 0,
  rank_tier text,
  public boolean default true,
  updated_at timestamptz default now()
);

-- ---------- Quests & economy ----------
create table if not exists quests (
  id text primary key,
  title text,
  description text,
  scope text,
  xp int,
  coins int,
  target int,
  metric text
);

create table if not exists user_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references quests(id) on delete cascade,
  progress numeric default 0,
  completed boolean default false,
  claimed boolean default false,
  assigned_at timestamptz default now(),
  primary key (user_id, quest_id)
);

create table if not exists marketplace_routines (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  price_coins int not null,
  weeks int,
  days_per_week int,
  focus text,
  rating numeric default 0,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references marketplace_routines(id) on delete cascade,
  spent_coins int not null,
  created_at timestamptz default now(),
  unique (user_id, routine_id)
);

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table workouts enable row level security;
alter table sets enable row level security;
alter table prs enable row level security;
alter table weigh_ins enable row level security;
alter table friendships enable row level security;
alter table feed_posts enable row level security;
alter table reactions enable row level security;
alter table leaderboard_entries enable row level security;
alter table user_quests enable row level security;
alter table marketplace_routines enable row level security;
alter table purchases enable row level security;

-- Profiles: owner read/write; everyone can read basic public fields.
drop policy if exists "profiles self" on profiles;
create policy "profiles self" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (true);

-- Owner-only tables.
drop policy if exists "workouts owner" on workouts;
create policy "workouts owner" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sets owner" on sets;
create policy "sets owner" on sets for all
  using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));
drop policy if exists "prs owner" on prs;
create policy "prs owner" on prs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "weigh_ins owner" on weigh_ins;
create policy "weigh_ins owner" on weigh_ins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_quests owner" on user_quests;
create policy "user_quests owner" on user_quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "purchases owner" on purchases;
create policy "purchases owner" on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friendships: either side may read; only owner writes their own row.
drop policy if exists "friendships read" on friendships;
create policy "friendships read" on friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "friendships write" on friendships;
create policy "friendships write" on friendships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Feed: anyone authenticated reads; author writes.
drop policy if exists "feed read" on feed_posts;
create policy "feed read" on feed_posts for select using (auth.role() = 'authenticated');
drop policy if exists "feed author" on feed_posts;
create policy "feed author" on feed_posts for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Reactions: read by all authenticated; users manage their own.
drop policy if exists "reactions read" on reactions;
create policy "reactions read" on reactions for select using (auth.role() = 'authenticated');
drop policy if exists "reactions self" on reactions;
create policy "reactions self" on reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Leaderboard: public rows readable by all; owner writes own.
drop policy if exists "leaderboard read" on leaderboard_entries;
create policy "leaderboard read" on leaderboard_entries for select using (public = true or auth.uid() = user_id);
drop policy if exists "leaderboard self" on leaderboard_entries;
create policy "leaderboard self" on leaderboard_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Marketplace: readable by all authenticated; author manages own listings.
drop policy if exists "market read" on marketplace_routines;
create policy "market read" on marketplace_routines for select using (auth.role() = 'authenticated');
drop policy if exists "market author" on marketplace_routines;
create policy "market author" on marketplace_routines for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Exercises & quests are shared read-only catalogues (no RLS needed; grant select).
-- Deny-all on purpose: the catalogue ships inside the app bundle and no client
-- query reads these tables. RLS is enabled with no policy, and write privileges
-- are revoked so a future policy cannot accidentally re-open them.
alter table exercises enable row level security;
alter table quests enable row level security;
revoke insert, update, delete on exercises, quests from anon, authenticated;

-- ---------- New-user trigger: auto-create a profile ----------
-- `set search_path` is not optional on a SECURITY DEFINER function: without it,
-- anything that can create objects earlier on the path can shadow `profiles`
-- and have its code run as the definer.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Cloud backup: the whole forge-* localStorage dump as one JSON blob per user
-- (see src/lib/cloudSync.ts). Lets progress survive clearing the browser /
-- switching devices. RLS scopes every row to its owner.
-- ---------------------------------------------------------------------------
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_backups enable row level security;

drop policy if exists "own backup" on public.user_backups;
create policy "own backup" on public.user_backups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===========================================================================
-- Real friend activity (live social). Apply on top of everything above; every
-- statement is idempotent so it's safe to re-run. See src/lib/repositories.ts.
-- ===========================================================================

-- A profile is reachable by a unique friend code, can be flagged private
-- (share_activity = false hides everything but name/rank), and tracks light
-- presence so friends see an accurate status.
alter table profiles add column if not exists friend_code text;
alter table profiles add column if not exists share_activity boolean default true;
alter table profiles add column if not exists last_active timestamptz;
alter table profiles add column if not exists training_now boolean default false;
alter table profiles add column if not exists weekly_steps int default 0; -- Garmin step race (shared only when share_activity is on)
alter table profiles add column if not exists rank_tier text;
create unique index if not exists profiles_friend_code_key on profiles (upper(friend_code)) where friend_code is not null;

-- Resolve a friend code → user id and create the friendship BOTH ways, so the
-- graph is mutual immediately. Security definer writes the reciprocal row that
-- RLS would otherwise block.
create or replace function public.add_friend_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  select id into fid from profiles where upper(friend_code) = upper(code) limit 1;
  if fid is null or fid = auth.uid() then return null; end if;
  insert into friendships (user_id, friend_id, status) values (auth.uid(), fid, 'accepted')
    on conflict (user_id, friend_id) do update set status = 'accepted';
  insert into friendships (user_id, friend_id, status) values (fid, auth.uid(), 'accepted')
    on conflict (user_id, friend_id) do update set status = 'accepted';
  return fid;
end; $$;
-- Signed-in callers only: an anonymous stranger being able to call this meant
-- the friend-code space could be brute-forced without even signing up.
revoke execute on function public.add_friend_by_code(text) from public, anon;
grant execute on function public.add_friend_by_code(text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Accepted friends may read each other's workouts / sets / prs — but only while
-- the owner is sharing activity. RLS combines these with the owner policies via
-- OR, so self-access is unaffected.
drop policy if exists "workouts friends read" on workouts;
create policy "workouts friends read" on workouts for select using (
  exists (
    select 1 from friendships f join profiles p on p.id = workouts.user_id
    where f.user_id = auth.uid() and f.friend_id = workouts.user_id
      and f.status = 'accepted' and coalesce(p.share_activity, true)
  )
);
drop policy if exists "sets friends read" on sets;
create policy "sets friends read" on sets for select using (
  exists (
    select 1 from workouts w
    join friendships f on f.friend_id = w.user_id
    join profiles p on p.id = w.user_id
    where w.id = sets.workout_id and f.user_id = auth.uid()
      and f.status = 'accepted' and coalesce(p.share_activity, true)
  )
);
drop policy if exists "prs friends read" on prs;
create policy "prs friends read" on prs for select using (
  exists (
    select 1 from friendships f join profiles p on p.id = prs.user_id
    where f.user_id = auth.uid() and f.friend_id = prs.user_id
      and f.status = 'accepted' and coalesce(p.share_activity, true)
  )
);

-- ===========================================================================
-- Security hardening. Apply on top of everything above (idempotent).
-- ===========================================================================

-- CRITICAL: the original "profiles read using (true)" exposed EVERY column —
-- email, weight, age, body fat, quiz answers — to anyone with the public anon
-- key. Lock profile rows to the owner and their accepted friends only.
-- Profile rows are OWNER-ONLY. Friends never read the raw row (it holds
-- email, weight, age, body fat, health-derived numbers); they read the
-- masked friend_profiles view below instead.
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (auth.uid() = id);

-- Friend-facing projection: social fields only, and activity numbers are
-- zeroed server-side when the owner turns "Share activity" off — the client
-- toggle is no longer the only gate. Definer view (bypasses RLS) restricted
-- to the caller's accepted friends.
create or replace view friend_profiles as
select
  p.id,
  p.name,
  p.xp,
  p.last_active,
  p.share_activity,
  case when coalesce(p.share_activity, true) then p.streak_days else 0 end as streak_days,
  case when coalesce(p.share_activity, true) then p.training_now else false end as training_now,
  case when coalesce(p.share_activity, true) then coalesce(p.weekly_steps, 0) else 0 end as weekly_steps
from profiles p
where exists (
  select 1 from friendships f
  where f.user_id = auth.uid() and f.friend_id = p.id and f.status = 'accepted'
);
revoke all on friend_profiles from anon;
grant select on friend_profiles to authenticated;

-- Feed is friends-only (your posts + accepted friends'), not all-authenticated.
-- author_name is denormalised so reading a post never needs a cross-profile read.
alter table feed_posts add column if not exists author_name text;
drop policy if exists "feed read" on feed_posts;
create policy "feed read" on feed_posts for select using (
  auth.uid() = author_id
  or exists (
    select 1 from friendships f
    where f.user_id = auth.uid() and f.friend_id = feed_posts.author_id and f.status = 'accepted'
  )
);

-- Reactions and leaderboard: require a session. NOTE, and it matters: guest mode
-- uses Supabase *anonymous sign-in*, and an anonymous user counts as
-- `authenticated` — so "authenticated" here means "anyone who asked the public
-- anon key for a token", not "someone with an account". Treat anything readable
-- under this rule as public. See migrations/2026-09-03-security-hardening.sql
-- (part B) for the tightening that needs an app change first.
drop policy if exists "reactions read" on reactions;
create policy "reactions read" on reactions for select using (auth.role() = 'authenticated');
drop policy if exists "leaderboard read" on leaderboard_entries;
create policy "leaderboard read" on leaderboard_entries for select using (
  auth.role() = 'authenticated' and (public = true or auth.uid() = user_id)
);

-- ---------- Duels (live 1v1 challenges, 2026-07-19) ----------
-- One row per duel; each side owns one progress column. Clients compute
-- win/lose locally (first to target, or higher total at the deadline) — the
-- table is just the shared source of truth for both totals.
create table if not exists duels (
  id uuid primary key,
  metric text not null check (metric in ('volume','sessions','sets')),
  target numeric not null check (target > 0 and target <= 1000000),
  challenger uuid not null references profiles(id) on delete cascade,
  opponent uuid not null references profiles(id) on delete cascade,
  challenger_progress numeric not null default 0 check (challenger_progress >= 0),
  opponent_progress numeric not null default 0 check (opponent_progress >= 0),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists duels_challenger_idx on duels (challenger);
create index if not exists duels_opponent_idx on duels (opponent);
alter table duels enable row level security;
drop policy if exists "duel participants read" on duels;
create policy "duel participants read" on duels for select using (
  auth.uid() = challenger or auth.uid() = opponent
);
drop policy if exists "challenger starts duel" on duels;
-- A duel needs an accepted friendship: user ids are readable from the public
-- leaderboard, so "the challenger is me" alone let anyone force a duel row onto
-- a stranger. (Applied to production in migrations/2026-09-03-security-hardening.sql.)
create policy "duel insert" on duels for insert with check (
  auth.uid() = challenger
  and opponent <> challenger
  and exists (
    select 1 from friendships f
    where f.user_id = auth.uid() and f.friend_id = opponent and f.status = 'accepted'
  )
);
drop policy if exists "participants update progress" on duels;
-- An UPDATE policy with no WITH CHECK reuses USING for the new row, so this
-- alone only said "you are still a participant" — the opponent could zero the
-- challenger's score, move the deadline, or swap in a different rival. Column
-- grants + the guard trigger below pin it to "your own progress, upwards only".
create policy "participants update progress" on duels for update using (
  auth.uid() = challenger or auth.uid() = opponent
);
revoke update on duels from anon, authenticated;
grant update (challenger_progress, opponent_progress, updated_at) on duels to authenticated;

create or replace function public.guard_duel_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() = old.challenger then
    new.opponent_progress := old.opponent_progress;
  elsif auth.uid() = old.opponent then
    new.challenger_progress := old.challenger_progress;
  else
    raise exception 'not a duel participant';
  end if;
  new.id := old.id; new.challenger := old.challenger; new.opponent := old.opponent;
  new.metric := old.metric; new.target := old.target; new.ends_at := old.ends_at;
  new.created_at := old.created_at;
  new.challenger_progress := greatest(new.challenger_progress, old.challenger_progress);
  new.opponent_progress := greatest(new.opponent_progress, old.opponent_progress);
  return new;
end; $$;
drop trigger if exists guard_duel_update on duels;
create trigger guard_duel_update before update on duels
  for each row execute function public.guard_duel_update();
revoke execute on function public.guard_duel_update() from public, anon, authenticated;

-- Live feed (2026-07-19): stream new feed_posts to subscribed clients.
-- RLS still applies — subscribers only receive rows they're allowed to read.
do $$ begin
  alter publication supabase_realtime add table feed_posts;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Feedback: bug reports and ideas sent from inside the app.
--
-- Insert-only on purpose. A phone can post one and can never read any — not
-- even its own — because there is no select policy at all; only the service
-- role (dashboard/operator) sees the box. The rate-limit trigger must be
-- SECURITY DEFINER for exactly that reason: as the caller it would count zero
-- rows every time and never fire.
-- ---------------------------------------------------------------------------
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bug','idea')),
  body text not null check (char_length(body) between 3 and 1200),
  screen text check (screen is null or char_length(screen) <= 60),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  platform text check (platform is null or char_length(platform) <= 16),
  mode text check (mode is null or char_length(mode) <= 16),
  handled boolean not null default false
);
create index if not exists feedback_created_idx on feedback (created_at desc);
create index if not exists feedback_user_idx on feedback (user_id);
alter table feedback enable row level security;
drop policy if exists "feedback insert" on feedback;
create policy "feedback insert" on feedback for insert with check (auth.uid() = user_id);
revoke update, delete on feedback from anon, authenticated;

create or replace function public.limit_feedback_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many messages — try again later';
  end if;
  new.created_at := now();   -- the client does not choose the timestamp
  new.handled := false;
  return new;
end; $$;
drop trigger if exists limit_feedback_rate on feedback;
create trigger limit_feedback_rate before insert on feedback
  for each row execute function public.limit_feedback_rate();
revoke execute on function public.limit_feedback_rate() from public, anon, authenticated;
