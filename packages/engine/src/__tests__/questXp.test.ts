import { describe, expect, it } from "vitest";
import {
  BASE_QUEST_XP,
  SOURCES_BY_METRIC_TYPE,
  SOURCE_MULTIPLIERS,
  calcQuestXp,
  capDailyXp,
  explainQuestXp,
  isSourcePossibleForMetric,
} from "../questXp";

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

describe("explainQuestXp", () => {
  it("reports every term that produced the total", () => {
    const b = explainQuestXp({ difficulty: "hard", source: "timer", streakDays: 4 });
    expect(b).toEqual({
      base: BASE_QUEST_XP,
      difficulty: "hard",
      difficultyMultiplier: 1.5,
      source: "timer",
      sourceMultiplier: 0.8,
      streakDays: 4,
      streakBonus: 0.1,
      total: Math.round(BASE_QUEST_XP * 1.5 * 0.8 * 1.1),
    });
  });

  it("caps the reported streak bonus the same way the award does", () => {
    expect(
      explainQuestXp({ difficulty: "easy", source: "manual", streakDays: 365 }).streakBonus,
    ).toBe(0.25);
  });

  it("reports an overridden base rather than the default", () => {
    expect(
      explainQuestXp({ difficulty: "normal", source: "health", streakDays: 0, baseXp: 50 }).base,
    ).toBe(50);
  });

  it("rejects a negative streak, like calcQuestXp does", () => {
    expect(() =>
      explainQuestXp({ difficulty: "normal", source: "manual", streakDays: -1 }),
    ).toThrow(RangeError);
  });

  // The whole reason explainQuestXp exists is so a breakdown shown to a player cannot disagree
  // with the XP actually awarded. Check that across the entire input space, not one example.
  it("always totals exactly what calcQuestXp returns", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      for (const source of ["manual", "timer", "health"] as const) {
        for (const streakDays of [0, 1, 3, 7, 10, 11, 50, 365]) {
          const input = { difficulty, source, streakDays };
          expect(explainQuestXp(input).total).toBe(calcQuestXp(input));
        }
      }
    }
  });
});

describe("isSourcePossibleForMetric", () => {
  it("lets a minutes activity claim the timer but nothing else", () => {
    expect(isSourcePossibleForMetric("minutes", "timer")).toBe(true);
    expect(isSourcePossibleForMetric("minutes", "manual")).toBe(true);
    expect(isSourcePossibleForMetric("minutes", "health")).toBe(false);
  });

  it("lets the device-measured metrics claim health", () => {
    expect(isSourcePossibleForMetric("distance", "health")).toBe(true);
    expect(isSourcePossibleForMetric("steps", "health")).toBe(true);
  });

  it("refuses a timer or health claim from a metric with neither control", () => {
    // The exploitable shape: a checkbox quest paying the health multiplier for a tap.
    for (const metricType of ["checkbox", "reps", "sets_reps_weight"] as const) {
      expect(isSourcePossibleForMetric(metricType, "timer")).toBe(false);
      expect(isSourcePossibleForMetric(metricType, "health")).toBe(false);
    }
  });

  it("always allows manual, since anything can be reported by hand", () => {
    for (const metricType of Object.keys(
      SOURCES_BY_METRIC_TYPE,
    ) as (keyof typeof SOURCES_BY_METRIC_TYPE)[]) {
      expect(isSourcePossibleForMetric(metricType, "manual")).toBe(true);
    }
  });

  it("never allows a source worth more than manual without a control that could measure it", () => {
    // Stated as the property rather than a table, so a metric type added later has to
    // justify any bonus source it declares instead of inheriting one by omission.
    for (const [metricType, sources] of Object.entries(SOURCES_BY_METRIC_TYPE)) {
      for (const source of sources) {
        if (SOURCE_MULTIPLIERS[source] > SOURCE_MULTIPLIERS.manual) {
          expect(["minutes", "distance", "steps"]).toContain(metricType);
        }
      }
    }
  });
});
