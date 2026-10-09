import { describe, expect, it } from "vitest";
import { applyStatDecayPenalty, applyXpLossPenalty, computeRewardLockUntil } from "../penalties";
import { createEmptyStats } from "../stats";

describe("applyXpLossPenalty", () => {
  it("subtracts XP within the current level", () => {
    const result = applyXpLossPenalty({ level: 3, xp: 50 }, 20);
    expect(result).toEqual({ level: 3, xp: 30 });
  });

  it("de-levels when the penalty exceeds the current level's XP", () => {
    // xpToNext(2) === 283
    const result = applyXpLossPenalty({ level: 3, xp: 10 }, 20);
    expect(result).toEqual({ level: 2, xp: 273 });
  });

  it("floors at level 1, 0 XP and never goes negative", () => {
    const result = applyXpLossPenalty({ level: 1, xp: 5 }, 1000);
    expect(result).toEqual({ level: 1, xp: 0 });
  });

  it("rejects negative amounts", () => {
    expect(() => applyXpLossPenalty({ level: 1, xp: 0 }, -1)).toThrow(RangeError);
  });
});

describe("applyStatDecayPenalty", () => {
  it("reduces the target stat only, floored at 0", () => {
    const stats = { ...createEmptyStats(), FOCUS: 3 };
    const result = applyStatDecayPenalty(stats, "FOCUS", 10);
    expect(result).toEqual({ ...createEmptyStats(), FOCUS: 0 });
  });

  it("rejects negative amounts", () => {
    expect(() => applyStatDecayPenalty(createEmptyStats(), "STR", -1)).toThrow(RangeError);
  });
});

describe("computeRewardLockUntil", () => {
  it("adds lockDays to now", () => {
    expect(computeRewardLockUntil("2026-03-01", 3)).toBe("2026-03-04");
  });

  it("returns the same date when lockDays is 0", () => {
    expect(computeRewardLockUntil("2026-03-01", 0)).toBe("2026-03-01");
  });

  it("rolls over month and year boundaries", () => {
    expect(computeRewardLockUntil("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("rejects negative lockDays", () => {
    expect(() => computeRewardLockUntil("2026-03-01", -1)).toThrow(RangeError);
  });
});
