import { STATS, type Difficulty, type Stat, type StatBlock } from "./types";

export function createEmptyStats(): StatBlock {
  return { STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 };
}

/**
 * Returns a new stat block with `amount` added to `stat`, floored at 0.
 * `amount` may be negative (used by stat-decay penalties).
 */
export function applyStatGain(stats: StatBlock, stat: Stat, amount: number): StatBlock {
  return {
    ...stats,
    [stat]: Math.max(0, stats[stat] + amount),
  };
}

export function totalStatPoints(stats: StatBlock): number {
  return STATS.reduce((sum, stat) => sum + stats[stat], 0);
}

/** Stat points awarded for completing a quest of this difficulty. */
export const STAT_GAIN_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

export function calcStatGain(difficulty: Difficulty): number {
  return STAT_GAIN_BY_DIFFICULTY[difficulty];
}
