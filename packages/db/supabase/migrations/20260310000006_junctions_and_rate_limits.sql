create table public.user_titles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table public.user_challenges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  progress int not null default 0 check (progress >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, challenge_id)
);

create index user_challenges_user_id_idx on public.user_challenges (user_id);

-- Backs check_rate_limit() (see the rate-limit migration). No RLS policies
-- at all and no grants to anon/authenticated — entirely inaccessible to
-- clients, read or write; only service_role (via that function) touches it.
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_user_endpoint_created_at_idx
  on public.rate_limit_hits (user_id, endpoint, created_at);

alter table public.rate_limit_hits enable row level security;
