import type { PlayerProgress, Rank } from "./types";

/** XP required to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level < 1) {
    throw new RangeError(`level must be >= 1, got ${level}`);
  }
  return Math.round(100 * Math.pow(level, 1.5));
}

export interface AwardXpResult {
  progress: PlayerProgress;
  leveledUp: boolean;
  levelsGained: number;
}

/**
 * Applies an XP award to the player's progress, handling multi-level-ups in
 * one call and carrying over any leftover XP into the new level.
 */
export function awardXp(state: PlayerProgress, amount: number): AwardXpResult {
  if (amount < 0) {
    throw new RangeError(`amount must be >= 0, got ${amount}`);
  }

  let level = state.level;
  let xp = state.xp + amount;
  let levelsGained = 0;

  let threshold = xpToNext(level);
  while (xp >= threshold) {
    xp -= threshold;
    level += 1;
    levelsGained += 1;
    threshold = xpToNext(level);
  }

  return {
    progress: { level, xp },
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

const RANK_FLOORS: readonly { floor: number; rank: Rank }[] = [
  { floor: 70, rank: "S" },
  { floor: 50, rank: "A" },
  { floor: 35, rank: "B" },
  { floor: 20, rank: "C" },
  { floor: 10, rank: "D" },
  { floor: 1, rank: "E" },
];

/** Maps a level to its rank: E 1-9, D 10-19, C 20-34, B 35-49, A 50-69, S 70+. */
export function getRank(level: number): Rank {
  if (level < 1) {
    throw new RangeError(`level must be >= 1, got ${level}`);
  }
  for (const { floor, rank } of RANK_FLOORS) {
    if (level >= floor) {
      return rank;
    }
  }
  // Unreachable: the floor of 1 always matches for level >= 1.
  return "E";
}
