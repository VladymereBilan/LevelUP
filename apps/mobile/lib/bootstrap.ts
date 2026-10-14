import { ApiError, apiFetch } from "./api";
import type { ProfileSummary } from "./profile";
import type { QuestBoardItem } from "./questBoard";
import type { StatsRow } from "./stats";
import type { StreakRow } from "./streaks";
import type { TitleDisplay } from "./titles";

/**
 * Everything the first screen needs, from one request to POST /api/bootstrap.
 *
 * Replaces what used to be seven: /api/quests/generate, then direct PostgREST
 * queries for the profile, stats, streak, the quests' activities, their
 * categories, and the titles catalog. Those were separate device-to-region
 * round trips and only partly parallelisable — the activity and category
 * lookups needed the quest rows first — so opening the app meant waiting out
 * several latencies in sequence.
 *
 * The item types are the existing ones on purpose: the server builds `quests`
 * in QuestBoardItem's shape and `titles` in TitleDisplay's, so every screen and
 * component that already renders them is unchanged.
 */
export interface BootstrapState {
  date: string;
  profile: ProfileSummary;
  stats: StatsRow;
  streak: StreakRow;
  quests: QuestBoardItem[];
  /** Every activity ever created, archived included — distinguishes "never added
   * one" (offer a starter template) from "none due today". */
  activityCount: number;
  titles: TitleDisplay[];
}

/** What the route can actually return: the row-shaped members are nullable
 * server-side, so they're checked here rather than assumed. */
interface BootstrapWire extends Omit<BootstrapState, "profile" | "stats" | "streak"> {
  profile: ProfileSummary | null;
  stats: StatsRow | null;
  streak: StreakRow | null;
}

// Home and the Quests tab both load on focus, so moving between them can fire
// several calls within a couple of seconds. A short cache collapses those into
// one real request, and the in-flight promise means two callers mounting at the
// same time share one. invalidateBootstrapCache() is called after any write
// that changes this state, so a caller that just made a change never reads a
// stale copy.
const CACHE_MS = 5000;
let cached: BootstrapState | null = null;
let cachedAt = 0;
let inFlight: Promise<BootstrapState> | null = null;

export function invalidateBootstrapCache(): void {
  cached = null;
  inFlight = null;
}

const PROFILE_RETRY_DELAYS_MS = [500, 1000];

export function loadBootstrap(): Promise<BootstrapState> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return Promise.resolve(cached);
  }
  if (inFlight) return inFlight;

  inFlight = fetchBootstrap().then(
    (state) => {
      cached = state;
      cachedAt = Date.now();
      inFlight = null;
      return state;
    },
    (err: unknown) => {
      inFlight = null;
      throw err;
    },
  );
  return inFlight;
}

/**
 * Retries a 404 a couple of times before giving up. The signup trigger that
 * creates the profile row runs server-side, asynchronously relative to the
 * client receiving its session, so the very first call after a brand-new
 * sign-in can legitimately beat it and the route answers 404. Same race, and
 * the same handling, as the direct profile fetch this replaces.
 */
async function fetchBootstrap(): Promise<BootstrapState> {
  for (let attempt = 0; ; attempt++) {
    try {
      return assertComplete(await apiFetch<BootstrapWire>("/api/bootstrap"));
    } catch (err) {
      const delay = PROFILE_RETRY_DELAYS_MS[attempt];
      const isMissingProfile = err instanceof ApiError && err.status === 404;
      if (!isMissingProfile || delay === undefined) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

function assertComplete(wire: BootstrapWire): BootstrapState {
  const { profile, stats, streak } = wire;
  if (!profile || !stats || !streak) {
    throw new Error("Your profile isn't ready yet. Pull to refresh in a moment.");
  }
  return { ...wire, profile, stats, streak };
}
