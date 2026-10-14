import type { Difficulty, MetricType, ActivityTarget, Stat } from "@levelup/engine";
import { supabase } from "./supabase";
import { invalidateBootstrapCache } from "./bootstrap";
import type { QuestCompleteResult, QuestRow } from "./quests";

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
  invalidateBootstrapCache();
}
