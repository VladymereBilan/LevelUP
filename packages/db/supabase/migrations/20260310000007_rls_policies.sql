-- Row Level Security for every table. `service_role` bypasses RLS entirely
-- (that's how the server-only functions in later migrations write level,
-- xp, rank, stats, and the xp_events ledger) — every policy below governs
-- only the `anon` and `authenticated` roles used by the mobile/web clients.
--
-- Each table starts with an explicit REVOKE, then GRANTs back exactly the
-- privileges its policies are meant to allow. Supabase's platform default
-- (`auto_expose_new_tables`) grants broad table-level privileges to `anon`/
-- `authenticated` on every new public table, and RLS alone — while it does
-- correctly block anything without a matching policy — is easy to reason
-- about wrong. Revoking first means the grants actually present are the
-- complete, intentional list, not "whatever the platform default left".

-- ---------------------------------------------------------------------------
-- profiles, stats, streaks, xp_events: server-authoritative. Read-only for
-- clients, no client writes under any circumstance.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

alter table public.stats enable row level security;
revoke all on public.stats from anon, authenticated;
grant select on public.stats to authenticated;

create policy stats_select_own
  on public.stats for select
  to authenticated
  using (user_id = auth.uid());

alter table public.streaks enable row level security;
revoke all on public.streaks from anon, authenticated;
grant select on public.streaks to authenticated;

create policy streaks_select_own
  on public.streaks for select
  to authenticated
  using (user_id = auth.uid());

alter table public.xp_events enable row level security;
revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;

create policy xp_events_select_own
  on public.xp_events for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- categories, activities: user-owned, full CRUD.
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;

create policy categories_select_own
  on public.categories for select
  to authenticated
  using (user_id = auth.uid());

create policy categories_insert_own
  on public.categories for insert
  to authenticated
  with check (user_id = auth.uid());

create policy categories_update_own
  on public.categories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy categories_delete_own
  on public.categories for delete
  to authenticated
  using (user_id = auth.uid());

alter table public.activities enable row level security;
revoke all on public.activities from anon, authenticated;
grant select, insert, update, delete on public.activities to authenticated;

create policy activities_select_own
  on public.activities for select
  to authenticated
  using (user_id = auth.uid());

create policy activities_insert_own
  on public.activities for insert
  to authenticated
  with check (user_id = auth.uid());

create policy activities_update_own
  on public.activities for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy activities_delete_own
  on public.activities for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- quests: users can read their own quests, create new pending ones, and
-- update their own `progress` — nothing else. Completion (status, result,
-- xp/stat/streak side effects) is server-only, via complete_quest().
-- ---------------------------------------------------------------------------

alter table public.quests enable row level security;
revoke all on public.quests from anon, authenticated;
grant select, insert on public.quests to authenticated;
-- Column-level grant: even a client that bypasses the policy logic below
-- cannot touch any column but `progress` — Postgres rejects the statement
-- at the privilege level before RLS is ever evaluated.
grant update (progress) on public.quests to authenticated;

create policy quests_select_own
  on public.quests for select
  to authenticated
  using (user_id = auth.uid());

create policy quests_insert_own_pending
  on public.quests for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy quests_update_own
  on public.quests for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- titles, challenges: admin-seeded catalogs, readable by any authenticated
-- user, never written by clients.
-- ---------------------------------------------------------------------------

alter table public.titles enable row level security;
revoke all on public.titles from anon, authenticated;
grant select on public.titles to authenticated;

create policy titles_select_all
  on public.titles for select
  to authenticated
  using (true);

alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

create policy challenges_select_all
  on public.challenges for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- user_titles, user_challenges: read-only for the owning user. Unlocking a
-- title and joining/progressing/completing a challenge are all
-- server-only — no client writes at all.
-- ---------------------------------------------------------------------------

alter table public.user_titles enable row level security;
revoke all on public.user_titles from anon, authenticated;
grant select on public.user_titles to authenticated;

create policy user_titles_select_own
  on public.user_titles for select
  to authenticated
  using (user_id = auth.uid());

alter table public.user_challenges enable row level security;
revoke all on public.user_challenges from anon, authenticated;
grant select on public.user_challenges to authenticated;

create policy user_challenges_select_own
  on public.user_challenges for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- rate_limit_hits: already RLS-enabled (prior migration). Explicitly revoke
-- here too, same as every other table — zero policies would already block
-- all client access on its own, but this removes any dependence on that
-- being the reason. No policies, no grants: completely inaccessible to
-- anon/authenticated.
-- ---------------------------------------------------------------------------

revoke all on public.rate_limit_hits from anon, authenticated;
