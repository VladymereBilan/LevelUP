# Continuation prompt — LEVEL UP

Paste this into a new session.

---

Continuing work on LEVEL UP (F:\LevelUP). Read CLAUDE.md first — it was updated 2026-10-15
and now describes the bootstrap read path, the XP source rule, and what the mobile tests
actually cover.

## Where things stand

- `main` is at `f3c32fd`, CI green. **v6 (versionCode 6, commit 4115f95) is built, tested on
  my device, and good.** Production Supabase is up to date (migration `20260310000019`).
- Vercel Functions run in `hnd1`, co-located with Supabase in `ap-northeast-1`.
  `/api/health` went from a 981ms median to 252ms. Cold start is fixed.
- 12 testers on the Closed testing "Alpha" track. The 14-day production-access clock is
  running — don't do anything that could reset it.
- Docker IS available here. Local Supabase: `npx supabase start` then `npx supabase db reset`
  from `packages/db`. To run the real-DB suites, export `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` pointed at `127.0.0.1:54321` before `pnpm test` — the root
  `.env.local` points at PRODUCTION and the suites refuse to run against it.

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
2. **Five tabs → three.** Home and Quests overlap heavily (Home renders "2 of 5 completed"
   then a button to Quests); Challenges folds into Stats. Verified safe: notifications carry
   only text and `+native-intent` handles one path, so no routing coupling. Moves whole
   screens, so device-test it.
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
- **`eas submit` fails** with a generic Play Store error; v4, v5 and v6 were all uploaded by
  hand. Leading hypothesis: the closed track's real API id isn't `alpha`. To check, open the
  Closed testing track in Play Console and read the track id out of the browser URL, then fix
  `eas.json`'s submit config.
- **`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are scoped to both
  `production` and `preview`** on Vercel, with deployment protection off — so every branch
  push builds a publicly reachable deployment holding the production service-role key.
  `docs/PRODUCTION.md` says they should be production-only. Narrow them.
- Categories can be created inline but never edited or deleted (FK is `on delete cascade`, so
  deletion needs a UX decision, not a button).
- `computeNewlyUnlockedTitles` reads every `xp_events` row per completion; also check the
  project's PostgREST `db-max-rows` (silent truncation past 1000).
- `check_rate_limit` prunes `rate_limit_hits` globally rather than per-endpoint.
- The challenge catalog is seeded through Dec 31 2026 and has no rotation mechanism.
- No scheduled re-check of title unlocks — only on completion or `backfill-titles`.
