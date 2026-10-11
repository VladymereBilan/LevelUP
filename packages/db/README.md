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
                                    reachability/key-validation/local-host-guard logic every
                                    real-DB suite in this repo uses, here and in apps/web
  host.ts                          isLocalSupabaseHost(url) — the one place "is this URL
                                    local" is defined; testing.ts and scriptGuard.ts both import it
  scriptGuard.ts                   assertScriptMayRun(label) — every CLI script that writes data
                                    calls this first; refuses a non-local host without
                                    CONFIRM_PRODUCTION_WRITE=true (see "Production safety" below)
  seed.ts                          seedStarterTemplate(userId, templateId) — copies an
                                    @levelup/engine starter template into a user's own
                                    categories/activities
  cli/seed.ts                      CLI wrapper: `pnpm seed <userId> <templateId>`
  titleAwarding.ts                 computeNewlyUnlockedTitles(...) — assembles a
                                    TitleEvaluationState from the DB and runs
                                    @levelup/engine's evaluateTitleRules; used by both
                                    apps/web's completion route and backfillTitles.ts
  backfillTitles.ts                backfillTitlesForUser(userId) — evaluates titles against a
                                    user's CURRENT profile/stats/streak and awards anything
                                    newly satisfied; safe to re-run
  cli/backfillTitles.ts            CLI wrapper: `pnpm backfill-titles <userId>`
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

## Production safety

**The hosted project (`levelup-dev`, ref `vxtxwqdsickveyjvgcyu`) is PRODUCTION** — see
`CLAUDE.md` and `docs/PRODUCTION.md`. All development and every automated test suite run
against a local Supabase instead (below). Two independent guards enforce this:

- **Test suites** (`src/testing.ts`'s `createVerifiedServiceRoleClient`): fail loudly — not
  skip — if `SUPABASE_URL` is set but isn't `localhost`/`127.0.0.1`/`::1`. There is no opt-in
  flag; these suites create and delete real auth users and rows, so there is no scenario where
  running them against production is something you'd actually want.
- **CLI scripts** (`seed`, `backfill-titles`, and any future one-off maintenance script, via
  `scriptGuard.ts`'s `assertScriptMayRun`): always print the target host first, and for a
  non-local host refuse unless `CONFIRM_PRODUCTION_WRITE=true` is explicitly set — these are
  legitimate to run against production occasionally (seeding a real new user's starter
  template, backfilling a real user's titles), just never by accident.

Both import the same `isLocalSupabaseHost` from `host.ts`, so "local" is defined in exactly one
place.

## Local development (needs Docker)

```bash
pnpm --filter @levelup/db db:start   # spins up local Postgres/Auth/Studio (or: npx supabase start, from packages/db)
pnpm --filter @levelup/db db:reset   # applies every migration in supabase/migrations, fresh
pnpm --filter @levelup/db db:stop    # tears the local stack down when you're done
```

`supabase start` prints the local `anon` and `service_role` keys and the API URL — put them in
your root `.env.local` (see `.env.example`) as `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. **Docker Desktop with the WSL2 backend is required on Windows** —
install Docker Desktop, enable "Use the WSL 2 based engine" in its settings, and ensure a WSL2
distro is installed (`wsl --install` from an elevated PowerShell if `wsl --status` reports it
isn't).

**This repo's dev environment doesn't have Docker**, so the migrations have never run against a
_local_ Postgres here — only syntax-validated offline against `libpg_query` (via the `pglast`
Python package). They have, however, been applied to and verified against the hosted project
when it was still being used as a dev/test target, before the production decision above — that
history doesn't change the current rule: nothing automated touches it anymore. Run
`supabase db reset` against a local instance before trusting this schema there.

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

Prints the target `SUPABASE_URL` host before doing anything. Against production
(`CONFIRM_PRODUCTION_WRITE=true` required — see "Production safety" above):

```bash
CONFIRM_PRODUCTION_WRITE=true pnpm --filter @levelup/db seed <userId> <templateId>
```

## Backfilling titles for an existing user

```bash
pnpm --filter @levelup/db backfill-titles <userId>
```

Titles are only ever awarded as a side effect of `complete_quest()` — there's no scheduled job
re-checking everyone's progress. This evaluates one user's _current_ profile/stats/streak
against the titles catalog and awards anything newly satisfied, for progress made before title
awarding existed (or before a new title was added to the catalog). Safe to re-run: it's a
no-op for a user with nothing new to award.

Same production guard as `seed` above — prints the host, requires `CONFIRM_PRODUCTION_WRITE=true`
for a non-local one.

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
wrong — a non-local host, the host unreachable, a rejected key — is a **test failure**, not a
silent skip. A configured-but-broken setup is a real problem and should show up loudly, not get
hidden behind "skipped". When a suite does skip, the message says exactly which env var(s) are
missing or empty (never their values).

```bash
# from packages/db, requires Docker:
npx supabase start
npx supabase db reset
pnpm --filter @levelup/db test              # rls + rpc-privileges
pnpm --filter @levelup/web test              # the route-handler suite
```

There is no hosted option. The hosted project is PRODUCTION (see "Production safety" above) —
these suites create and delete real throwaway auth users (and rows), so there is no flag that
lets them run against it; `SUPABASE_URL` must resolve to `localhost`/`127.0.0.1`/`::1` or the
suite fails immediately, host logged first so you always know what it was about to hit.

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
any authenticated user but not writable; neither `user_titles` nor `user_challenges` can be
written by a client at all.

**Both packages auto-load root `.env.local`** (`vitest.setup.ts` in each — a ~15-line
dependency-free loader, mirrored in both so they behave identically). Point it at your local
Supabase instance (the values `supabase start` prints) and a plain `pnpm test` from the repo
root just works. If `.env.local` is ever accidentally left pointing at the hosted project, `pnpm
test` **fails immediately** on the local-host guard rather than quietly running against
production — there's no flag to override that. A fresh clone with no `.env.local` at all skips
these suites cleanly instead.

## Functions

| Function                                                            | Caller              | Purpose                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete_quest(...)`                                               | `service_role` only | Atomic completion writer — quest status + `xp_events` + `profiles` + `stats` + `streaks` + `user_titles` in one transaction. Re-validates ownership/status and locks the quest row even though the route handler already checked. Which titles to award (if any) is computed by the route via `@levelup/db`'s `computeNewlyUnlockedTitles` and passed in as `p_titles_unlocked`. |
| `generate_daily_quests(user_id, date)`                              | `service_role` only | Creates pending quests from active (non-archived) activities whose schedule matches `date`. Idempotent via `ON CONFLICT DO NOTHING` on the quests unique constraint.                                                                                                                                                                                                             |
| `check_rate_limit(user_id, endpoint, max_requests, window_seconds)` | `service_role` only | Self-cleaning fixed-window-lookback rate limiter backed by `rate_limit_hits`.                                                                                                                                                                                                                                                                                                    |

All three `set search_path = ''` and fully qualify every reference, per standard `SECURITY
DEFINER` hardening guidance (an unqualified name inside a definer function resolves against
whatever search_path the _caller's session_ happens to have, which is attacker-influenced).
