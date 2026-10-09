-- Extensions and shared helper functions used by later migrations' CHECK
-- constraints. Kept schema-qualified and dependency-free so this file can
-- run first.

create extension if not exists pgcrypto;

-- Validates an ActivityTarget JSON value (the discriminated union defined in
-- @levelup/engine's types.ts) against the same safe ceilings enforced by
-- @levelup/engine's activityTargets.ts (MAX_MINUTES_TARGET, MAX_REPS_TARGET,
-- MAX_SETS_TARGET, MAX_WEIGHT_KG). Shared by both activities.target_value and
-- quests.target so the rule is defined once.
create or replace function public.is_valid_activity_target(target jsonb)
returns boolean
language sql
immutable
as $$
  -- coalesce(..., false): a missing/malformed field (e.g. target_value has
  -- type "minutes" but no "minutes" key) makes the comparison NULL, and a
  -- NULL inside a CHECK constraint passes silently — explicitly fail instead.
  select coalesce(
    case target->>'type'
      when 'checkbox' then true
      when 'minutes' then
        (target->>'minutes')::numeric between 1 and 180
      when 'reps' then
        (target->>'reps')::numeric between 1 and 500
      when 'sets_reps_weight' then
        (target->>'sets')::numeric between 1 and 20
        and (target->>'reps')::numeric between 1 and 500
        and (
          target->'weightKg' is null
          or (target->>'weightKg')::numeric between 0 and 300
        )
      else false
    end,
    false
  );
$$;
