import type { Difficulty, MetricType, QuestSource } from "./types";

/** Base XP awarded by a "normal" difficulty, "manual" source quest with no streak. */
export const BASE_QUEST_XP = 20;

export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1,
  hard: 1.5,
};

export const SOURCE_MULTIPLIERS: Record<QuestSource, number> = {
  health: 1.0,
  timer: 0.8,
  manual: 0.6,
};

/**
 * Which sources each metric type can legitimately produce evidence for.
 *
 * `timer` means a stopwatch ran, so only a minutes-based activity can claim it. `health`
 * means a device measured the work — GPS for distance, a health platform for steps — so
 * nothing else can. Everything can be reported by hand.
 *
 * A server resolving a completion cannot verify that a timer truly ran, but it can refuse a
 * claim that is impossible for the activity in question, which is what this is for: the
 * source multiplier is the difference between a tap and real effort, and a client (or a
 * hand-written request) should not be able to claim the richer multiplier on an activity that
 * could never have earned it.
 */
export const SOURCES_BY_METRIC_TYPE: Record<MetricType, readonly QuestSource[]> = {
  checkbox: ["manual"],
  minutes: ["manual", "timer"],
  reps: ["manual"],
  sets_reps_weight: ["manual"],
  distance: ["manual", "health"],
  steps: ["manual", "health"],
};

/** Whether `source` is a claim this metric type could ever honestly make. */
export function isSourcePossibleForMetric(metricType: MetricType, source: QuestSource): boolean {
  return SOURCES_BY_METRIC_TYPE[metricType].includes(source);
}

/** Streak bonus accrues per consecutive day, capped so it never dominates the award. */
export const STREAK_BONUS_PER_DAY = 0.025;
export const MAX_STREAK_BONUS = 0.25;

/** Default ceiling on total XP a player can earn in a single day, to prevent abuse. */
export const DEFAULT_DAILY_XP_CAP = 500;

export interface CalcQuestXpInput {
  difficulty: Difficulty;
  source: QuestSource;
  /** Consecutive completed days counting into today, including today. */
  streakDays: number;
  /** Override the base XP before multipliers; defaults to BASE_QUEST_XP. */
  baseXp?: number;
}

/** Every term that went into a quest's XP, so the UI can show a player *why* they earned what
 * they earned rather than an unexplained number. Returned by explainQuestXp. */
export interface QuestXpBreakdown {
  base: number;
  difficulty: Difficulty;
  difficultyMultiplier: number;
  source: QuestSource;
  sourceMultiplier: number;
  streakDays: number;
  /** Fractional bonus from the streak, already capped — 0.15 means +15%. */
  streakBonus: number;
  /** The same value calcQuestXp returns for this input. */
  total: number;
}

/**
 * Computes a quest's XP along with each term that produced it. calcQuestXp is defined in terms
 * of this, so a breakdown shown to a player can never disagree with the amount actually
 * awarded — the two cannot drift because there is only one calculation.
 */
export function explainQuestXp(input: CalcQuestXpInput): QuestXpBreakdown {
  const { difficulty, source, streakDays, baseXp = BASE_QUEST_XP } = input;
  if (streakDays < 0) {
    throw new RangeError(`streakDays must be >= 0, got ${streakDays}`);
  }

  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  const sourceMultiplier = SOURCE_MULTIPLIERS[source];
  const streakBonus = Math.min(streakDays * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);

  return {
    base: baseXp,
    difficulty,
    difficultyMultiplier,
    source,
    sourceMultiplier,
    streakDays,
    streakBonus,
    total: Math.round(baseXp * difficultyMultiplier * sourceMultiplier * (1 + streakBonus)),
  };
}

/** Computes the raw XP a completed quest is worth, before any daily cap is applied. */
export function calcQuestXp(input: CalcQuestXpInput): number {
  return explainQuestXp(input).total;
}

/**
 * Clamps a proposed XP award so the player's total for the day never exceeds
 * `dailyCap`. `xpEarnedToday` is the sum of XP already awarded today, before
 * this award.
 */
export function capDailyXp(
  proposedAmount: number,
  xpEarnedToday: number,
  dailyCap: number = DEFAULT_DAILY_XP_CAP,
): number {
  const remaining = dailyCap - xpEarnedToday;
  return Math.max(0, Math.min(proposedAmount, remaining));
}
