# Schema

SQL migrations for the Supabase Postgres schema go here (e.g. `0001_init.sql`), applied with
the Supabase CLI. Tables will mirror the shared types in `@levelup/engine` (categories,
activities, quests, xp_events, player progress/stats) plus RLS policies scoping every row to
`auth.uid()`. Not implemented yet — this phase only ships the engine.
