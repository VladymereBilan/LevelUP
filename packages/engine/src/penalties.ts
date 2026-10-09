import { xpToNext } from "./xp";
import { applyStatGain } from "./stats";
import type { DateString, PlayerProgress, Stat, StatBlock } from "./types";

/**
 * Penalties for missed quests are always non-physical: XP loss, stat decay,
 * or a locked reward. Never prescribe extra exercise or anything physical as
 * punishment.
 */

/**
 * Deducts `amount` XP from the player's progress, de-leveling as needed.
 * Floors at level 1, 0 XP — a player can never be penalized below that.
 */
export function applyXpLossPenalty(state: PlayerProgress, amount: number): PlayerProgress {
  if (amount < 0) {
    throw new RangeError(`amount must be >= 0, got ${amount}`);
  }

  let level = state.level;
  let xp = state.xp;
  let remaining = amount;

  while (remaining > 0) {
    if (xp >= remaining) {
      xp -= remaining;
      remaining = 0;
    } else if (level > 1) {
      remaining -= xp;
      level -= 1;
      xp = xpToNext(level);
    } else {
      xp = 0;
      remaining = 0;
    }
  }

  return { level, xp };
}

/** Decays one stat by `amount`, floored at 0. A gentler, targeted alternative to XP loss. */
export function applyStatDecayPenalty(stats: StatBlock, stat: Stat, amount: number): StatBlock {
  if (amount < 0) {
    throw new RangeError(`amount must be >= 0, got ${amount}`);
  }
  return applyStatGain(stats, stat, -amount);
}

/** Computes the ISO date through which a reward (e.g. a cosmetic unlock) stays locked. */
export function computeRewardLockUntil(now: DateString, lockDays: number): DateString {
  if (lockDays < 0) {
    throw new RangeError(`lockDays must be >= 0, got ${lockDays}`);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(now);
  if (!match) {
    throw new RangeError(`now must be an ISO date string "YYYY-MM-DD", got "${now}"`);
  }
  const [, year, month, day] = match as unknown as [string, string, string, string];
  const epochMs = Date.UTC(Number(year), Number(month) - 1, Number(day)) + lockDays * 86_400_000;
  return new Date(epochMs).toISOString().slice(0, 10);
}
