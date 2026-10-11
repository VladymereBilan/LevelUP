-- Adds "distance" (GPS run tracking) and "steps" (Health Connect) metric
-- types, alongside the existing checkbox/minutes/reps/sets_reps_weight —
-- see packages/engine/src/types.ts's MetricType and activityTargets.ts's
-- ceilings, which this mirrors server-side.

create or replace function public.is_valid_activity_target(target jsonb)
returns boolean
language sql
immutable
as $$
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
      when 'distance' then
        (target->>'meters')::numeric between 1 and 50000
      when 'steps' then
        (target->>'steps')::numeric between 1 and 50000
      else false
    end,
    false
  );
$$;

alter table public.activities
  drop constraint activities_metric_type_check,
  add constraint activities_metric_type_check
    check (metric_type in ('checkbox', 'minutes', 'reps', 'sets_reps_weight', 'distance', 'steps'));
