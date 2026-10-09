import { STATS, type Stat, type StatBlock } from "./types";

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
