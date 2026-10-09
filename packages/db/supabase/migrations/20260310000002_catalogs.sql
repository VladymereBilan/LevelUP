-- Catalog tables: admin-seeded, shared across all users. No user_id column,
-- no client writes (see the RLS migration) — only service_role (or a human
-- via the dashboard/SQL) populates these.

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  -- Freeform description of how it's earned, e.g. {"type": "rank", "value": "S"}.
  -- Not enforced by the schema; interpreted by application/admin tooling.
  unlock_rule jsonb,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  stat text check (stat in ('STR', 'AGI', 'VIT', 'INT', 'FOCUS')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_value int not null check (target_value > 0),
  reward_xp int not null default 0 check (reward_xp >= 0),
  created_at timestamptz not null default now(),
  constraint challenges_ends_after_starts check (ends_at > starts_at)
);

create index challenges_starts_at_ends_at_idx on public.challenges (starts_at, ends_at);
