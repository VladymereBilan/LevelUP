create table public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  date date not null,
  -- Frozen snapshot of the activity's target_value at the time this quest
  -- was generated — editing the activity later must not change history.
  target jsonb not null,
  progress numeric not null default 0 check (progress >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  source text check (source in ('health', 'timer', 'manual')),
  -- Snapshot of the completion response (see complete_quest()), stored so a
  -- repeat POST /api/quests/[id]/complete can replay the original result
  -- instead of recomputing against state that may have moved on since.
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quests_target_is_safe check (public.is_valid_activity_target(target)),
  constraint quests_user_activity_date_unique unique (user_id, activity_id, date)
);

create index quests_user_id_date_idx on public.quests (user_id, date);
create index quests_activity_id_idx on public.quests (activity_id);

-- Append-only ledger: the only source of truth for how XP was ever gained or
-- lost. Written exclusively by complete_quest() (and future penalty/reward
-- functions) via the service_role.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid references public.quests (id) on delete set null,
  amount int not null check (amount <> 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create index xp_events_user_id_created_at_idx on public.xp_events (user_id, created_at);
create index xp_events_quest_id_idx on public.xp_events (quest_id);

create or replace function public.prevent_xp_events_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'xp_events is append-only: % is not allowed', tg_op;
end;
$$;

create trigger xp_events_no_update
  before update on public.xp_events
  for each row
  execute function public.prevent_xp_events_mutation();

create trigger xp_events_no_delete
  before delete on public.xp_events
  for each row
  execute function public.prevent_xp_events_mutation();
