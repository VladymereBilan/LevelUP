-- Everything the app needs to render its first screen, in one round trip.
--
-- Opening the app used to cost the device seven separate requests: one to
-- /api/quests/generate, then six PostgREST queries issued straight from the
-- phone (profile, stats, streak, the quests' activities, their categories, and
-- the titles catalog joined with the user's unlocked set). Each of those is a
-- phone-to-region round trip, and they can't all be parallelised — the activity
-- and category lookups depend on the quest rows, and every one of them depends
-- on the profile. This collapses the read half into a single call, so the device
-- makes one request and waits for one latency.
--
-- A pure reader: `stable`, no writes. Quest generation stays in
-- generate_daily_quests, which the caller invokes first — this function reports
-- state, it doesn't create it. Nor does it decide anything: no game rule,
-- threshold or date arithmetic lives here. p_date is the user's LOCAL date,
-- resolved by the caller through @levelup/engine's getLocalDateString(now,
-- profile.timezone), exactly as generate_daily_quests expects it. Postgres could
-- compute that itself with AT TIME ZONE, and deliberately doesn't: the engine
-- owns date logic and has the tests for it, and a second implementation here
-- would be free to disagree with the first.
--
-- Key casing follows the shapes the mobile client already declares rather than
-- one convention throughout. `profile`/`stats`/`streak` are table rows, and stay
-- snake_case so they keep deserialising into the existing row types untouched;
-- `quests` and `titles` are joined projections that have always been camelCase
-- on the client (QuestBoardItem, TitleDisplay). Picking one casing would have
-- meant rewriting types across five screens for no behavioural gain.
--
-- `profile` is null when the row doesn't exist yet — the signup trigger runs
-- asynchronously relative to the client receiving its session, so the caller has
-- to treat a null profile as "not ready", not as "broken".
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
          'target', q.target,
          'difficulty', a.difficulty,
          'progress', q.progress,
          'status', q.status,
          'result', q.result
        )
        -- Ordered so the Quests tab's category grouping is stable between
        -- loads; the previous in-JS join inherited whatever order PostgREST
        -- happened to return.
        order by c.name, a.name, q.id
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
