-- Creates pending quests for a user's active activities whose schedule
-- matches p_date (the user's LOCAL date — the caller, apps/web's route
-- handler, resolves that via @levelup/engine's getLocalDateString(now,
-- profile.timezone) before calling this; this function has no notion of
-- timezone itself and just takes a plain date). Archived activities are
-- skipped. Relies on quests' unique (user_id, activity_id, date) constraint
-- plus ON CONFLICT DO NOTHING to stay idempotent — calling this twice for
-- the same user/date is always safe.
create or replace function public.generate_daily_quests(p_user_id uuid, p_date date)
returns setof public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dow int := extract(dow from p_date);
begin
  return query
  insert into public.quests (user_id, activity_id, date, target, status)
  select
    a.user_id,
    a.id,
    p_date,
    a.target_value,
    'pending'
  from public.activities a
  where a.user_id = p_user_id
    and a.archived = false
    and (
      a.schedule ->> 'kind' = 'daily'
      or (
        a.schedule ->> 'kind' = 'weekdays'
        and exists (
          select 1
          from jsonb_array_elements_text(a.schedule -> 'weekdays') as w (day)
          where w.day::int = v_dow
        )
      )
      or (
        a.schedule ->> 'kind' = 'one_off'
        and (a.schedule ->> 'date')::date = p_date
      )
    )
  on conflict (user_id, activity_id, date) do nothing
  returning *;
end;
$$;

revoke all on function public.generate_daily_quests from public, anon, authenticated;
grant execute on function public.generate_daily_quests to service_role;
