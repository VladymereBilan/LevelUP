import { evaluateTitleRules, type Rank, type Stat, type StatBlock } from "@levelup/engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface QuestStatBreakdown {
  totalCompleted: number;
  completedByStat: StatBlock;
}

/** Counts a user's completed quests overall and per category stat — three flat selects + an
 * in-memory join (quests/activities/categories have no FK-embed typing set up for this; see
 * apps/web's GET /api/challenges, which computes a similar breakdown for the same reason). */
export async function getQuestStatBreakdown(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<QuestStatBreakdown> {
  const [activitiesResult, categoriesResult, questsResult] = await Promise.all([
    supabase.from("activities").select("id, category_id").eq("user_id", userId),
    supabase.from("categories").select("id, stat").eq("user_id", userId),
    supabase.from("quests").select("activity_id").eq("user_id", userId).eq("status", "completed"),
  ]);

  if (activitiesResult.error) throw new Error(activitiesResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (questsResult.error) throw new Error(questsResult.error.message);

  const categoryStatById = new Map(
    (categoriesResult.data ?? []).map((c) => [c.id, c.stat as Stat]),
  );
  const activityCategoryById = new Map(
    (activitiesResult.data ?? []).map((a) => [a.id, a.category_id]),
  );

  const completedByStat: StatBlock = { STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 };
  let totalCompleted = 0;

  for (const quest of questsResult.data ?? []) {
    totalCompleted += 1;
    const categoryId = activityCategoryById.get(quest.activity_id);
    const stat = categoryId ? categoryStatById.get(categoryId) : undefined;
    if (stat) completedByStat[stat] += 1;
  }

  return { totalCompleted, completedByStat };
}

export interface UnlockedTitle {
  id: string;
  name: string;
  description: string | null;
}

/** The post-completion (or, for a backfill, current) values a title rule might check against
 * — everything except the lifetime totals and per-stat quest counts, which this computes
 * itself from the DB so callers never have to assemble them by hand. */
export interface TitleUnlockSnapshot {
  level: number;
  rank: Rank;
  longestStreak: number;
  stats: StatBlock;
}

/**
 * Computes which titles a user has newly earned, given a snapshot of their level/rank/streak/
 * stats. Lifetime XP and completed-quest counts (overall and per stat) are read fresh from
 * the DB here — `extraXp`/`extraCompletedQuestStat` let a caller mid-transaction (the
 * completion route) add in a not-yet-written quest/xp_events row, since those don't exist in
 * the DB yet at the point this runs. A backfill run (nothing extra happening) just omits them.
 *
 * Pure evaluation (which titles are "newly satisfied") is @levelup/engine's
 * evaluateTitleRules — this only assembles its input from the DB and already-owned titles.
 * Never writes anything; the caller decides what to do with the result (complete_quest's
 * p_titles_unlocked, or a direct user_titles insert for a backfill).
 */
export async function computeNewlyUnlockedTitles(
  supabase: SupabaseClient<Database>,
  userId: string,
  snapshot: TitleUnlockSnapshot,
  extra: { xp?: number; completedQuestStat?: Stat } = {},
): Promise<UnlockedTitle[]> {
  const [breakdown, xpResult, titlesResult, userTitlesResult] = await Promise.all([
    getQuestStatBreakdown(supabase, userId),
    supabase.from("xp_events").select("amount").eq("user_id", userId),
    supabase.from("titles").select("id, name, description, unlock_rule"),
    supabase.from("user_titles").select("title_id").eq("user_id", userId),
  ]);

  if (xpResult.error) throw new Error(xpResult.error.message);
  if (titlesResult.error) throw new Error(titlesResult.error.message);
  if (userTitlesResult.error) throw new Error(userTitlesResult.error.message);

  const totalXp =
    (xpResult.data ?? []).reduce((sum, row) => sum + row.amount, 0) + (extra.xp ?? 0);

  const questsCompletedByStat = { ...breakdown.completedByStat };
  let totalQuestsCompleted = breakdown.totalCompleted;
  if (extra.completedQuestStat) {
    questsCompletedByStat[extra.completedQuestStat] += 1;
    totalQuestsCompleted += 1;
  }

  const unlockedIds = new Set((userTitlesResult.data ?? []).map((row) => row.title_id));
  const catalog = (titlesResult.data ?? []).map((title) => ({
    id: title.id,
    unlockRule: title.unlock_rule,
    alreadyUnlocked: unlockedIds.has(title.id),
  }));

  const newlyEarnedIds = new Set(
    evaluateTitleRules(
      {
        level: snapshot.level,
        rank: snapshot.rank,
        longestStreak: snapshot.longestStreak,
        totalXp,
        totalQuestsCompleted,
        stats: snapshot.stats,
        questsCompletedByStat,
      },
      catalog,
    ),
  );

  return (titlesResult.data ?? [])
    .filter((title) => newlyEarnedIds.has(title.id))
    .map((title) => ({ id: title.id, name: title.name, description: title.description }));
}
