# @levelup/db

Supabase schema, RLS policies, server-only Postgres functions, and the TS client/types consumed
by `apps/web`'s route handlers. Never imported from `apps/mobile` or any browser bundle —
everything here either needs the service-role key or is server-only Node code.

## Layout

```
supabase/
  config.toml           Supabase CLI project config
  migrations/            Sequential SQL migrations (schema, RLS, functions) — see below
src/
  database.types.ts      Database type (hand-authored — see "Regenerating types")
  client.ts               createServiceRoleClient()
  seed.ts                 seedStarterTemplate(userId, templateId) — copies an @levelup/engine
                           starter template into a user's own categories/activities
  cli/seed.ts              CLI wrapper: `pnpm seed <userId> <templateId>`
  __tests__/rls.test.ts    RLS test suite (see "Running the RLS tests")
```

## The authority rule this schema enforces

Level, XP, rank, and stats are **never** writable by a client, directly or indirectly:
`profiles`, `stats`, `streaks`, and `xp_events` grant clients `SELECT` only — there is no
`INSERT`/`UPDATE`/`DELETE` policy for `authenticated` on any of them. The only way those values
change is through `complete_quest()`, a Postgres function whose `EXECUTE` privilege is granted to
`service_role` alone. `apps/web`'s route handler is the only code that ever calls it, and only
after verifying the caller's JWT itself.

Every table explicitly `REVOKE ALL ... FROM anon, authenticated` before granting back exactly
what's intended — see the comment at the top of `20260310000007_rls_policies.sql` for why that
matters even though RLS alone (zero policies for a command) already blocks it.

## Local development (needs Docker)

```bash
npx supabase start          # from packages/db — spins up local Postgres/Auth/Studio
npx supabase db reset       # applies every migration in supabase/migrations, fresh
```

`supabase start` prints the local `anon` and `service_role` keys and the API URL — put them in
your root `.env` (see `.env.example`) as `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

**This repo's dev environment doesn't have Docker**, so none of the SQL below has been executed
against a real Postgres — only syntax-validated offline against `libpg_query` (via the `pglast`
Python package, which exposes the real Postgres SQL and PL/pgSQL parsers without needing a
running server). Run `supabase db reset` yourself once Docker is available, before trusting this
schema in anything beyond local dev.

## Regenerating `database.types.ts`

It's hand-authored right now (see the comment at the top of the file for why). Once you have a
reachable Supabase, replace it for real:

```bash
# against a local instance (after `supabase start`):
npx supabase gen types typescript --local > src/database.types.ts

# or against a linked hosted project:
npx supabase gen types typescript --project-id <ref> > src/database.types.ts
```

## Seeding a user's starter template

```bash
pnpm --filter @levelup/db seed <userId> <templateId>   # templateId: tmpl-gym-starter | tmpl-student
```

Copies that `@levelup/engine` template's categories and activities as that user's own rows.
Templates aren't stored as ownerless rows in the database — every `categories`/`activities` row
has a required `user_id`, which is what lets RLS scope rows to their owner.

## Running the RLS tests

`src/__tests__/rls.test.ts` is a real integration test against a live Supabase — there's no way
to verify Postgres's row-level security short of running Postgres. It works against either a
local instance (`supabase start`) or a hosted project; it doesn't care which.

**It only skips when `SUPABASE_URL` isn't set at all.** Once a URL is configured, anything else
wrong — the host unreachable, a rejected key, a missing opt-in for a non-local host — is a
**test failure**, not a silent skip. A configured-but-broken setup is a real problem and should
show up loudly, not get hidden behind "skipped". When it does skip, the message says exactly
which env var(s) are missing or empty (never their values).

```bash
# local (from packages/db, requires Docker):
npx supabase start
npx supabase db reset
pnpm --filter @levelup/db test:rls

# hosted project:
# set SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY to the project's values
RLS_TEST_ALLOW_REMOTE=true pnpm --filter @levelup/db test:rls
```

`RLS_TEST_ALLOW_REMOTE=true` is required for any non-local host (anything but `localhost`/
`127.0.0.1`/`::1`) — a deliberate safety guard, since this suite creates and deletes real
throwaway auth users against whatever project `SUPABASE_URL` points at. The resolved host is
logged before that guard is even checked, so you always know what you were about to hit.

Before running anything, the suite validates the environment in this order:

1. **Reachability** (network-level only): a request to the project's auth health endpoint.
   _Any_ HTTP response — including a `401` — counts as reachable; only a thrown network error
   (DNS failure, connection refused, TLS error, timeout) means it isn't.
2. **Anon key**: a plain request to the PostgREST root endpoint. A non-2xx response fails the
   suite with the HTTP status — e.g. a rejected key (wrong project, rotated JWT secret, bad copy
   /paste) shows up as "anon key rejected: HTTP 401", not a vague "unreachable".
3. **Service key**: a trivial admin call (`listUsers({ perPage: 1 })`). An error here fails the
   suite as "service key invalid".

Only past all three does it create test users. It creates two throwaway auth users per test
(cleaned up in `afterAll`, including when a test fails), signs in as each via the anon key, and
asserts things like: a user can't read another user's profile; no client can write
`level`/`xp`/`rank`/`stats` or insert into `xp_events`; a user can update their own quest's
`progress` but not flip its `status` to `completed`; `titles` is readable by any authenticated
user but not writable; `user_challenges` can't be written by a client at all.

## Functions

| Function                                                            | Caller              | Purpose                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete_quest(...)`                                               | `service_role` only | Atomic completion writer — quest status + `xp_events` + `profiles` + `stats` + `streaks` in one transaction. Re-validates ownership/status and locks the quest row even though the route handler already checked. |
| `generate_daily_quests(user_id, date)`                              | `service_role` only | Creates pending quests from active (non-archived) activities whose schedule matches `date`. Idempotent via `ON CONFLICT DO NOTHING` on the quests unique constraint.                                              |
| `check_rate_limit(user_id, endpoint, max_requests, window_seconds)` | `service_role` only | Self-cleaning fixed-window-lookback rate limiter backed by `rate_limit_hits`.                                                                                                                                     |

All three `set search_path = ''` and fully qualify every reference, per standard `SECURITY
DEFINER` hardening guidance (an unqualified name inside a definer function resolves against
whatever search_path the _caller's session_ happens to have, which is attacker-influenced).
