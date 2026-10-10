import type { Difficulty, MetricType, ActivityTarget, Stat } from "@levelup/engine";
import { supabase } from "./supabase";
import { generateQuests, type QuestCompleteResult, type QuestRow } from "./quests";

export interface QuestBoardItem {
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
  status: QuestRow["status"];
  result: QuestRow["result"];
}

export interface QuestBoard {
  date: string;
  items: QuestBoardItem[];
}

// Home and the Quests tab each call loadTodaysQuestBoard() on every focus
// (see their useFocusLoad usage), so bouncing between tabs can fire several
// calls within a couple of seconds — each one a round trip to the
// rate-limited /api/quests/generate endpoint (5 requests/60s). A short
// cache collapses those into one real request; invalidateQuestBoardCache()
// (called after any write that changes quest state) keeps it from ever
// serving stale data to a caller that just made a change.
const BOARD_CACHE_MS = 5000;
let cachedBoard: QuestBoard | null = null;
let cachedAt = 0;
let inFlightBoard: Promise<QuestBoard> | null = null;

export function invalidateQuestBoardCache(): void {
  cachedBoard = null;
  inFlightBoard = null;
}

/** Ensures today's quests exist (generateQuests is idempotent), then joins
 * them with their activity and category for display — quests/activities/
 * categories are three separate client-readable tables (no FK-embed typing
 * in this app's hand-authored MobileDatabase), so this joins them in JS. */
export function loadTodaysQuestBoard(): Promise<QuestBoard> {
  if (cachedBoard && Date.now() - cachedAt < BOARD_CACHE_MS) {
    return Promise.resolve(cachedBoard);
  }
  if (inFlightBoard) return inFlightBoard;

  inFlightBoard = fetchTodaysQuestBoard().then(
    (board) => {
      cachedBoard = board;
      cachedAt = Date.now();
      inFlightBoard = null;
      return board;
    },
    (err: unknown) => {
      inFlightBoard = null;
      throw err;
    },
  );
  return inFlightBoard;
}

async function fetchTodaysQuestBoard(): Promise<QuestBoard> {
  const { date, quests } = await generateQuests();
  if (quests.length === 0) {
    return { date, items: [] };
  }

  const activityIds = [...new Set(quests.map((q) => q.activity_id))];
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, category_id, name, metric_type, difficulty")
    .in("id", activityIds);
  if (activitiesError) throw new Error(activitiesError.message);

  const categoryIds = [...new Set((activities ?? []).map((a) => a.category_id))];
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, icon, color, stat")
    .in("id", categoryIds);
  if (categoriesError) throw new Error(categoriesError.message);

  const activityById = new Map((activities ?? []).map((a) => [a.id, a]));
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));

  const items: QuestBoardItem[] = [];
  for (const quest of quests) {
    const activity = activityById.get(quest.activity_id);
    if (!activity) continue;
    const category = categoryById.get(activity.category_id);
    if (!category) continue;

    items.push({
      questId: quest.id,
      activityId: activity.id,
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      stat: category.stat,
      title: activity.name,
      metricType: activity.metric_type,
      target: quest.target,
      difficulty: activity.difficulty,
      progress: quest.progress,
      status: quest.status,
      result: quest.result,
    });
  }

  return { date, items };
}

/** Fetches one quest with its activity/category joined, for the detail screen. */
export async function loadQuestDetail(questId: string): Promise<QuestBoardItem | null> {
  const { data: quest, error: questError } = await supabase
    .from("quests")
    .select("id, activity_id, target, progress, status, source, result")
    .eq("id", questId)
    .maybeSingle();
  if (questError) throw new Error(questError.message);
  if (!quest) return null;

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("id, category_id, name, metric_type, difficulty")
    .eq("id", quest.activity_id)
    .maybeSingle();
  if (activityError) throw new Error(activityError.message);
  if (!activity) return null;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, icon, color, stat")
    .eq("id", activity.category_id)
    .maybeSingle();
  if (categoryError) throw new Error(categoryError.message);
  if (!category) return null;

  return {
    questId: quest.id,
    activityId: activity.id,
    categoryId: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,
    stat: category.stat,
    title: activity.name,
    metricType: activity.metric_type,
    target: quest.target,
    difficulty: activity.difficulty,
    progress: quest.progress,
    status: quest.status,
    // The jsonb column's shape is only known by convention (what
    // complete_quest() constructs) — same narrowing pattern apps/web's
    // routes use for other CHECK-constrained/jsonb columns.
    result: quest.result as QuestCompleteResult | null,
  };
}

/** Writes only `progress` — the one column clients are granted direct write access to
 * (see the RLS migration's comment on `quests`). Completion is still server-only. */
export async function updateQuestProgress(questId: string, progress: number): Promise<void> {
  const { error } = await supabase.from("quests").update({ progress }).eq("id", questId);
  if (error) throw new Error(error.message);
  invalidateQuestBoardCache();
}
