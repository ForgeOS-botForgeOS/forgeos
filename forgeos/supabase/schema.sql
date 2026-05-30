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
create policy "profiles self" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles read" on profiles for select using (true);

-- Owner-only tables.
create policy "workouts owner" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sets owner" on sets for all
  using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "prs owner" on prs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weigh_ins owner" on weigh_ins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_quests owner" on user_quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "purchases owner" on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friendships: either side may read; only owner writes their own row.
create policy "friendships read" on friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships write" on friendships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Feed: anyone authenticated reads; author writes.
create policy "feed read" on feed_posts for select using (auth.role() = 'authenticated');
create policy "feed author" on feed_posts for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Reactions: read by all authenticated; users manage their own.
create policy "reactions read" on reactions for select using (auth.role() = 'authenticated');
create policy "reactions self" on reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Leaderboard: public rows readable by all; owner writes own.
create policy "leaderboard read" on leaderboard_entries for select using (public = true or auth.uid() = user_id);
create policy "leaderboard self" on leaderboard_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Marketplace: readable by all authenticated; author manages own listings.
create policy "market read" on marketplace_routines for select using (auth.role() = 'authenticated');
create policy "market author" on marketplace_routines for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Exercises & quests are shared read-only catalogues (no RLS needed; grant select).
grant select on exercises, quests to anon, authenticated;

-- ---------- New-user trigger: auto-create a profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
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
