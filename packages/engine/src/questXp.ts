import type { Difficulty, QuestSource } from "./types";

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

/** Computes the raw XP a completed quest is worth, before any daily cap is applied. */
export function calcQuestXp(input: CalcQuestXpInput): number {
  const { difficulty, source, streakDays, baseXp = BASE_QUEST_XP } = input;
  if (streakDays < 0) {
    throw new RangeError(`streakDays must be >= 0, got ${streakDays}`);
  }

  const streakBonus = Math.min(streakDays * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
  const amount =
    baseXp * DIFFICULTY_MULTIPLIERS[difficulty] * SOURCE_MULTIPLIERS[source] * (1 + streakBonus);

  return Math.round(amount);
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
