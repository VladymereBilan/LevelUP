-- Adds a free-text note to an activity, and orders a category's activities by when they
-- were added rather than alphabetically.
--
-- Both come from watching someone try to model a gym session. An activity carried only a
-- name, so "Bench Press 3x10 @ 60kg, rest 90s" or "Organic Chemistry, ch. 4" had nowhere to
-- go but the name itself; and a push day's exercises came back alphabetised, which is never
-- the order anyone performs them in.
--
-- notes is capped at 500 characters. The column is nullable and has no default: an activity
-- without a note is the normal case, not an activity with an empty one.
alter table public.activities
  add column if not exists notes text,
  add constraint activities_notes_length check (notes is null or char_length(notes) <= 500);

-- Replaced wholesale rather than patched: get_home_state now returns the note alongside the
-- rest of a quest's display data, so the detail screen needs no extra request for it. The
-- body below is 20260310000018's, with those two changes and nothing else.
create or replace function public.get_home_state(p_user_id uuid, p_date date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'date', p_date,

    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'level', p.level,
        'xp', p.xp,
        'rank', p.rank,
        'title_id', p.title_id,
        'timezone', p.timezone,
        'created_at', p.created_at
      )
      from public.profiles p
      where p.id = p_user_id
    ),

    'stats', (
      select jsonb_build_object(
        'user_id', s.user_id,
        'str', s.str,
        'agi', s.agi,
        'vit', s.vit,
        'int', s.int,
        'focus', s.focus
      )
      from public.stats s
      where s.user_id = p_user_id
    ),

    'streak', (
      select jsonb_build_object(
        'user_id', st.user_id,
        'current', st.current,
        'longest', st.longest,
        'last_completed_date', st.last_completed_date,
        'grace_days_used', st.grace_days_used
      )
      from public.streaks st
      where st.user_id = p_user_id
    ),

    -- Inner joins, matching what the client's in-JS join already did: a quest
    -- whose activity or category has gone is not renderable, so it's omitted
    -- rather than returned half-populated.
    'quests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'questId', q.id,
          'activityId', a.id,
          'categoryId', c.id,
          'categoryName', c.name,
          'categoryIcon', c.icon,
          'categoryColor', c.color,
          'stat', c.stat,
          'title', a.name,
          'metricType', a.metric_type,
          'notes', a.notes,
          'target', q.target,
          'difficulty', a.difficulty,
          'progress', q.progress,
          'status', q.status,
          'result', q.result
        )
        -- Within a category, oldest activity first — the order they were added,
        -- which for a workout is the order the player intends to do them in.
        -- Alphabetical (the previous rule) actively fought that: a warm-up named
        -- "Warm-up" sorted after the heavy set named "Bench Press". A real
        -- drag-to-reorder needs its own sort_order column and a UI to set it;
        -- creation order gets the common case for nothing.
        order by c.name, a.created_at, a.name, q.id
      )
      from public.quests q
      join public.activities a on a.id = q.activity_id
      join public.categories c on c.id = a.category_id
      where q.user_id = p_user_id
        and q.date = p_date
    ), '[]'::jsonb),

    -- Counts archived activities too, matching what the Quests tab needs it for:
    -- telling "has never added an activity" (offer the starter templates) apart
    -- from "has some, none of them due today" (offer nothing). Archiving your
    -- only activity is the second case, not the first.
    'activityCount', (
      select count(*)
      from public.activities a
      where a.user_id = p_user_id
    ),

    -- The whole catalog, each entry carrying this user's locked/unlocked state,
    -- so a locked title still renders with its requirement.
    'titles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'description', t.description,
          'unlockRule', t.unlock_rule,
          'unlocked', ut.title_id is not null,
          'unlockedAt', ut.unlocked_at
        )
        order by t.created_at
      )
      from public.titles t
      left join public.user_titles ut
        on ut.title_id = t.id
       and ut.user_id = p_user_id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_home_state from public, anon, authenticated;
grant execute on function public.get_home_state to service_role;
