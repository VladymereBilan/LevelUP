import { describe, expect, it } from "vitest";
import { BASE_QUEST_XP, calcQuestXp, capDailyXp } from "../questXp";

describe("calcQuestXp", () => {
  it("returns the base XP for normal difficulty, manual source, no streak", () => {
    const xp = calcQuestXp({ difficulty: "normal", source: "manual", streakDays: 0 });
    expect(xp).toBe(Math.round(BASE_QUEST_XP * 1 * 0.6));
  });

  it("applies the difficulty multiplier", () => {
    const easy = calcQuestXp({ difficulty: "easy", source: "health", streakDays: 0 });
    const normal = calcQuestXp({ difficulty: "normal", source: "health", streakDays: 0 });
    const hard = calcQuestXp({ difficulty: "hard", source: "health", streakDays: 0 });
    expect(easy).toBe(Math.round(BASE_QUEST_XP * 0.8));
    expect(normal).toBe(Math.round(BASE_QUEST_XP * 1));
    expect(hard).toBe(Math.round(BASE_QUEST_XP * 1.5));
  });

  it("applies the source multiplier", () => {
    expect(calcQuestXp({ difficulty: "normal", source: "health", streakDays: 0 })).toBe(20);
    expect(calcQuestXp({ difficulty: "normal", source: "timer", streakDays: 0 })).toBe(16);
    expect(calcQuestXp({ difficulty: "normal", source: "manual", streakDays: 0 })).toBe(12);
  });

  it("adds a streak bonus that grows with consecutive days", () => {
    const noStreak = calcQuestXp({ difficulty: "normal", source: "health", streakDays: 0 });
    const withStreak = calcQuestXp({ difficulty: "normal", source: "health", streakDays: 4 });
    expect(withStreak).toBeGreaterThan(noStreak);
    // 4 days * 2.5%/day = 10% bonus -> round(20 * 1.10) = 22
    expect(withStreak).toBe(22);
  });

  it("caps the streak bonus at +25% regardless of how long the streak is", () => {
    const cappedAt10Days = calcQuestXp({ difficulty: "normal", source: "health", streakDays: 10 });
    const at365Days = calcQuestXp({ difficulty: "normal", source: "health", streakDays: 365 });
    expect(cappedAt10Days).toBe(at365Days);
    expect(at365Days).toBe(Math.round(20 * 1.25));
  });

  it("supports overriding the base XP", () => {
    const xp = calcQuestXp({ difficulty: "normal", source: "manual", streakDays: 0, baseXp: 50 });
    expect(xp).toBe(30);
  });

  it("rejects negative streakDays", () => {
    expect(() => calcQuestXp({ difficulty: "normal", source: "manual", streakDays: -1 })).toThrow(
      RangeError,
    );
  });
});

describe("capDailyXp", () => {
  it("passes the amount through when under the cap", () => {
    expect(capDailyXp(50, 100, 500)).toBe(50);
  });

  it("clamps to the remaining headroom under the cap", () => {
    expect(capDailyXp(100, 470, 500)).toBe(30);
  });

  it("returns 0 once the cap has already been reached", () => {
    expect(capDailyXp(50, 500, 500)).toBe(0);
  });

  it("never returns a negative amount even if already over cap", () => {
    expect(capDailyXp(50, 600, 500)).toBe(0);
  });

  it("uses the default daily cap when none is given", () => {
    expect(capDailyXp(1000, 0)).toBe(500);
  });
});
