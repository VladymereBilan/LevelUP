# LEVEL UP

A gamified habit tracker. Real-life activities (gym, studying, coding, etc.) become quests that
award XP, raise stats, and increase the user's level and rank. Inspired by the general idea of
RPG leveling systems — all names, copy, and visuals are original; nothing is copied from any
specific existing franchise.

## The one rule that governs every design decision

**The game layer is FIXED. The activity layer is USER-DEFINED.**

- **Fixed** (defined in `packages/engine`, never user-configurable): the 5 stats (STR, AGI, VIT,
  INT, FOCUS), the XP curve, levels, and the E/D/C/B/A/S rank thresholds.
- **Customizable** (user- or template-defined data, validated by the engine): Categories (name,
  color, icon, which stat they feed), Activities (metric type, target value, schedule,
  difficulty), and Quests (dated instances of an activity).
- New users never see a blank screen: starter `QuestTemplate`s ("Gym Starter", "Student") ship
  pre-built categories and activities they can adopt as-is or edit.

When adding a feature, ask which side of this line it's on. Game-layer logic goes in
`packages/engine` and must stay universal (no category- or template-specific branching).
Activity-layer logic operates on data and must stay generic (no hardcoded stat/category names
outside of template definitions).

## Architecture

pnpm + Turborepo monorepo.

```
apps/
  mobile/   Expo (React Native) + TypeScript + Expo Router — the player-facing app
  web/      Next.js (App Router) on Vercel — landing page + API routes (backend logic lives here
            once it exists; the server is the eventual source of truth for XP)
packages/
  engine/   Pure TypeScript, zero runtime dependencies. The XP/level/rank/streak/penalty rules
            and the shared domain types. Imported by both apps and apps/web's server routes.
  db/       Supabase Postgres schema + RLS (packages/db/supabase/migrations/), the
            service-role client, hand-authored DB types, and the starter-template seed script.
            See packages/db/README.md.
```

Google Sign-In (planned, not yet implemented): via a Google Cloud project, wired into
`apps/web`'s and `apps/mobile`'s auth layers once built.

### `packages/engine`

The heart of the app. Every function that mutates game state is pure and takes `now`/the current
date as an explicit parameter — no hidden `Date.now()` calls — so the same logic is deterministic
or test. This also means it can be ported server-side later without changes, which matters because
the server will eventually be the source of truth for XP (so a client can never just submit an
arbitrary XP value).

- `xp.ts` — `xpToNext(level)`, `awardXp(state, amount)` (multi-level-up with XP carryover),
  `getRank(level)`.
- `questXp.ts` — `calcQuestXp({ difficulty, source, streakDays })` (difficulty × source × capped
  streak-bonus multipliers) and `capDailyXp(...)` (the daily XP cap, to prevent abuse).
- `stats.ts` — `applyStatGain(stats, stat, amount)`, floored at 0.
- `streaks.ts` — streak increment/reset and an optional rest-day grace mechanic, all driven by
  explicit ISO date strings, never wall-clock time.
- `penalties.ts` — missed-quest penalties. **Always non-physical**: XP loss, stat decay, or a
  locked reward. Never prescribe exercise, or anything physical, as a punishment. Do not add a
  penalty type that violates this.
- `activityTargets.ts` — safe ceilings on activity targets (minutes/reps/sets/weight) so a quest
  can never be configured to encourage extreme exercise or sleep deprivation, however it's set up.
- `templates.ts` — the shipped starter `QuestTemplate`s.
- `types.ts` — the shared domain types (`Category`, `Activity`, `QuestTemplate`, `Quest`,
  `MetricType`, `Difficulty`, `Stat`, `Rank`, `XpEvent`, ...), re-exported from `index.ts`.

Consumed as source, no build step: `package.json` points `main`/`types`/`exports` straight at
`src/index.ts`. Both Metro (mobile) and Next.js (web, via `transpilePackages`) compile it
themselves. Keep internal imports within the package extension-less (`from "./types"`, not
`"./types.js"`) — Metro's resolver doesn't do TypeScript's `.js`-maps-to-`.ts` trick, and
extension-less resolves correctly everywhere (tsc, Vitest, Next, Metro).

### Server-authoritative state (`packages/db`, `apps/web`)

Level, XP, rank, and stats are **never** writable by a client, directly or indirectly.
`profiles`/`stats`/`streaks`/`xp_events` grant `authenticated` `SELECT` only — there is no
`INSERT`/`UPDATE`/`DELETE` policy on any of them for a client role. The only way those values
change is through `complete_quest()`, a Postgres function whose `EXECUTE` is granted to
`service_role` alone, called by `apps/web`'s `POST /api/quests/[id]/complete` route handler after
it verifies the caller's JWT itself. That route is also where `@levelup/engine` actually runs
(`recordStreakCompletion` → `calcQuestXp` → `capDailyXp` → `awardXp` → `getRank` →
`calcStatGain`/`applyStatGain`) — the Postgres function is a thin, atomic writer for
already-computed values, not where game rules live.

Every table in `packages/db/supabase/migrations/` explicitly `REVOKE ALL` before granting back
exactly what's intended, rather than relying on Supabase's platform-default table grants — see
the comment at the top of the RLS migration.

Streak logic, the daily XP cap, and quest dates all use the user's **local** date
(`getLocalDateString(now, profile.timezone)` from `@levelup/engine`), never the server's UTC day
— a naive UTC date would misclassify completions near local midnight.

## Conventions

- Strict TypeScript everywhere, `@typescript-eslint/no-explicit-any` is an error, not a warning.
  No `any`. No implicit type-safety escape hatches.
- No comments explaining _what_ code does — names should do that. Comments only for non-obvious
  _why_ (a constraint, an invariant, a workaround).
- Don't add abstractions, config options, or error handling for cases that can't happen yet.
- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`.
- Package scope is `@levelup/*` (`@levelup/engine`, `@levelup/db`, `@levelup/mobile`,
  `@levelup/web`).
- A pre-commit hook (`.githooks/pre-commit`, zero dependencies) blocks commits containing a
  JWT-looking string (`eyJ...`) or a Supabase `sb_secret_...` key outside `.env`/`.env.local`/
  `.env.*.local` — `.env.example` is deliberately NOT exempt, since that's a tracked template
  meant to hold only blanks. Run `pnpm prepare` once after cloning to activate it (`pnpm install`
  should do this automatically via the `prepare` script, but pnpm doesn't reliably run it when
  there's no install work to do — `pnpm prepare` is the reliable fallback). Bypassable with
  `git commit --no-verify`; it's a safety net, not a guarantee.
- Theme: dark UI, violet `#7C3AED` + blue `#3B82F6` accents, glow effects. Notification copy is
  friendly and original (e.g. "New Quest Available") — never copied wording from any existing
  franchise.
- `.npmrc` sets `node-linker=hoisted` because Metro has trouble resolving pnpm's default
  symlinked `node_modules` in a monorepo. Workspace packages (e.g. `@levelup/engine`) are still
  symlinked into each consumer's `node_modules` regardless of this setting — only third-party
  dependency hoisting changes.
- `apps/web` and `apps/mobile` each own their own ESLint flat config (`eslint-config-next`,
  `eslint-config-expo`) because each framework has its own rule set; the root `eslint.config.js`
  covers `packages/*` and ignores `apps/*`.

## Commands

Run from the repo root (Turborepo fans these out to every package; cached where possible):

```bash
pnpm dev          # start mobile (Expo) and web (Next.js) dev servers
pnpm build        # production build (web only has a real build in Phase 0)
pnpm test         # run all test suites (packages/engine + packages/db; db's RLS suite
                  #   skips clearly if SUPABASE_URL isn't set — see its README)
pnpm lint         # eslint across every package
pnpm typecheck    # tsc --noEmit across every package (web runs `next typegen` first)
pnpm format       # prettier --write .
pnpm format:check # prettier --check .
```

Per-package, from the repo root: `pnpm --filter @levelup/engine test`, etc. Or `cd` into the
package and run its own `package.json` scripts directly.

## Backend

Supabase Postgres + Auth + RLS — schema and policies in `packages/db/supabase/migrations/`,
consumed via `packages/db`'s service-role client and `apps/web`'s route handlers. **Not yet
executed against a real Postgres**: this dev environment has no Docker, so the SQL is only
syntax-validated offline (via `libpg_query`/`pglast`), not run. Run `npx supabase start` +
`npx supabase db reset` from `packages/db` before trusting it beyond local dev — see
`packages/db/README.md` for the full local-dev, type-regeneration, seeding, and RLS-test-running
instructions. Google Sign-In (via a Google Cloud project) is still planned, not yet implemented.

## Current status and known gaps

Shipped so far: auth, onboarding (username + starter template), the daily quest board, quest
completion (progress, timer, checkbox, reps/sets), streaks/XP/stats/rank, and activity
management — creating categories/activities (`apps/mobile/lib/categories.ts`,
`lib/activities.ts`, the `ActivityForm` component), editing and archiving an activity
(`app/(app)/quests/activities/`), and reaching a starter template from the Quests tab's
zero-activities empty state, not just onboarding.

Known gaps, mobile:

- `apps/mobile/app/(app)/quests/[id].tsx`: `item.progress` is set into `localProgress` once on
  load and never kept in sync with it afterward. Currently harmless — nothing reads the stale
  `item.progress` value again after that first read — but worth fixing properly (or removing
  the now-pointless field) if this screen is touched again.
- Categories can be created (inline, while adding an activity) but not edited or deleted from
  the app yet — only activities have an edit/archive screen. A category with activities still
  pointing at it can't be deleted anyway (FK is `on delete cascade`, which would silently take
  the activities with it), so category deletion needs its own UX decision, not just a button.
- `apps/mobile` has no test runner yet (`package.json`'s `test` script is a placeholder) — the
  activity-management code above is covered by `pnpm typecheck`/`pnpm lint`/`expo export` and
  manual device testing, not unit tests.

Known gaps, backend:

- `packages/db`'s RLS suite (`rls.test.ts`, `rpc-privileges.test.ts`) and `apps/web`'s route
  tests that exercise real Supabase calls refuse to run against the hosted project unless
  `RLS_TEST_ALLOW_REMOTE=true` is set for that invocation (they create/delete real auth users
  and rows) — and this dev environment has no local Supabase (Docker) to point them at instead.
  `pnpm test` therefore only fully exercises `packages/engine` here; the rest needs
  `RLS_TEST_ALLOW_REMOTE=true pnpm test` run deliberately, or a local `supabase start`.
