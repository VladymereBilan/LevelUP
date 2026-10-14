import {
  getLocalDateString,
  type ActivityTarget,
  type Difficulty,
  type MetricType,
  type Rank,
  type Stat,
} from "@levelup/engine";
import { authenticate, enforceRateLimit } from "@/lib/api/auth";

/** One quest on today's board, with its activity and category already joined. */
export interface BootstrapQuest {
  questId: string;
  activityId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  stat: Stat;
  title: string;
  metricType: MetricType;
  target: ActivityTarget;
  difficulty: Difficulty;
  progress: number;
  status: "pending" | "completed" | "skipped";
  result: unknown | null;
}

/** A catalog title plus whether this caller has unlocked it. */
export interface BootstrapTitle {
  id: string;
  name: string;
  description: string | null;
  unlockRule: unknown;
  unlocked: boolean;
  unlockedAt: string | null;
}

/**
 * Mirrors what get_home_state builds — see its migration for why the row-shaped
 * members stay snake_case while the joined ones are camelCase.
 *
 * `profile`/`stats`/`streak` are nullable because the function reports them as
 * absent rather than failing; in practice this route 404s on a missing profile
 * before it ever calls the function.
 */
export interface BootstrapResponse {
  date: string;
  profile: {
    id: string;
    username: string;
    level: number;
    xp: number;
    rank: Rank;
    title_id: string | null;
    timezone: string;
    created_at: string;
  } | null;
  stats: {
    user_id: string;
    str: number;
    agi: number;
    vit: number;
    int: number;
    focus: number;
  } | null;
  streak: {
    user_id: string;
    current: number;
    longest: number;
    last_completed_date: string | null;
    grace_days_used: number;
  } | null;
  quests: BootstrapQuest[];
  /** Every activity the caller has ever created, archived included. */
  activityCount: number;
  titles: BootstrapTitle[];
}

// Higher than /api/quests/generate's 5/60s, which this effectively replaces for
// v5 clients. That limit was set when quest generation was its own call, and it
// was already tight: Home and the Quests tab each load on focus, so moving
// between them a few times could spend it and 429 a user who did nothing wrong.
// Opening the app is the most ordinary thing a client does, so the ceiling is
// here to stop a loop, not to ration normal use.
const RATE_LIMIT = { endpoint: "bootstrap", maxRequests: 30, windowSeconds: 60 };

/**
 * Everything the app needs to render its first screen, in one request.
 *
 * A cold open used to cost the device seven round trips: this route's
 * predecessor /api/quests/generate, plus six PostgREST queries issued straight
 * from the phone for the profile, stats, streak, the quests' activities, their
 * categories, and the titles catalog. They couldn't be fully parallelised —
 * the activity and category lookups need the quest rows first, and everything
 * needed the profile — so the device paid several serial latencies before
 * anything could be drawn. Now it pays one.
 *
 * POST rather than GET because it isn't purely a read: generate_daily_quests
 * creates today's quests if they don't exist yet. That call is idempotent (see
 * its migration), so retrying this route is always safe.
 *
 * /api/quests/generate is deliberately left in place. Released builds in the
 * field still call it, and they keep working.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  // Read for the timezone alone, which get_home_state then reads again as part
  // of the profile it returns. Deliberate: resolving the user's local date is
  // the engine's job (getLocalDateString has the tests for it), and the date is
  // an argument to both RPCs below — so it has to be known before either runs.
  // Postgres could do the arithmetic itself and save this hop; a second
  // implementation of date logic is a worse trade than one in-region read.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const localDate = getLocalDateString(new Date(), profile.timezone);

  const { error: generateError } = await supabase.rpc("generate_daily_quests", {
    p_user_id: userId,
    p_date: localDate,
  });
  if (generateError) {
    return Response.json({ error: generateError.message }, { status: 500 });
  }

  const { data: state, error: stateError } = await supabase.rpc("get_home_state", {
    p_user_id: userId,
    p_date: localDate,
  });
  if (stateError) {
    return Response.json({ error: stateError.message }, { status: 500 });
  }

  // get_home_state's return type is plain jsonb, so its shape is known by
  // contract rather than by the generated types — same narrowing the completion
  // route does for the jsonb it reads back.
  return Response.json(state as unknown as BootstrapResponse, { status: 200 });
}
