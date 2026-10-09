/**
 * Game layer (FIXED): stats, XP curve, levels, ranks.
 * Activity layer (CUSTOMIZABLE): categories, activities, templates, quests.
 * See root CLAUDE.md for the full rule.
 */

export type Stat = "STR" | "AGI" | "VIT" | "INT" | "FOCUS";

export const STATS: readonly Stat[] = ["STR", "AGI", "VIT", "INT", "FOCUS"];

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export type MetricType = "checkbox" | "minutes" | "reps" | "sets_reps_weight";

export type Difficulty = "easy" | "normal" | "hard";

/** Where a quest completion signal came from. Drives the source XP multiplier. */
export type QuestSource = "health" | "timer" | "manual";

export type PenaltyType = "xp_loss" | "stat_decay" | "reward_lock";

/** A date-only ISO string, e.g. "2026-03-05". Never a full timestamp. */
export type DateString = string;

/** A full ISO-8601 timestamp, e.g. "2026-03-05T12:00:00.000Z". */
export type Timestamp = string;

export type StatBlock = Record<Stat, number>;

/** Discriminated union of an activity's target shape, keyed by metric type. */
export type ActivityTarget =
  | { type: "checkbox" }
  | { type: "minutes"; minutes: number }
  | { type: "reps"; reps: number }
  | { type: "sets_reps_weight"; sets: number; reps: number; weightKg?: number };

/** User-defined grouping that maps to exactly one fixed stat. */
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  stat: Stat;
}

/** A user-defined, recurring or one-off real-life action that awards XP. */
export interface Schedule {
  kind: "daily" | "weekdays" | "one_off";
  /** Required and only meaningful when kind === "weekdays". 0 = Sunday ... 6 = Saturday. */
  weekdays?: readonly number[];
  /** Required and only meaningful when kind === "one_off". */
  date?: DateString;
}

export interface Activity {
  id: string;
  categoryId: string;
  name: string;
  metricType: MetricType;
  target: ActivityTarget;
  schedule: Schedule;
  difficulty: Difficulty;
}

export interface CategoryTemplate extends Category {
  /** Marks this row as shipped with a starter template rather than user-created. */
  templateId: string;
}

export interface ActivityTemplate extends Activity {
  templateId: string;
}

/** A ready-made bundle (e.g. "Gym Starter", "Student") so new users never see a blank screen. */
export interface QuestTemplate {
  id: string;
  name: string;
  description: string;
  categories: CategoryTemplate[];
  activities: ActivityTemplate[];
}

/** A concrete, dated instance of an Activity that the player completes or skips. */
export interface Quest {
  id: string;
  activityId: string;
  date: DateString;
  status: "pending" | "completed" | "skipped";
  completedAt?: Timestamp;
  /** Raw progress toward the activity's target, in the target's unit. */
  progressValue?: number;
}

/** An immutable record of an XP change, positive (award) or negative (penalty). */
export interface XpEvent {
  id: string;
  questId: string | null;
  amount: number;
  reason: string;
  createdAt: Timestamp;
}

/** The player's level-up progress: current level and leftover XP within that level. */
export interface PlayerProgress {
  level: number;
  xp: number;
}

export interface StreakState {
  current: number;
  longest: number;
  lastCompletedDate: DateString | null;
  /** Grace/rest days already consumed since the current streak started. */
  graceDaysUsed: number;
}
