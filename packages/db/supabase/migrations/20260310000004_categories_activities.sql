-- The customizable activity layer: categories (user-defined, map to exactly
-- one fixed stat) and activities (user-defined, scheduled, difficulty-rated).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  stat text not null check (stat in ('STR', 'AGI', 'VIT', 'INT', 'FOCUS')),
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  metric_type text not null check (metric_type in ('checkbox', 'minutes', 'reps', 'sets_reps_weight')),
  target_value jsonb not null,
  schedule jsonb not null,
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint activities_target_value_matches_metric_type check (target_value ->> 'type' = metric_type),
  constraint activities_target_value_is_safe check (public.is_valid_activity_target(target_value)),
  constraint activities_schedule_is_valid check (
    (schedule ->> 'kind' = 'daily')
    or (schedule ->> 'kind' = 'weekdays' and jsonb_typeof(schedule -> 'weekdays') = 'array')
    or (schedule ->> 'kind' = 'one_off' and schedule ->> 'date' is not null)
  )
);

create index activities_user_id_idx on public.activities (user_id);
create index activities_category_id_idx on public.activities (category_id);

-- categories.user_id and activities.user_id must agree. Postgres can't
-- express a cross-row FK ("this activity's category belongs to this
-- activity's user") declaratively, so a trigger enforces it.
create or replace function public.check_activity_category_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category_user_id uuid;
begin
  select user_id into v_category_user_id
  from public.categories
  where id = new.category_id;

  if v_category_user_id is null then
    raise exception 'category % does not exist', new.category_id;
  end if;

  if v_category_user_id <> new.user_id then
    raise exception 'activity.user_id must match its category.user_id';
  end if;

  return new;
end;
$$;

create trigger activities_check_category_owner
  before insert or update on public.activities
  for each row
  execute function public.check_activity_category_owner();
