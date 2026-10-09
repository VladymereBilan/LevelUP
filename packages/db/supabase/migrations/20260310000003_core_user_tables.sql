-- Core per-user tables. The server (via the service_role-only functions
-- added in later migrations) is the sole source of truth for level, xp,
-- rank, and stats — see the RLS migration for the matching read-only grants.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  level int not null default 1 check (level >= 1),
  xp int not null default 0 check (xp >= 0),
  rank text not null default 'E' check (rank in ('E', 'D', 'C', 'B', 'A', 'S')),
  title_id uuid references public.titles (id) on delete set null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  str int not null default 0 check (str >= 0),
  agi int not null default 0 check (agi >= 0),
  vit int not null default 0 check (vit >= 0),
  int int not null default 0 check (int >= 0),
  focus int not null default 0 check (focus >= 0)
);

create table public.streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current int not null default 0 check (current >= 0),
  longest int not null default 0 check (longest >= 0),
  last_completed_date date,
  grace_days_used int not null default 0 check (grace_days_used >= 0)
);

-- Creates a profile + stats + streaks row for every new auth user. Runs as
-- the function owner (not the signing-up client), which is what lets it
-- write rows that RLS otherwise blocks clients from writing directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 'player_' || substr(new.id::text, 1, 8))
  );

  insert into public.stats (user_id) values (new.id);
  insert into public.streaks (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
