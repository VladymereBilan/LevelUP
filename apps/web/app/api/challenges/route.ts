import type { Stat } from "@levelup/engine";
import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "challenges.list", maxRequests: 20, windowSeconds: 60 };

export type ChallengeStatus = "upcoming" | "active" | "completed" | "failed";

export interface ChallengeResponseRow {
  id: string;
  name: string;
  description: string | null;
  stat: Stat | null;
  targetValue: number;
  rewardXp: number;
  startsAt: string;
  endsAt: string;
  progress: number;
  status: ChallengeStatus;
}

/**
 * Lists the challenge catalog with the caller's own progress — display
 * only. user_challenges is server-only to write (see the RLS migration),
 * but nothing writes it yet, so rather than depend on a join/progress flow
 * that doesn't exist, progress here is computed fresh each call: a count of
 * the caller's own completed quests inside [starts_at, ends_at] whose
 * activity's category stat matches the challenge's `stat` (any stat, if
 * `stat` is null). Three flat selects + an in-memory join, same pattern
 * apps/mobile's questBoard.ts uses for the same reason (quests/activities/
 * categories have no FK-embed typing set up for this).
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const { data: challenges, error: challengesError } = await supabase
    .from("challenges")
    .select("id, name, description, stat, starts_at, ends_at, target_value, reward_xp")
    .order("starts_at", { ascending: true });
  if (challengesError) {
    return Response.json({ error: challengesError.message }, { status: 500 });
  }

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, category_id")
    .eq("user_id", userId);
  if (activitiesError) {
    return Response.json({ error: activitiesError.message }, { status: 500 });
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, stat")
    .eq("user_id", userId);
  if (categoriesError) {
    return Response.json({ error: categoriesError.message }, { status: 500 });
  }

  const { data: completedQuests, error: questsError } = await supabase
    .from("quests")
    .select("activity_id, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("completed_at", "is", null);
  if (questsError) {
    return Response.json({ error: questsError.message }, { status: 500 });
  }

  const categoryStatById = new Map((categories ?? []).map((c) => [c.id, c.stat as Stat]));
  const activityCategoryById = new Map((activities ?? []).map((a) => [a.id, a.category_id]));

  const completions = (completedQuests ?? []).flatMap((quest) => {
    if (!quest.completed_at) return [];
    const categoryId = activityCategoryById.get(quest.activity_id);
    const stat = categoryId ? (categoryStatById.get(categoryId) ?? null) : null;
    return [{ completedAtMs: new Date(quest.completed_at).getTime(), stat }];
  });

  const nowMs = Date.now();

  const result: ChallengeResponseRow[] = (challenges ?? []).map((challenge) => {
    const startsAtMs = new Date(challenge.starts_at).getTime();
    const endsAtMs = new Date(challenge.ends_at).getTime();
    const challengeStat = challenge.stat as Stat | null;

    const upcoming = nowMs < startsAtMs;
    const progress = upcoming
      ? 0
      : completions.filter(
          (c) =>
            c.completedAtMs >= startsAtMs &&
            c.completedAtMs <= endsAtMs &&
            (challengeStat === null || c.stat === challengeStat),
        ).length;

    const met = progress >= challenge.target_value;
    const status: ChallengeStatus = upcoming
      ? "upcoming"
      : met
        ? "completed"
        : nowMs <= endsAtMs
          ? "active"
          : "failed";

    return {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      stat: challengeStat,
      targetValue: challenge.target_value,
      rewardXp: challenge.reward_xp,
      startsAt: challenge.starts_at,
      endsAt: challenge.ends_at,
      progress,
      status,
    };
  });

  return Response.json({ challenges: result }, { status: 200 });
}
