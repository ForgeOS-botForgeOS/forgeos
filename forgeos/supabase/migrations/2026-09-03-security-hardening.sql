-- ForgeOS — security hardening, 2026-09-03.
--
-- Written after a red-team pass over the schema and confirmed against the live
-- project's own linter (Supabase security advisors). Every statement is
-- idempotent: running it twice is a no-op.
--
-- PART A is APPLIED to the live project (2026-09-03) and verified by a
--   rolled-back test as an `authenticated` role: a duel against a non-friend is
--   refused, a duel with a real friend still works, your own progress still
--   writes, and wiping the rival's score / moving the deadline / swapping the
--   opponent are all blocked. It only narrows what the *server* accepts, in ways
--   the app never does, so no client change was needed.
-- PART B is NOT applied — it changes behaviour people can see (adding by a
--   friend code becomes a request instead of an instant friendship) and needs
--   matching app work. Read it, then run it when you want that change.
--
-- Rollback for PART A is at the bottom.

-- =====================================================================
-- PART A — applied 2026-09-03
-- =====================================================================

-- A1. handle_new_user() is SECURITY DEFINER with a mutable search_path — the
-- classic Postgres privilege-escalation shape (anything that can create objects
-- earlier on the path can shadow `profiles` and run as the definer). It is also
-- exposed as an RPC to `anon`, which it was never meant to be: it is a trigger.
-- Body unchanged from schema.sql — the only edit is `set search_path`.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- `create function` grants EXECUTE to PUBLIC, and Supabase's default privileges
-- grant it to `anon` explicitly on top — so both have to be revoked by name.
-- (The trigger still fires: triggers run as the table owner, not through the API.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- add_friend_by_code adds a friendship as the caller. An unauthenticated
-- stranger could call it — which meant the friend-code space could be
-- brute-forced without even signing up. Signed-in callers only.
revoke execute on function public.add_friend_by_code(text) from public, anon;
grant execute on function public.add_friend_by_code(text) to authenticated;

-- A2. Duels: a participant could rewrite the whole row.
--
-- `create policy "participants update progress" on duels for update using (...)`
-- has no WITH CHECK, and Postgres then reuses USING for the new row — so the
-- only rule was "you are still a participant". The opponent could zero the
-- challenger's score, set their own to the target, move the deadline, or swap
-- the other participant for a stranger. The client only ever writes its own
-- progress column, so pinning that server-side breaks nothing.
--
-- Column grants stop the metadata columns being touched at all; the trigger
-- stops each side touching the other's number, and stops progress going
-- backwards (a duel is a ratchet).
revoke update on public.duels from anon, authenticated;
grant update (challenger_progress, opponent_progress, updated_at) on public.duels to authenticated;

create or replace function public.guard_duel_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() = old.challenger then
    new.opponent_progress := old.opponent_progress;   -- not yours to write
  elsif auth.uid() = old.opponent then
    new.challenger_progress := old.challenger_progress;
  else
    raise exception 'not a duel participant';
  end if;
  -- Identity and terms are fixed once the duel exists.
  new.id := old.id;
  new.challenger := old.challenger;
  new.opponent := old.opponent;
  new.metric := old.metric;
  new.target := old.target;
  new.ends_at := old.ends_at;
  new.created_at := old.created_at;
  -- Progress only ever goes up.
  new.challenger_progress := greatest(new.challenger_progress, old.challenger_progress);
  new.opponent_progress := greatest(new.opponent_progress, old.opponent_progress);
  return new;
end; $$;

drop trigger if exists guard_duel_update on public.duels;
create trigger guard_duel_update before update on public.duels
  for each row execute function public.guard_duel_update();
revoke execute on function public.guard_duel_update() from public, anon, authenticated;

-- A3. Duels: anyone could push an unsolicited duel row onto any user id they
-- knew (and ids are readable from the public leaderboard). A duel now requires
-- an accepted friendship, which is the only way the app creates one anyway.
-- NOTE: the live insert policy was named "challenger starts duel", not
-- "duel insert" — schema.sql had drifted from production. Adding a stricter
-- policy therefore changed nothing at first: permissive RLS policies are OR'd,
-- so the weak one kept allowing duels against any user id. Dropping it is the
-- half of this fix that actually did the work.
drop policy if exists "challenger starts duel" on public.duels;
drop policy if exists "duel insert" on public.duels;
create policy "duel insert" on public.duels for insert with check (
  auth.uid() = challenger
  and opponent <> challenger
  and exists (
    select 1 from public.friendships f
    where f.user_id = auth.uid() and f.friend_id = opponent and f.status = 'accepted'
  )
);

-- A4. The shared catalogues. The schema file said "no RLS needed" for
-- `exercises` and `quests`; the live project has RLS enabled with no policy,
-- i.e. deny-all, which is correct — the catalogue ships inside the app bundle
-- and the client never queries these tables. Made explicit so the file matches
-- production and nobody "fixes" it by turning RLS back off.
alter table if exists public.exercises enable row level security;
alter table if exists public.quests enable row level security;
revoke insert, update, delete on public.exercises from anon, authenticated;
revoke insert, update, delete on public.quests from anon, authenticated;

-- =====================================================================
-- PART B — NOT applied. Run when you want the behaviour change.
-- =====================================================================

-- B1. Adding by friend code creates an *accepted* friendship on both sides with
-- no consent from the person being added — and the code is a 6-8 character
-- bearer token that people paste into group chats. Whoever holds one gets your
-- workouts, sets, PRs and feed. This makes it a request the other person
-- accepts, using the friend-request UI the app already has.
--
-- App change needed first: `addFriendByCodeRemote` must show "request sent"
-- instead of adding the friend immediately, and the requests screen must list
-- incoming ones from this path.
--
-- create or replace function public.add_friend_by_code(code text)
-- returns uuid language plpgsql security definer set search_path = public as $$
-- declare fid uuid;
-- begin
--   if code !~ '^FORGE-[A-Za-z0-9]{4,12}$' then return null; end if;
--   select id into fid from profiles where upper(friend_code) = upper(code) limit 1;
--   if fid is null or fid = auth.uid() then return null; end if;
--   -- rate limit: at most 10 lookups an hour per account
--   if (select count(*) from friend_code_attempts
--       where actor = auth.uid() and at > now() - interval '1 hour') >= 10 then
--     raise exception 'too many attempts';
--   end if;
--   insert into friend_code_attempts (actor) values (auth.uid());
--   insert into friendships (user_id, friend_id, status) values (auth.uid(), fid, 'pending')
--     on conflict (user_id, friend_id) do nothing;
--   return fid;
-- end; $$;
-- revoke execute on function public.add_friend_by_code(text) from anon;  -- signed-in only

-- B2. Anonymous sign-ins are enabled (guest mode uses them), and Supabase counts
-- an anonymous user as `authenticated` — so every policy written as
-- `auth.role() = 'authenticated'` is readable by anyone who asks the public anon
-- key for a token. That currently includes the reactions table (a scrapeable
-- interaction graph) and the marketplace.
--
-- drop policy if exists "reactions read" on public.reactions;
-- create policy "reactions read" on public.reactions for select using (
--   coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
-- );

-- B3. `leaderboard_entries` exposes each user's real auth uuid to any signed-in
-- (including anonymous) caller. With A3 in place that id is much less useful,
-- but the clean fix is a view that returns a display name and a surrogate id.

-- =====================================================================
-- Rollback for PART A
-- =====================================================================
-- drop trigger if exists guard_duel_update on public.duels;
-- drop function if exists public.guard_duel_update();
-- grant update on public.duels to authenticated;
-- drop policy if exists "duel insert" on public.duels;
-- create policy "duel insert" on public.duels for insert with check (auth.uid() = challenger);
