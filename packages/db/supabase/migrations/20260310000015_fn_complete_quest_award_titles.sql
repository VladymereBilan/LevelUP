-- Extends complete_quest to atomically award titles in the same
-- transaction as everything else it writes. Which titles were newly
-- earned is computed in apps/web's route handler using
-- @levelup/engine's evaluateTitleRules (pure, unit-tested) — this
-- function, same as every other piece of it, is a thin writer for an
-- already-computed value, not where the rule logic lives.
--
-- p_titles_unlocked is a jsonb array of {"id", "name", "description"}
-- objects (empty array when nothing was newly earned this completion).
-- Both the user_titles insert below and the stored/returned result
-- read from this one value, so there's no second "list of ids"
-- parameter that could drift out of sync with it.
--
-- Postgres identifies a function by (name, parameter TYPE list) —
-- adding a parameter, even a defaulted one, changes that identity.
-- CREATE OR REPLACE on a different parameter count does not replace
-- the existing function; it silently creates a second overload,
-- leaving `public.complete_quest` ambiguous for every bare-name
-- reference (REVOKE/GRANT, supabase-js's rpc() by name). The old
-- 18-parameter signature must be dropped explicitly first so exactly
-- one complete_quest exists afterward.
drop function if exists public.complete_quest(
  uuid, uuid, numeric, text, int, text, int, int, text, boolean, int, boolean, text, int, int,
  int, date, int
);

create or replace function public.complete_quest(
  p_quest_id uuid,
  p_user_id uuid,
  p_progress numeric,
  p_source text,
  p_xp_awarded int,
  p_reason text,
  p_new_level int,
  p_new_xp int,
  p_new_rank text,
  p_leveled_up boolean,
  p_levels_gained int,
  p_ranked_up boolean,
  p_stat text,
  p_new_stat_value int,
  p_new_streak_current int,
  p_new_streak_longest int,
  p_new_streak_last_date date,
  p_new_streak_grace_used int,
  p_titles_unlocked jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests;
  v_title_name text;
  v_result jsonb;
begin
  select * into v_quest from public.quests where id = p_quest_id for update;

  if v_quest.id is null then
    raise exception 'quest % not found', p_quest_id;
  end if;

  if v_quest.user_id <> p_user_id then
    raise exception 'quest % does not belong to user %', p_quest_id, p_user_id;
  end if;

  if v_quest.status <> 'pending' then
    raise exception 'quest % is not pending (status: %)', p_quest_id, v_quest.status;
  end if;

  if p_stat not in ('STR', 'AGI', 'VIT', 'INT', 'FOCUS') then
    raise exception 'invalid stat %', p_stat;
  end if;

  select t.name into v_title_name
  from public.profiles pr
  left join public.titles t on t.id = pr.title_id
  where pr.id = p_user_id;

  v_result := jsonb_build_object(
    'questId', p_quest_id,
    'xpAwarded', p_xp_awarded,
    'level', p_new_level,
    'xp', p_new_xp,
    'rank', p_new_rank,
    'leveledUp', p_leveled_up,
    'levelsGained', p_levels_gained,
    'rankedUp', p_ranked_up,
    'stat', p_stat,
    'statValue', p_new_stat_value,
    'streak', jsonb_build_object(
      'current', p_new_streak_current,
      'longest', p_new_streak_longest,
      'graceDaysUsed', p_new_streak_grace_used,
      'lastCompletedDate', p_new_streak_last_date
    ),
    'title', v_title_name,
    'titlesUnlocked', p_titles_unlocked
  );

  update public.quests
    set status = 'completed',
        progress = p_progress,
        source = p_source,
        result = v_result,
        completed_at = now()
    where id = p_quest_id;

  -- xp_events.amount has a CHECK (amount <> 0): the daily cap can legitimately
  -- bring the award to 0 (quest still completes, just earns no XP), so only
  -- log an event when there's a nonzero amount to log.
  if p_xp_awarded <> 0 then
    insert into public.xp_events (user_id, quest_id, amount, reason)
      values (p_user_id, p_quest_id, p_xp_awarded, p_reason);
  end if;

  update public.profiles
    set level = p_new_level, xp = p_new_xp, rank = p_new_rank
    where id = p_user_id;

  update public.stats set
    str = case when p_stat = 'STR' then p_new_stat_value else str end,
    agi = case when p_stat = 'AGI' then p_new_stat_value else agi end,
    vit = case when p_stat = 'VIT' then p_new_stat_value else vit end,
    int = case when p_stat = 'INT' then p_new_stat_value else int end,
    focus = case when p_stat = 'FOCUS' then p_new_stat_value else focus end
    where user_id = p_user_id;

  update public.streaks set
    current = p_new_streak_current,
    longest = p_new_streak_longest,
    last_completed_date = p_new_streak_last_date,
    grace_days_used = p_new_streak_grace_used
    where user_id = p_user_id;

  if jsonb_array_length(p_titles_unlocked) > 0 then
    insert into public.user_titles (user_id, title_id)
    select p_user_id, (elem ->> 'id')::uuid
    from jsonb_array_elements(p_titles_unlocked) as elem
    on conflict (user_id, title_id) do nothing;
  end if;

  return v_result;
end;
$$;

revoke all on function public.complete_quest from public, anon, authenticated;
grant execute on function public.complete_quest to service_role;
