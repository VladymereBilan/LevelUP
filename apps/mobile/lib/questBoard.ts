import type { Difficulty, MetricType, ActivityTarget, Stat } from "@levelup/engine";
import { supabase } from "./supabase";
import { generateQuests, type QuestRow } from "./quests";

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

/**
 * Ensures today's quests exist (generateQuests is idempotent), then joins
 * them with their activity and category for display — quests/activities/
 * categories are three separate client-readable tables (no FK-embed typing
 * in this app's hand-authored MobileDatabase), so this joins them in JS.
 */
export async function loadTodaysQuestBoard(): Promise<QuestBoard> {
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
