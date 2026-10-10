import {
  applyStatGain,
  awardXp,
  calcQuestXp,
  calcStatGain,
  capDailyXp,
  DEFAULT_DAILY_XP_CAP,
  getLocalDateString,
  getRank,
  recordStreakCompletion,
  type Difficulty,
  type QuestSource,
  type Stat,
} from "@levelup/engine";
import { computeNewlyUnlockedTitles } from "@levelup/db";
import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "quests.complete", maxRequests: 20, windowSeconds: 60 };

// Streak grace: one missed day is tolerated before the streak resets. See
// @levelup/engine's recordStreakCompletion for the mechanic itself.
const STREAK_GRACE_DAYS = 1;

interface ActivityTarget {
  type: "checkbox" | "minutes" | "reps" | "sets_reps_weight";
  minutes?: number;
  reps?: number;
  sets?: number;
}

function defaultProgressFor(target: ActivityTarget): number {
  switch (target.type) {
    case "checkbox":
      return 1;
    case "minutes":
      return target.minutes ?? 0;
    case "reps":
      return target.reps ?? 0;
    case "sets_reps_weight":
      return target.sets ?? 0;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const { id: questId } = await params;

  const body: unknown = await request.json().catch(() => ({}));
  const bodyRecord =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const source: QuestSource =
    bodyRecord.source === "health" || bodyRecord.source === "timer" ? bodyRecord.source : "manual";
  const requestedProgress =
    typeof bodyRecord.progress === "number" ? bodyRecord.progress : undefined;

  const { data: quest, error: questError } = await supabase
    .from("quests")
    .select("id, user_id, activity_id, status, target, result")
    .eq("id", questId)
    .maybeSingle();

  if (questError || !quest || quest.user_id !== userId) {
    // Same 404 whether the quest doesn't exist or belongs to someone else —
    // don't leak which.
    return Response.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.status === "completed") {
    // Idempotent replay: same result, 200, no recomputation.
    return Response.json(quest.result, { status: 200 });
  }
  if (quest.status !== "pending") {
    return Response.json({ error: `Quest is ${quest.status}, cannot complete` }, { status: 409 });
  }

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("difficulty, category_id")
    .eq("id", quest.activity_id)
    .maybeSingle();
  if (activityError || !activity) {
    return Response.json({ error: "Quest's activity no longer exists" }, { status: 409 });
  }
  const difficulty = activity.difficulty as Difficulty;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("stat")
    .eq("id", activity.category_id)
    .maybeSingle();
  if (categoryError || !category) {
    return Response.json({ error: "Quest's category no longer exists" }, { status: 409 });
  }
  const stat = category.stat as Stat;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("level, xp, rank, timezone")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: stats, error: statsError } = await supabase
    .from("stats")
    .select("str, agi, vit, int, focus")
    .eq("user_id", userId)
    .single();
  if (statsError || !stats) {
    return Response.json({ error: "Stats not found" }, { status: 404 });
  }

  const { data: streak, error: streakError } = await supabase
    .from("streaks")
    .select("current, longest, last_completed_date, grace_days_used")
    .eq("user_id", userId)
    .single();
  if (streakError || !streak) {
    return Response.json({ error: "Streak not found" }, { status: 404 });
  }

  const now = new Date();
  const localDate = getLocalDateString(now, profile.timezone);

  const newStreak = recordStreakCompletion(
    {
      current: streak.current,
      longest: streak.longest,
      lastCompletedDate: streak.last_completed_date,
      graceDaysUsed: streak.grace_days_used,
    },
    localDate,
    STREAK_GRACE_DAYS,
  );

  const rawXp = calcQuestXp({ difficulty, source, streakDays: newStreak.current });

  // Sum today's (the user's LOCAL today, not the server's UTC day) XP
  // events for the daily cap. A 36h lookback window comfortably covers any
  // timezone offset (max ±14h) either side of "today", then each row is
  // bucketed by its own local date via the same getLocalDateString used
  // above — never a naive UTC slice.
  const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const { data: recentXpEvents, error: recentXpError } = await supabase
    .from("xp_events")
    .select("amount, created_at")
    .eq("user_id", userId)
    .gte("created_at", windowStart);
  if (recentXpError) {
    return Response.json({ error: "Failed to load XP history" }, { status: 500 });
  }
  const xpEarnedToday = (recentXpEvents ?? [])
    .filter(
      (event) => getLocalDateString(new Date(event.created_at), profile.timezone) === localDate,
    )
    .reduce((sum, event) => sum + event.amount, 0);

  const xpAwarded = capDailyXp(rawXp, xpEarnedToday, DEFAULT_DAILY_XP_CAP);

  const awardResult = awardXp({ level: profile.level, xp: profile.xp }, xpAwarded);
  const newRank = getRank(awardResult.progress.level);
  const rankedUp = newRank !== profile.rank;

  const statGain = calcStatGain(difficulty);
  const newStats = applyStatGain(
    { STR: stats.str, AGI: stats.agi, VIT: stats.vit, INT: stats.int, FOCUS: stats.focus },
    stat,
    statGain,
  );

  const progress =
    requestedProgress ?? defaultProgressFor(quest.target as unknown as ActivityTarget);

  let titlesUnlocked: { id: string; name: string; description: string | null }[];
  try {
    titlesUnlocked = await computeNewlyUnlockedTitles(
      supabase,
      userId,
      {
        level: awardResult.progress.level,
        rank: newRank,
        longestStreak: newStreak.longest,
        stats: newStats,
      },
      { xp: xpAwarded, completedQuestStat: stat },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to evaluate titles" },
      { status: 500 },
    );
  }

  const { data: result, error: completeError } = await supabase.rpc("complete_quest", {
    p_quest_id: questId,
    p_user_id: userId,
    p_progress: progress,
    p_source: source,
    p_xp_awarded: xpAwarded,
    p_reason: `quest:${difficulty}:${source}`,
    p_new_level: awardResult.progress.level,
    p_new_xp: awardResult.progress.xp,
    p_new_rank: newRank,
    p_leveled_up: awardResult.leveledUp,
    p_levels_gained: awardResult.levelsGained,
    p_ranked_up: rankedUp,
    p_stat: stat,
    p_new_stat_value: newStats[stat],
    p_new_streak_current: newStreak.current,
    p_new_streak_longest: newStreak.longest,
    // recordStreakCompletion always sets this to a real date (the type is
    // nullable only because a brand-new StreakState starts out that way);
    // the `?? localDate` fallback keeps that true for the type checker too.
    p_new_streak_last_date: newStreak.lastCompletedDate ?? localDate,
    p_new_streak_grace_used: newStreak.graceDaysUsed,
    p_titles_unlocked: titlesUnlocked,
  });

  if (completeError || !result) {
    // Most likely: a race lost to another request completing the same
    // quest between our read above and this call — complete_quest()
    // re-validates status itself and raises if it's no longer pending.
    return Response.json(
      { error: completeError?.message ?? "Failed to complete quest" },
      { status: 409 },
    );
  }

  return Response.json(result, { status: 200 });
}
