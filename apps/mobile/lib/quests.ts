import type { ActivityTarget, QuestSource, Rank, Stat } from "@levelup/engine";
import { apiFetch } from "./api";

export interface QuestRow {
  id: string;
  activity_id: string;
  user_id: string;
  date: string;
  target: ActivityTarget;
  progress: number;
  status: "pending" | "completed" | "skipped";
  source: QuestSource | null;
  result: QuestCompleteResult | null;
  completed_at: string | null;
  created_at: string;
}

export interface GenerateQuestsResult {
  date: string;
  quests: QuestRow[];
}

/** Idempotent — safe to call every time the app opens. */
export function generateQuests(): Promise<GenerateQuestsResult> {
  return apiFetch<GenerateQuestsResult>("/api/quests/generate");
}

export interface StreakSummary {
  current: number;
  longest: number;
  graceDaysUsed: number;
  lastCompletedDate: string | null;
}

export interface QuestCompleteResult {
  questId: string;
  xpAwarded: number;
  level: number;
  xp: number;
  rank: Rank;
  leveledUp: boolean;
  levelsGained: number;
  rankedUp: boolean;
  stat: Stat;
  statValue: number;
  streak: StreakSummary;
  title: string | null;
}

export interface CompleteQuestInput {
  source?: Extract<QuestSource, "health" | "timer">;
  progress?: number;
}

/** Idempotent — replaying on an already-completed quest returns the same stored result. */
export function completeQuest(
  questId: string,
  input: CompleteQuestInput = {},
): Promise<QuestCompleteResult> {
  return apiFetch<QuestCompleteResult>(`/api/quests/${questId}/complete`, { body: input });
}
