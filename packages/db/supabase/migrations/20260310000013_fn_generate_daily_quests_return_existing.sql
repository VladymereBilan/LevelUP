-- generate_daily_quests() was `insert ... on conflict do nothing returning
-- *`: Postgres never includes a row skipped by ON CONFLICT DO NOTHING in
-- RETURNING, so every call after the first one for a given user/date
-- returned zero rows even though that day's quests still existed. The
-- caller (apps/web's /api/quests/generate) uses this return value as the
-- mobile app's entire view of "today's quests" — so in practice, the quest
-- board would go blank on the second and every later load each day (any
-- tab switch, backgrounding, or pull-to-refresh), while the quests
-- themselves, with their real progress/status, were still sitting in the
-- table untouched.
--
-- Fixed to always return the full set of the user's quests for p_date —
-- both newly inserted and pre-existing — by selecting them back out after
-- the insert, instead of relying on the insert's own RETURNING.
create or replace function public.generate_daily_quests(p_user_id uuid, p_date date)
returns setof public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dow int := extract(dow from p_date);
begin
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
  on conflict (user_id, activity_id, date) do nothing;

  return query
    select * from public.quests
    where user_id = p_user_id and date = p_date;
end;
$$;

revoke all on function public.generate_daily_quests from public, anon, authenticated;
grant execute on function public.generate_daily_quests to service_role;
