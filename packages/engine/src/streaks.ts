import type { DateString, StreakState } from "./types";

export function createStreak(): StreakState {
  return { current: 0, longest: 0, lastCompletedDate: null, graceDaysUsed: 0 };
}

function parseDateString(date: DateString): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new RangeError(`date must be an ISO date string "YYYY-MM-DD", got "${date}"`);
  }
  const [, year, month, day] = match as unknown as [string, string, string, string];
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000;
}

/** Whole days between two ISO dates (`to` - `from`). Negative if `to` precedes `from`. */
export function diffInDays(from: DateString, to: DateString): number {
  return parseDateString(to) - parseDateString(from);
}

function remainingGraceDays(streak: StreakState, graceDaysAllowed: number): number {
  return Math.max(0, graceDaysAllowed - streak.graceDaysUsed);
}

/**
 * Records a completed quest on `completedOn`, advancing the streak.
 * - Completing again on the same day is a no-op (idempotent).
 * - A gap of missed days is tolerated up to `graceDaysAllowed` (the rest-day
 *   grace mechanic) before the streak resets to 1.
 */
export function recordStreakCompletion(
  streak: StreakState,
  completedOn: DateString,
  graceDaysAllowed = 0,
): StreakState {
  if (streak.lastCompletedDate === null) {
    return {
      current: 1,
      longest: Math.max(streak.longest, 1),
      lastCompletedDate: completedOn,
      graceDaysUsed: 0,
    };
  }

  const gap = diffInDays(streak.lastCompletedDate, completedOn);
  if (gap < 0) {
    throw new RangeError(
      `completedOn ("${completedOn}") precedes lastCompletedDate ("${streak.lastCompletedDate}")`,
    );
  }
  if (gap === 0) {
    return streak;
  }

  const missedDays = gap - 1;
  if (missedDays <= remainingGraceDays(streak, graceDaysAllowed)) {
    const current = streak.current + 1;
    return {
      current,
      longest: Math.max(streak.longest, current),
      lastCompletedDate: completedOn,
      graceDaysUsed: streak.graceDaysUsed + missedDays,
    };
  }

  return {
    current: 1,
    longest: Math.max(streak.longest, 1),
    lastCompletedDate: completedOn,
    graceDaysUsed: 0,
  };
}

/**
 * True if, as of `today`, enough days have elapsed since the last completion
 * (beyond any remaining grace) that the streak should be considered broken.
 * Call this on a schedule (e.g. a daily job) — completing a quest does not
 * require calling this first.
 */
export function isStreakBroken(
  streak: StreakState,
  today: DateString,
  graceDaysAllowed = 0,
): boolean {
  if (streak.lastCompletedDate === null) {
    return false;
  }
  const missedDays = diffInDays(streak.lastCompletedDate, today) - 1;
  if (missedDays <= 0) {
    return false;
  }
  return missedDays > remainingGraceDays(streak, graceDaysAllowed);
}

/** Resets the streak to zero while preserving the longest-streak record. */
export function resetStreak(streak: StreakState): StreakState {
  return { current: 0, longest: streak.longest, lastCompletedDate: null, graceDaysUsed: 0 };
}

/** Applies `resetStreak` only if `isStreakBroken` — safe to call on any schedule. */
export function applyStreakDecayIfBroken(
  streak: StreakState,
  today: DateString,
  graceDaysAllowed = 0,
): StreakState {
  return isStreakBroken(streak, today, graceDaysAllowed) ? resetStreak(streak) : streak;
}
