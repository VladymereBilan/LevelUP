-- Hunter names must be unique (case-insensitively) and fit a safe display
-- format once a player picks their own during onboarding. The
-- handle_new_user() trigger's auto-generated default ("player_<uuid
-- prefix>") already satisfies both; this only starts mattering once
-- POST /api/onboarding/username lets a player choose one.

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,20}$');

create unique index profiles_username_lower_unique
  on public.profiles (lower(username));
