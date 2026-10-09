# @levelup/db

Supabase schema, RLS policies, server-only Postgres functions, and the TS client/types consumed
by `apps/web`'s route handlers. Never imported from `apps/mobile` or any browser bundle —
everything here either needs the service-role key or is server-only Node code.

## Layout

```
supabase/
  config.toml                    Supabase CLI project config
  migrations/                     Sequential SQL migrations (schema, RLS, functions) — see below
src/
  database.types.ts               Database type — generated, see "Regenerating types"
  client.ts                        createServiceRoleClient()
  testing.ts                       Shared real-DB test helpers (exported as "@levelup/db/testing") —
                                    reachability/key-validation/remote-host-guard logic every
                                    real-DB suite in this repo uses, here and in apps/web
  seed.ts                          seedStarterTemplate(userId, templateId) — copies an
                                    @levelup/engine starter template into a user's own
                                    categories/activities
  cli/seed.ts                      CLI wrapper: `pnpm seed <userId> <templateId>`
  __tests__/rls.test.ts            RLS test suite (see "Running the real-DB tests")
  __tests__/rpc-privileges.test.ts Proves complete_quest/generate_daily_quests/check_rate_limit
                                    can't be called directly by an authenticated client
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

**This repo's dev environment doesn't have Docker**, so the migrations have never run against a
_local_ Postgres — only syntax-validated offline against `libpg_query` (via the `pglast` Python
package). They have, however, been applied to and verified against the hosted dev project (see
"Running the real-DB tests" below) — that's a real Postgres, just not a local one. Run
`supabase db reset` against a local instance too before trusting this schema there specifically.

## Regenerating `database.types.ts`

Generated from the real schema (not hand-authored — see the comment at the top of the file):

```bash
# against a linked hosted project:
npx supabase gen types typescript --project-id <ref> > src/database.types.ts

# or against a local instance (after `supabase start`):
npx supabase gen types typescript --local > src/database.types.ts
```

Regenerate after any migration change. `--project-id` worked in this repo's dev environment with
no `supabase login` / access token needed — apparently project-id mode doesn't require Management
API auth, just network access to the project. If that ever stops being true, `supabase login`
first.

## Seeding a user's starter template

```bash
pnpm --filter @levelup/db seed <userId> <templateId>   # templateId: tmpl-gym-starter | tmpl-student
```

Copies that `@levelup/engine` template's categories and activities as that user's own rows.
Templates aren't stored as ownerless rows in the database — every `categories`/`activities` row
has a required `user_id`, which is what lets RLS scope rows to their owner.

## Running the real-DB tests

Three suites run against a real Supabase — there's no way to verify Postgres's row-level
security, a server-only function's privileges, or a route handler's DB writes short of a real
Postgres + PostgREST:

| Suite                                     | Proves                                                                                                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/__tests__/rls.test.ts`               | The RLS policies actually block what they're meant to (see "The authority rule" above)                                                                                                                     |
| `src/__tests__/rpc-privileges.test.ts`    | `complete_quest`/`generate_daily_quests`/`check_rate_limit` can't be called directly over RPC by an authenticated client                                                                                   |
| `apps/web/app/.../complete/route.test.ts` | The full completion route end-to-end: normal completion, idempotent replay, cross-user rejection, level-up, the daily cap, and the Asia/Manila local-date boundary — see `apps/web`'s own test for details |

All three share `src/testing.ts` (exported as `@levelup/db/testing`) and follow the same policy:
**they only skip when `SUPABASE_URL` isn't set at all.** Once a URL is configured, anything else
wrong — the host unreachable, a rejected key, a missing opt-in for a non-local host — is a
**test failure**, not a silent skip. A configured-but-broken setup is a real problem and should
show up loudly, not get hidden behind "skipped". When a suite does skip, the message says exactly
which env var(s) are missing or empty (never their values).

```bash
# local (from packages/db, requires Docker):
npx supabase start
npx supabase db reset
pnpm --filter @levelup/db test              # rls + rpc-privileges
pnpm --filter @levelup/web test              # the route-handler suite

# hosted project:
# set SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY to the project's values
RLS_TEST_ALLOW_REMOTE=true pnpm --filter @levelup/db test
RLS_TEST_ALLOW_REMOTE=true pnpm --filter @levelup/web test
```

`RLS_TEST_ALLOW_REMOTE=true` is required for any non-local host (anything but `localhost`/
`127.0.0.1`/`::1`) — a deliberate safety guard, since these suites create and delete real
throwaway auth users (and rows) against whatever project `SUPABASE_URL` points at. The resolved
host is logged before that guard is even checked, so you always know what you were about to hit.

Before running anything, each suite validates the environment in this order:

1. **Reachability** (network-level only): a request to the project's auth health endpoint.
   _Any_ HTTP response — including a `401` — counts as reachable; only a thrown network error
   (DNS failure, connection refused, TLS error, timeout) means it isn't.
2. **Anon key**: a request to `/auth/v1/settings` (not `/rest/v1/` — that endpoint is
   `service_role`-only on some projects regardless of the anon key's validity, and any actual
   table would depend on that table's own RLS grants for `anon`; `/auth/v1/settings` validates
   the apikey alone). A non-2xx response fails the suite with the HTTP status — e.g. a rejected
   key (wrong project, rotated JWT secret, bad copy/paste) shows up as "anon key rejected: HTTP
   401", not a vague "unreachable".
3. **Service key**: a trivial admin call (`listUsers({ perPage: 1 })`). An error here fails the
   suite as "service key invalid".

Only past all three does a suite create test users/rows, and `afterAll` cleans them up (including
when a test fails). `rls.test.ts` asserts things like: a user can't read another user's profile;
no client can write `level`/`xp`/`rank`/`stats` or insert into `xp_events`; a user can update
their own quest's `progress` but not flip its `status` to `completed`; `titles` is readable by
any authenticated user but not writable; `user_challenges` can't be written by a client at all.

**Both packages auto-load root `.env.local`** (`vitest.setup.ts` in each — a ~15-line
dependency-free loader, mirrored in both so they behave identically). That means if you have
`.env.local` configured with a hosted project's credentials, a plain `pnpm test` from the repo
root will pick it up and attempt these suites too — correctly **failing**, not skipping, on the
remote-host guard until you set `RLS_TEST_ALLOW_REMOTE=true`. Two ways to live with that day to
day: pass the env var each time you deliberately want the real run (as shown above), or — once
you're genuinely comfortable with routine `pnpm test` runs hitting this project — add
`RLS_TEST_ALLOW_REMOTE=true` to your own `.env.local` (it's gitignored and personal) so it's
always on for you. A fresh clone with no `.env.local` at all still skips cleanly either way.

## Functions

| Function                                                            | Caller              | Purpose                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete_quest(...)`                                               | `service_role` only | Atomic completion writer — quest status + `xp_events` + `profiles` + `stats` + `streaks` in one transaction. Re-validates ownership/status and locks the quest row even though the route handler already checked. |
| `generate_daily_quests(user_id, date)`                              | `service_role` only | Creates pending quests from active (non-archived) activities whose schedule matches `date`. Idempotent via `ON CONFLICT DO NOTHING` on the quests unique constraint.                                              |
| `check_rate_limit(user_id, endpoint, max_requests, window_seconds)` | `service_role` only | Self-cleaning fixed-window-lookback rate limiter backed by `rate_limit_hits`.                                                                                                                                     |

All three `set search_path = ''` and fully qualify every reference, per standard `SECURITY
DEFINER` hardening guidance (an unqualified name inside a definer function resolves against
whatever search_path the _caller's session_ happens to have, which is attacker-influenced).
