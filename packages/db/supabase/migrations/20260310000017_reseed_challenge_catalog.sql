-- The challenge catalog had no rotation: 20260310000014 seeded three rows whose
-- starts_at/ends_at were fixed at `now()` the moment that migration was applied, so the
-- weekly one ran out roughly a week later and nothing replaced it. This seeds a real
-- schedule — eight consecutive weekly challenges plus two monthly ones — so the Challenges
-- tab keeps a live challenge in it without anyone hand-editing rows every week.
--
-- This is a bounded stopgap, not the rotation mechanism the catalog eventually wants: the
-- schedule below runs out eight weeks after this is applied, and the "no admin tooling to
-- retire old challenges or seed new ones on a schedule" gap in CLAUDE.md stays open until
-- something generates windows on an ongoing basis (pg_cron isn't enabled on this project —
-- only pgcrypto is — so that needs either a new extension or an external scheduler, and
-- either is a bigger decision than this file).
--
-- Deliberately insert-only. challenges is the parent of user_challenges with ON DELETE
-- CASCADE, so deleting a retired challenge would take any player's record of it with it; a
-- player who finished one should keep seeing it in the Completed tab. Expired rows aging
-- into that tab is the intended end state, not something to clean up.
--
-- Windows are anchored to Monday 00:00 UTC via date_trunc, so a week here is a predictable
-- calendar week rather than an offset from whenever this happened to be applied — which is
-- exactly what went wrong the first time. Progress is counted by apps/web's
-- GET /api/challenges against quests.completed_at, a timestamptz, so a player whose local
-- week is shifted from UTC sees a window shifted by their offset; for a cosmetic progress
-- counter with no reward attached yet, that's not worth per-user window math.

-- challenges has no uniqueness at all today, so re-applying any seed silently duplicates
-- every row. (name, starts_at) is the natural key for a scheduled catalog — the same
-- challenge name recurring in a later window is legitimate, the same name in the same window
-- is not — and it's what lets the inserts below be safely re-runnable.
alter table public.challenges
  add constraint challenges_name_starts_at_unique unique (name, starts_at);

-- reward_xp doubles as the tier shown on the card (apps/mobile's challengeTier(): <= 800
-- reads WEEKLY, 801-1500 MONTHLY, > 1500 ELITE), so these values are chosen to land in the
-- band matching each challenge's actual duration, not just to feel generous.
with weekly_schedule (week_offset, name, description, stat, target_value, reward_xp) as (
  values
    (0, 'Seven Day Surge', 'Complete seven quests before the week is out.', null::text, 7, 600),
    (1, 'Iron Week', 'Complete five Strength quests this week.', 'STR', 5, 650),
    (2, 'Steady Mind', 'Complete five Intellect quests this week.', 'INT', 5, 650),
    (3, 'Breath and Pace', 'Complete five Vitality quests this week.', 'VIT', 5, 650),
    (4, 'Ten Before Sunday', 'Ten quests, seven days. Pace yourself.', null::text, 10, 800),
    (5, 'Quick Feet', 'Complete five Agility quests this week.', 'AGI', 5, 650),
    (6, 'Deep Work Stretch', 'Complete six Focus quests this week.', 'FOCUS', 6, 700),
    (7, 'The Long Haul', 'Twelve quests in a single week. No excuses.', null::text, 12, 800)
)
insert into public.challenges (
  name, description, stat, starts_at, ends_at, target_value, reward_xp
)
select
  s.name,
  s.description,
  s.stat,
  w.week_start,
  -- One second short of the next window's start, so consecutive weeks never both contain the
  -- same instant (GET /api/challenges treats ends_at as inclusive).
  w.week_start + interval '7 days' - interval '1 second',
  s.target_value,
  s.reward_xp
from weekly_schedule s
cross join lateral (
  select
    (date_trunc('week', (now() at time zone 'UTC')) at time zone 'UTC')
      + (s.week_offset || ' weeks')::interval as week_start
) w
on conflict (name, starts_at) do nothing;

-- Two monthly challenges anchored to calendar month boundaries. These deliberately overlap
-- the weekly ones above (and 'Mind Over Matter' from the original seed, which runs ~30 days
-- from when that migration was applied): more than one active challenge at a time is the
-- point, not a conflict.
with monthly_schedule (month_offset, name, description, stat, target_value, reward_xp) as (
  values
    (1, 'Pillars of Five', 'Complete forty quests across the month.', null::text, 40, 1200),
    (2, 'The Unbroken Month', 'Complete fifty quests across the month.', null::text, 50, 1500)
)
insert into public.challenges (
  name, description, stat, starts_at, ends_at, target_value, reward_xp
)
select
  s.name,
  s.description,
  s.stat,
  m.month_start,
  m.month_start + interval '1 month' - interval '1 second',
  s.target_value,
  s.reward_xp
from monthly_schedule s
cross join lateral (
  select
    (date_trunc('month', (now() at time zone 'UTC')) at time zone 'UTC')
      + (s.month_offset || ' months')::interval as month_start
) m
on conflict (name, starts_at) do nothing;
