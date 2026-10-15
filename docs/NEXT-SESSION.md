# Continuation prompt — LEVEL UP

Paste this into a new session.

---

Continuing work on LEVEL UP (F:\LevelUP). Read CLAUDE.md first — it was updated 2026-10-16
and now describes the three-tab navigation, the UI and copy fixes, the Health Connect steps
sync, the category editor, and the move from Vitest to Jest for the mobile suite (which is
what makes component rendering testable at all).

## Where things stand

- `main` is at `f750961` and pushed to origin. **v7 (versionCode 7, version name 1.1.0) is
  built and was uploaded to the Closed testing "Alpha" track by hand on 2026-10-16.** It was
  device-tested clean against preview build `96c5aece` before the production build ran.
  Production Supabase is up to date (migration `20260310000019`); v7 needed no migration.
- The mobile suite is **Jest (`jest-expo`), not Vitest** — 102 tests, including real render
  tests. `pnpm --filter @levelup/mobile test`. Everything else in the monorepo is still
  Vitest. See CLAUDE.md for the two RNTL gotchas that cost time (async `render`/`fireEvent`,
  and `screen` resolving to a different module instance than `render`).
- Vercel Functions run in `hnd1`, co-located with Supabase in `ap-northeast-1`.
  `/api/health` went from a 981ms median to 252ms. Cold start is fixed.
- 12 testers on the Closed testing "Alpha" track. The 14-day production-access clock is
  running — don't do anything that could reset it.
- Docker IS available here. Local Supabase: `npx supabase start` then `npx supabase db reset`
  from `packages/db`. To run the real-DB suites, export `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` pointed at `127.0.0.1:54321` before `pnpm test` — the root
  `.env.local` points at PRODUCTION and the suites refuse to run against it.

## Two traps that cost time on 2026-10-16

An EAS build profile with no `environment` key gets **none** of the EXPO_PUBLIC_* values, and
`.env.local` is gitignored so it never reaches EAS. The `preview` profile was missing it, and
a preview build would have launched straight into "Missing EXPO_PUBLIC_API_URL" looking like a
code regression. Fixed in `eas.json`; check this first if any build launches to an error
screen.

Making a value typeable makes its control wider. Two Steppers sat side by side in the
reminder-time row and fitted only while the value was a bare label; once it became a field,
the pair overflowed the card and clipped one control off-screen. `expo export` and every static check
passed. Layout regressions need a device or an arithmetic budget test.

## Verify by exit code, not by tailing output

`pnpm lint | tail -3` hid a real lint failure in this project once, because turbo prints a
success-looking summary after the error. Use `cmd >/dev/null 2>&1; echo $?`.

## Next up, roughly in order

1. **Local-first cache.** The biggest remaining perf win: render Home from disk in <300ms and
   revalidate in the background. Needs a new native module — only `expo-secure-store` is
   installed, and it's Keystore-backed and too slow for this. `react-native-mmkv` (sync reads,
   so it can hydrate before first paint) plus TanStack Query with a persister is the shape.
   **This is the one item `expo export` cannot validate** — a native misconfiguration only
   shows at runtime, so it needs a device pass before it goes anywhere near the Alpha track.
   It also replaces `lib/useFocusLoad.ts` and the hand-rolled cache in `lib/bootstrap.ts`.
2. **Play Store screenshots are wrong and block production access.** Every current
   screenshot shows the old five-tab bottom bar, and two of those tabs no longer exist as
   destinations. Google reviews the listing when production access is applied for, and a
   listing that misrepresents the app is a real rejection reason. Retake from the shipped
   build: Home with a full board, a quest detail, Stats (Progress), Stats (Challenges), Add
   Activity, Profile. **Do this before applying for production access.**

3. **Typed `Text` design system.** The font floor was raised but the hierarchy is thin — 111
   of ~210 text sites share the `label` tier. Needs `Text` variants, a spacing scale, and
   `Card`/`Section`/`Screen` primitives. Touches every text site again, so don't bundle it
   with anything else visual.
4. **Version string.** `app/(app)/profile/index.tsx` hardcodes `LEVEL UP · VERSION 1.0.0`, so
   v4, v5 and v6 are indistinguishable in-app and a bug report can't be tied to a build. Bump
   `app.json` and read it from `expo-constants`. Ten minutes, needs a build.
5. **Skeletons for the rest.** Only Home and the Quests tab have them; Stats, Challenges,
   Profile and the activity screens still show a centred spinner. Each wants one shaped like
   its own layout.

## Decisions already made — don't re-litigate without a reason

- **Optimistic quest completion was considered and dropped.** It was designed to hide >1s of
  latency; completions are now ~300ms. The client also cannot compute the daily XP cap, so a
  predicted award would be wrong exactly near the ceiling and would visibly correct downward.
  The tap haptic (the part that mattered) is done.
- **A routine is a category.** Don't add a `routines` table — "Push Day" with five activities
  in it already works. The one real limitation: a category maps to exactly one stat, so a
  mixed-stat routine ("Morning routine" = stretching/AGI + journaling/FOCUS) can't be one
  category. That's the only case that would justify a new grouping concept, and only once
  someone actually wants one.
- **Activity order is creation order,** not a `sort_order` column. Drag-to-reorder needs its
  own column and UI; creation order got the common case for free.
- **Game rules live in `@levelup/engine`, never in SQL.** `get_home_state` takes the local
  date as a parameter rather than deriving it with `AT TIME ZONE`, specifically so a second
  implementation can't disagree with the one that has tests.

## Known gaps worth fixing when convenient

- **The daily XP cap is not atomic.** Concurrent completions each read the same pre-write
  total, so a burst can reach ~760 against a 500 cap. Self-correcting, and with no leaderboard
  it buys nothing. Designed fix in CLAUDE.md: a `reserve_daily_xp(user, local_date, amount,
cap)` RPC doing an atomic upsert-and-return before the route computes level/rank.
- **`eas submit` fails** with a generic Play Store error; v4 through v7 were all uploaded by
  hand. **The old "the track id isn't `alpha`" hypothesis is wrong and was disproved on
  2026-10-16** — the track is Play's default closed track, whose API name is literally
  `alpha`, and the number in the Play Console URL is an internal console id with no bearing
  on the API. The actual cause is almost certainly that **no Google Play service account is
  configured**: `eas.json`'s submit block has no `serviceAccountKeyPath`, and nothing has been
  uploaded to EAS either, so `eas submit` has no way to authenticate to the publishing API.
  Fix: Play Console → Developer account → API access (account level, owner only), create a
  service account with release permissions, then `eas credentials` to upload its JSON. Keep
  that JSON out of the repo — the pre-commit hook only looks for `eyJ...` and `sb_secret_`,
  so it would not catch a Google service-account key.
- **`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are scoped to both
  `production` and `preview`** on Vercel, with deployment protection off — so every branch
  push builds a publicly reachable deployment holding the production service-role key.
  `docs/PRODUCTION.md` says they should be production-only. Narrow them.
- Categories can now be renamed/restyled (`quests/categories/[id].tsx`) but still not
  deleted: the FK is `on delete cascade`, so deleting one would silently take its activities
  and their quest history. Needs a decision about where the activities go, not a button.
- **Nothing in the schema stops two categories sharing a name.** Both the create form and the
  edit screen guard in the client only. The real fix is a unique index on
  `(user_id, lower(name))`, which is blocked: production already holds duplicate rows, so the
  index cannot be created until they are merged, and there is no merge tool.
- **A typed entry's origin is in-memory only.** A hand-typed number pays the `manual` rate for
  the session it was typed in, but nothing persists _how_ progress reached its stored value,
  so a reloaded part-done minutes or distance quest is treated as device-measured again.
  Closing it needs the origin stored on `quests`, which means a migration.
- `computeNewlyUnlockedTitles` reads every `xp_events` row per completion; also check the
  project's PostgREST `db-max-rows` (silent truncation past 1000).
- `check_rate_limit` prunes `rate_limit_hits` globally rather than per-endpoint.
- The challenge catalog is seeded through Dec 31 2026 and has no rotation mechanism.
- No scheduled re-check of title unlocks — only on completion or `backfill-titles`.
