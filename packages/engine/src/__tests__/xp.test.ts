import { describe, expect, it } from "vitest";
import { awardXp, getRank, xpToNext } from "../xp";

describe("xpToNext", () => {
  it("matches the round(100 * level^1.5) curve", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(283);
    expect(xpToNext(10)).toBe(3162);
  });

  it("rejects levels below 1", () => {
    expect(() => xpToNext(0)).toThrow(RangeError);
  });
});

describe("awardXp", () => {
  it("accumulates XP within a level without leveling up", () => {
    const result = awardXp({ level: 1, xp: 0 }, 50);
    expect(result).toEqual({ progress: { level: 1, xp: 50 }, leveledUp: false, levelsGained: 0 });
  });

  it("levels up exactly once and carries over leftover XP", () => {
    const result = awardXp({ level: 1, xp: 90 }, 20);
    // xpToNext(1) === 100, so 10 of the 110 total overflow into level 2.
    expect(result.progress).toEqual({ level: 2, xp: 10 });
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
  });

  it("handles multi-level-ups from a single large award", () => {
    const result = awardXp({ level: 1, xp: 0 }, 100 + 283 + 50);
    expect(result.progress).toEqual({ level: 3, xp: 50 });
    expect(result.levelsGained).toBe(2);
  });

  it("is a no-op for a zero-XP award", () => {
    const result = awardXp({ level: 5, xp: 10 }, 0);
    expect(result).toEqual({ progress: { level: 5, xp: 10 }, leveledUp: false, levelsGained: 0 });
  });

  it("rejects negative amounts", () => {
    expect(() => awardXp({ level: 1, xp: 0 }, -1)).toThrow(RangeError);
  });
});

describe("getRank", () => {
  it.each([
    [1, "E"],
    [9, "E"],
    [10, "D"],
    [19, "D"],
    [20, "C"],
    [34, "C"],
    [35, "B"],
    [49, "B"],
    [50, "A"],
    [69, "A"],
    [70, "S"],
    [999, "S"],
  ] as const)("level %i -> rank %s", (level, rank) => {
    expect(getRank(level)).toBe(rank);
  });

  it("rejects levels below 1", () => {
    expect(() => getRank(0)).toThrow(RangeError);
  });
});
