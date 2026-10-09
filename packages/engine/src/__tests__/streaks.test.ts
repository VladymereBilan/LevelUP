import { describe, expect, it } from "vitest";
import {
  applyStreakDecayIfBroken,
  createStreak,
  diffInDays,
  isStreakBroken,
  recordStreakCompletion,
  resetStreak,
} from "../streaks";

describe("diffInDays", () => {
  it("computes whole-day gaps", () => {
    expect(diffInDays("2026-03-05", "2026-03-06")).toBe(1);
    expect(diffInDays("2026-03-05", "2026-03-05")).toBe(0);
    expect(diffInDays("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("rejects malformed dates", () => {
    expect(() => diffInDays("2026/03/05", "2026-03-06")).toThrow(RangeError);
  });
});

describe("recordStreakCompletion", () => {
  it("starts a streak at 1 on the first completion", () => {
    const streak = recordStreakCompletion(createStreak(), "2026-03-01");
    expect(streak).toEqual({
      current: 1,
      longest: 1,
      lastCompletedDate: "2026-03-01",
      graceDaysUsed: 0,
    });
  });

  it("is idempotent for a second completion on the same day", () => {
    const first = recordStreakCompletion(createStreak(), "2026-03-01");
    const second = recordStreakCompletion(first, "2026-03-01");
    expect(second).toEqual(first);
  });

  it("increments on consecutive days and tracks the longest streak", () => {
    let streak = createStreak();
    streak = recordStreakCompletion(streak, "2026-03-01");
    streak = recordStreakCompletion(streak, "2026-03-02");
    streak = recordStreakCompletion(streak, "2026-03-03");
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it("resets to 1 when a day is missed with no grace available", () => {
    let streak = createStreak();
    streak = recordStreakCompletion(streak, "2026-03-01");
    streak = recordStreakCompletion(streak, "2026-03-02");
    // skip 2026-03-03
    streak = recordStreakCompletion(streak, "2026-03-04", 0);
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(2);
  });

  it("uses grace days to tolerate a missed day without resetting", () => {
    let streak = createStreak();
    streak = recordStreakCompletion(streak, "2026-03-01", 1);
    streak = recordStreakCompletion(streak, "2026-03-02", 1);
    // skip 2026-03-03, one grace day allowed
    streak = recordStreakCompletion(streak, "2026-03-04", 1);
    expect(streak.current).toBe(3);
    expect(streak.graceDaysUsed).toBe(1);
  });

  it("resets once the grace budget is exhausted", () => {
    let streak = createStreak();
    streak = recordStreakCompletion(streak, "2026-03-01", 1);
    streak = recordStreakCompletion(streak, "2026-03-02", 1);
    streak = recordStreakCompletion(streak, "2026-03-04", 1); // uses the 1 grace day
    // another missed day with no grace left -> reset
    streak = recordStreakCompletion(streak, "2026-03-06", 1);
    expect(streak.current).toBe(1);
    expect(streak.graceDaysUsed).toBe(0);
  });

  it("rejects completions dated before the last completion", () => {
    const streak = recordStreakCompletion(createStreak(), "2026-03-05");
    expect(() => recordStreakCompletion(streak, "2026-03-04")).toThrow(RangeError);
  });
});

describe("isStreakBroken / applyStreakDecayIfBroken", () => {
  it("is not broken on the same day or the very next day", () => {
    const streak = recordStreakCompletion(createStreak(), "2026-03-01");
    expect(isStreakBroken(streak, "2026-03-01")).toBe(false);
    expect(isStreakBroken(streak, "2026-03-02")).toBe(false);
  });

  it("is broken once a full day has elapsed with no grace", () => {
    const streak = recordStreakCompletion(createStreak(), "2026-03-01");
    expect(isStreakBroken(streak, "2026-03-03", 0)).toBe(true);
  });

  it("is not broken while grace days can still cover the gap", () => {
    const streak = recordStreakCompletion(createStreak(), "2026-03-01", 1);
    expect(isStreakBroken(streak, "2026-03-03", 1)).toBe(false);
  });

  it("applyStreakDecayIfBroken resets only when broken", () => {
    const streak = recordStreakCompletion(createStreak(), "2026-03-01");
    const untouched = applyStreakDecayIfBroken(streak, "2026-03-02", 0);
    expect(untouched).toEqual(streak);

    const decayed = applyStreakDecayIfBroken(streak, "2026-03-05", 0);
    expect(decayed).toEqual(resetStreak(streak));
  });
});
