-- ForgeOS — security hardening, round 2, 2026-11-01 (authorised pen test).
-- NOT APPLIED to the live project. Review, then run in the SQL editor.
-- Every statement is idempotent.
--
-- 1. friendships: any signed-in caller (an anonymous guest counts) could INSERT
--    (me, victim, 'accepted') for any user id. Every "friends read" policy
--    (workouts, sets, prs, feed_posts, friend_profiles) and the duel-insert
--    policy only look at the row *the caller owns*, so that one self-made row
--    opened the victim's whole training log. User ids are readable from the
--    public leaderboard. Fix: clients never write friendships at all
--    (add_friend_by_code is SECURITY DEFINER and is the only creator); they may
--    only delete a row they are on either side of.
-- 2. Unfriending only deleted the caller's own row, so the other side kept
--    read access. Delete now works from both sides.
-- 3. duels: the challenger could insert state='active' (skipping consent),
--    pre-seeded progress, or an absurd deadline.
-- 4. reactions: could be written against posts the caller cannot see.
-- 5. Unbounded text/JSON columns written by the owner but rendered to others.

-- ---- 1 + 2. friendships ---------------------------------------------------
drop policy if exists "friendships write" on public.friendships;
drop policy if exists "friendships delete" on public.friendships;
create policy "friendships delete" on public.friendships for delete using (
  auth.uid() = user_id or auth.uid() = friend_id
);
revoke insert, update on public.friendships from anon, authenticated;
grant delete on public.friendships to authenticated;

-- One-off cleanup: accepted rows with no reciprocal row are either forged by the
-- hole above or left behind by the half-unfriend. add_friend_by_code always
-- writes both directions, so a genuine friendship never looks like this.
-- AUDIT FIRST:  select * from public.friendships f where f.status = 'accepted'
--   and not exists (select 1 from public.friendships r
--     where r.user_id = f.friend_id and r.friend_id = f.user_id and r.status = 'accepted');
delete from public.friendships f
where f.status = 'accepted'
  and not exists (
    select 1 from public.friendships r
    where r.user_id = f.friend_id and r.friend_id = f.user_id and r.status = 'accepted'
  );

-- ---- 3. duels --------------------------------------------------------------
drop policy if exists "duel insert" on public.duels;
create policy "duel insert" on public.duels for insert with check (
  auth.uid() = challenger
  and opponent <> challenger
  and state = 'pending'
  and challenger_progress = 0
  and opponent_progress = 0
  and ends_at > now()
  and ends_at <= now() + interval '400 days'
  and exists (
    select 1 from public.friendships f
    where f.user_id = auth.uid() and f.friend_id = opponent and f.status = 'accepted'
  )
);

-- ---- 4. reactions ----------------------------------------------------------
-- The subquery runs under the caller's RLS, so "exists" means "can see the post".
drop policy if exists "reactions self" on public.reactions;
create policy "reactions self" on public.reactions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.feed_posts p where p.id = post_id)
  );

-- ---- 5. size limits (NOT VALID: enforced for new writes, old rows untouched) --
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len check (char_length(name) <= 64) not valid;
alter table public.feed_posts drop constraint if exists feed_posts_body_len;
alter table public.feed_posts add constraint feed_posts_body_len
  check (char_length(body) <= 2000 and char_length(author_name) <= 64
         and pg_column_size(workout_summary) <= 2048) not valid;
alter table public.user_backups drop constraint if exists user_backups_size;
alter table public.user_backups add constraint user_backups_size
  check (pg_column_size(data) <= 20000000) not valid;

-- Rollback:
--   drop policy "friendships delete" on public.friendships;
--   create policy "friendships write" on public.friendships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
--   grant insert, update on public.friendships to authenticated;
