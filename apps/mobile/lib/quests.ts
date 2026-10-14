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

export interface StreakSummary {
  current: number;
  longest: number;
  graceDaysUsed: number;
  lastCompletedDate: string | null;
}

export interface UnlockedTitle {
  id: string;
  name: string;
  description: string | null;
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
  /** The player's currently EQUIPPED title (profiles.title_id), if any — not necessarily
   * related to this completion. See `titlesUnlocked` for what was newly earned just now. */
  title: string | null;
  titlesUnlocked: UnlockedTitle[];
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
