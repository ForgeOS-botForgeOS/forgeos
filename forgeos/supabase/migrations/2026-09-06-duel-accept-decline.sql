-- Duels: a challenge is an offer, not a fact.
--
-- Until now a duel row was live the moment the challenger inserted it. The
-- opponent's phone mirrored it as 'active' and started counting their workouts
-- towards a target somebody else picked — you could be losing a contest you had
-- never agreed to, and the only way out was to let it expire.
--
-- `state` adds the missing step. It defaults to 'active' so every duel already
-- running keeps running untouched; only newly-inserted rows say 'pending'.
--
-- Who may write it is the whole point, so it is pinned in three places: the
-- column grant lets `state` be written at all, and the guard trigger decides by
-- WHOM and to WHAT. Without the trigger the challenger could accept on the
-- opponent's behalf, or flip a duel they were losing back to 'declined'.

alter table duels
  add column if not exists state text not null default 'active'
  check (state in ('pending', 'active', 'declined'));

-- Only these columns are writable at all; `state` joins the two progress ones.
revoke update on duels from anon, authenticated;
grant update (challenger_progress, opponent_progress, state, updated_at) on duels to authenticated;

create or replace function public.guard_duel_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() = old.challenger then
    new.opponent_progress := old.opponent_progress;
    -- The challenger never answers their own challenge.
    new.state := old.state;
  elsif auth.uid() = old.opponent then
    new.challenger_progress := old.challenger_progress;
    -- The opponent answers exactly once, and only from 'pending'. Anything
    -- else (declining a duel you are losing, re-opening one you declined)
    -- silently keeps the state it already had.
    if old.state <> 'pending' or new.state not in ('active', 'declined') then
      new.state := old.state;
    end if;
  else
    raise exception 'not a duel participant';
  end if;

  new.id := old.id; new.challenger := old.challenger; new.opponent := old.opponent;
  new.metric := old.metric; new.target := old.target; new.ends_at := old.ends_at;
  new.created_at := old.created_at;

  -- Accepting starts the contest from zero, so the ratchet is skipped for the
  -- one write that turns 'pending' into 'active'. Every other write may only
  -- raise a score, exactly as before.
  if old.state = 'pending' and new.state = 'active' then
    new.challenger_progress := 0;
    new.opponent_progress := 0;
  else
    new.challenger_progress := greatest(new.challenger_progress, old.challenger_progress);
    new.opponent_progress := greatest(new.opponent_progress, old.opponent_progress);
  end if;
  return new;
end; $$;

drop trigger if exists guard_duel_update on duels;
create trigger guard_duel_update before update on duels
  for each row execute function public.guard_duel_update();

-- EXECUTE is granted to PUBLIC on create *and* to anon by Supabase defaults, so
-- both have to be named explicitly (learned the hard way, 2026-09-03).
revoke execute on function public.guard_duel_update() from public, anon, authenticated;
