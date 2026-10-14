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

Reads go the other way round but follow the same split. `POST /api/bootstrap` is the one
request the app makes to draw its first screen: it runs `generate_daily_quests()`, then
`get_home_state()`, a `stable` server-only function that returns the profile, stats, streak,
today's board (quests already joined to their activity and category), an activity count, and the
titles catalog with this caller's unlocked state — as one jsonb document. It decides nothing: no
threshold, no game rule, and no date arithmetic. Before it, opening the app cost seven
device-to-region round trips, most of them unavoidably serial. `POST /api/quests/generate`
remains for builds already in the field.

A completion's `source` decides its XP multiplier (`health` 1.0, `timer` 0.8, `manual` 0.6),
and it describes what happened rather than how the activity is configured: the app claims a
bonus source only when recorded progress actually reaches the target (`sourceForCompletion`),
and the route downgrades any source the metric type could not have evidenced
(`isSourcePossibleForMetric`). Completing by hand always works and always counts — it just
pays the hand-logged rate, which is what the multipliers were for.

Streak logic, the daily XP cap, and quest dates all use the user's **local** date
(`getLocalDateString(now, profile.timezone)` from `@levelup/engine`), never the server's UTC day
— a naive UTC date would misclassify completions near local midnight. This is also why
`get_home_state()` takes the date as a parameter rather than deriving it: Postgres could do the
arithmetic with `AT TIME ZONE`, and a second implementation would be free to disagree with the
engine's, which is the one with the tests.

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
consumed via `packages/db`'s service-role client and `apps/web`'s route handlers. Applied and
live against the hosted project (see "Production" below). **Docker is available in this
environment**, so a new migration should be applied and exercised against a local Supabase
(`npx supabase start` then `npx supabase db reset`, from `packages/db`) before being pushed —
not merely syntax-validated offline, which is all that was possible for a long stretch when
there was no Docker here. See `packages/db/README.md` for the full local-dev,
type-regeneration, seeding, and test-running instructions. Google Sign-In (via a Google Cloud project) is still
planned, not yet implemented.

## Production

**The hosted Supabase project (`levelup-dev`, ref `vxtxwqdsickveyjvgcyu`) is PRODUCTION** —
it's what the real `apps/web` deployment and the EAS production build point at, not a dev/test
sandbox. Nothing automated touches it: every test suite and `npx supabase start`-based local
dev flow runs against a local Supabase instead (see `packages/db/README.md`'s "Production
safety" section for the two guards that enforce this). The only things that legitimately write
to it are the live app itself, a migration deliberately pushed there, or a CLI script run with
`CONFIRM_PRODUCTION_WRITE=true`. Full environment/env-var/incident reference:
`docs/PRODUCTION.md`.

## Current status and known gaps

Shipped so far: auth, onboarding (username + starter template), the daily quest board, quest
completion (progress, timer, checkbox, reps/sets), streaks/XP/stats/rank, activity management —
creating categories/activities (`apps/mobile/lib/categories.ts`, `lib/activities.ts`, the
`ActivityForm` component), editing and archiving an activity (`app/(app)/quests/activities/`),
and reaching a starter template from the Quests tab's zero-activities empty state, not just
onboarding — and the Stats tab (weekly XP bar chart, 5-stat radar chart, streak heatmap,
titles-unlocked row; `apps/mobile/lib/statsProgress.ts`, `lib/titles.ts`,
`components/{BarChart,RadarChart,Heatmap}.tsx`) and the Challenges tab
(`apps/mobile/lib/challenges.ts`, `app/(app)/challenges.tsx`), backed by a new
`GET /api/challenges` that computes each caller's own progress live rather than reading a
persisted value (see that route's own comment for why) — and title awarding: titles unlock
automatically inside `complete_quest()`'s transaction (which titles to award is computed by
the completion route via `@levelup/engine`'s `evaluateTitleRules` and `@levelup/db`'s
`computeNewlyUnlockedTitles`, same "engine decides, the DB function just writes" pattern as
everything else complete_quest does), surfaced in the completion response as
`titlesUnlocked` and shown in the level-up modal; equipping a title
(`POST /api/profile/title`, ownership-validated) is shown on Home under the hunter name.
`pnpm --filter @levelup/db backfill-titles <userId>` retroactively awards titles for progress
made before this shipped.

Also shipped since: distance (GPS-tracked, `lib/runTracking.ts`) and steps (Health Connect,
`lib/healthConnect.ts`) metric types, both completing with `source: "health"`; local
notifications (`lib/notifications.ts`) for a daily quest reminder and a streak-at-risk nudge,
no push server; original app branding (icon/adaptive-icon/splash, app name "LEVEL UP",
replacing Expo's starter-template defaults); `apps/web`'s `/privacy` and `/terms` pages, linked
from the app; and a rebuilt Profile tab (`app/(app)/profile/`) — hero (avatar, level, rank,
join date), quests/XP/streak tiles, equipped-title card linking into Stats, a rank-history list
derived client-side from the `xp_events` ledger (no new table — see `lib/rankHistory.ts`'s own
comment for the tradeoff against one), and Settings (daily-reminder toggle, links to
Notifications/Health Connect/Privacy/Terms, sign out). Also shipped: in-app account deletion —
`POST /api/account/delete` (JWT-verified, rate-limited, requires the typed confirmation
`"DELETE"` in the body), which deletes only the `auth.users` row via the service role and lets
the existing `on delete cascade` chain (through `profiles`) remove every other user-scoped
table; Profile's Danger Zone section + `components/DeleteAccountSheet.tsx` drive it from the
app, then sign out and clear local notifications/preferences (`lib/account.ts`). Required by
Google Play's data-deletion policy alongside `apps/web/app/delete-account`, a static page
(linked from `/privacy` and `/terms`) covering the same flow plus the email-request fallback
for someone who can't sign back in.

Shipped in v5 and v6 (2026-10-14/15), mostly performance and correctness:

- **Cold start.** Opening the app took roughly a minute. Two causes, both since fixed. The
  Vercel Functions ran in `iad1` while Supabase is in `ap-northeast-1`, so every route crossed
  the Pacific three or four times sequentially — `apps/web/vercel.json` pins them to `hnd1`,
  which took `/api/health` from a 981ms median to 252ms. And `OnboardingProvider` awaited two
  Vercel calls before the first frame, each with a 15s timeout and a swallowed error, so two
  stacked timeouts put 30s on screen before Home even mounted; the bootstrap is un-awaited now.
  `lib/bootTrace.ts` (opt-in via `EXPO_PUBLIC_BOOT_TRACE=1`, see the `measure` EAS profile)
  exists so the next change here is measured rather than argued.
- **`POST /api/bootstrap`** replaced seven device round trips with one — see the
  server-authoritative section above.
- **Auth** verifies the caller's JWT in-process via `getClaims` instead of asking the Auth
  server (`apps/web/lib/api/auth.ts`); `authenticateFresh` keeps the server check for account
  deletion alone, the one irreversible route.
- **XP source integrity** — see the server-authoritative section above. This closed a real
  hole: a distance quest paid the top multiplier in the game for never moving.
- **Legibility.** 78 pieces of text sat below 10px (41 at 9px). Everything is now on the
  `fontSizes` scale in `theme/tokens.ts`, floor 11.
- **Bottom sheets** no longer lock the app on dismiss — two effects in `BottomSheet.tsx` were
  cancelling each other's close animation, so the modal never unmounted and its backdrop
  covered a dead screen. It was reachable from the XP figure on every quest detail screen.
- **Activity notes** (500 chars) and **creation-order** quests within a category; the Quests
  tab shows per-category progress, so a category reads as the routine it is being used as.
- **The streak calendar** is week-aligned (7 weekday rows x 5 week columns) with a legend,
  replacing a flat 35-day run wrapped into rows of seven under left/right labels that
  described an axis it didn't have.

Known gaps, mobile:

- `apps/mobile/app/(app)/quests/[id].tsx`: `item.progress` is set into `localProgress` once on
  load and never kept in sync with it afterward. Currently harmless — nothing reads the stale
  `item.progress` value again after that first read — but worth fixing properly (or removing
  the now-pointless field) if this screen is touched again.
- Categories can be created (inline, while adding an activity) but not edited or deleted from
  the app yet — only activities have an edit/archive screen. A category with activities still
  pointing at it can't be deleted anyway (FK is `on delete cascade`, which would silently take
  the activities with it), so category deletion needs its own UX decision, not just a button.
- `apps/mobile` now has Vitest (`vitest.config.ts`, `lib/**/*.test.ts`, no DB or network —
  `lib/api` is mocked, because importing it reaches `lib/supabase`, which reads
  `EXPO_PUBLIC_*` at module scope and registers an AppState listener). Coverage is
  deliberately narrow: `lib/bootstrap.ts` (cache, dedupe, invalidation, the signup retry) and
  `lib/questFormat.ts` (which source a completion may claim). Everything else — every screen,
  every component, `lib/statsProgress.ts`, `lib/notifications.ts` — is still covered only by
  `pnpm typecheck`/`pnpm lint`/`expo export` and manual device testing. There is no React
  renderer here, so anything that renders or touches a native module is out of scope until one
  is added.

Known gaps, backend/game-rules:

- `packages/db`'s RLS suite (`rls.test.ts`, `rpc-privileges.test.ts`) and `apps/web`'s route
  tests that exercise real Supabase calls require `SUPABASE_URL` to resolve to a local Supabase
  instance — they fail loudly (not skip) against any other host, with no opt-in flag, because
  the hosted project is PRODUCTION (see "Production" below and `docs/PRODUCTION.md`) and these
  suites create/delete real auth users and rows. Docker IS available in this environment now,
  so the full suite does run here — `npx supabase start` then `npx supabase db reset` from
  `packages/db`, with `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` pointed at
  the local instance for the run (see `packages/db/README.md`). Earlier notes in this file and
  that README said there was no Docker; that is no longer true, and a new migration no longer
  has to ship on offline syntax-validation alone.
- **The daily XP cap is not atomic.** `POST /api/quests/[id]/complete` reads the day's XP
  total, clamps the award with `capDailyXp`, then writes — so concurrent completions all read
  the same pre-write total and each award in full. With the 20/60s rate limit that is roughly
  760 XP in one burst against a 500 cap; it self-corrects once the writes land, and no
  leaderboard exists for it to buy an advantage over, which is why it is documented rather
  than patched. A rate-limit tightening would only shrink it, not close it. The real fix is a
  `reserve_daily_xp(user, local_date, amount, cap)` RPC doing an atomic upsert-and-return of
  the granted amount before the route computes level/rank from it — the award has to be
  decided inside one transaction, and it can't be moved into `complete_quest()` because the
  level curve lives in the engine.
- **Whether a timer genuinely ran is not verifiable server-side.** The completion route
  downgrades a source a metric could never evidence (`SOURCES_BY_METRIC_TYPE`), and the app
  only claims `timer`/`health` once recorded progress actually meets the target — but a
  hand-written request can still claim `timer` on a minutes activity it never worked. Capped
  by the daily ceiling and, being a single-player self-report app, it buys nothing from
  anyone else. Real verification would need signed attestations from the health platform.
- **No title-unlocking mechanism evaluates existing titles automatically on a schedule** —
  only on quest completion (`complete_quest()`) or a manual backfill run. A title added to the
  catalog after a player already qualifies for it needs `backfill-titles` run for them (or
  their next completion) before it shows as unlocked; there's no cron re-checking everyone.
- **Challenge progress is computed, not persisted.** `GET /api/challenges` counts the caller's
  own completed quests in each challenge's `[starts_at, ends_at]` window, filtered by `stat` if
  set — correct and live, but `user_challenges` (join/progress/completion) is still entirely
  unwritten, same as when it shipped. A future "join a challenge" flow would need its own
  server-only writer, mirroring `complete_quest()`'s pattern.
- **The challenge catalog doesn't rotate.** The three seeded challenges have fixed
  `starts_at`/`ends_at` set relative to when that migration was applied — there's no admin
  tooling yet to retire old challenges or seed new ones on a schedule.

## Roadmap

Not yet started:

1. **Mobile type infra**: replace the hand-authored `MobileDatabase` type
   (`apps/mobile/lib/supabase.ts`) with Supabase-generated types, the same way `packages/db`
   already generates its own (see `packages/db/README.md`, including its warning about what
   the current CLI drops). The test-runner half of this is done — see "Known gaps, mobile"
   for what it does and doesn't cover.
2. **Google Sign-In** (via a Google Cloud project), wired into both apps' auth layers.

Shipped: notifications, Health Connect + GPS run tracking, original branding, `/privacy` +
`/terms`, the production decision itself (the hosted project _is_ production — see "Production"
above — rather than a separate project being stood up), production safety/keep-alive/backup
tooling (see `docs/PRODUCTION.md`), and in-app account deletion (Google Play requirement) with
its `apps/web/app/delete-account` companion page.
