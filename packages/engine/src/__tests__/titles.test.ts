import { describe, expect, it } from "vitest";
import {
  evaluateTitleRules,
  parseTitleRule,
  type TitleCatalogEntry,
  type TitleEvaluationState,
} from "../titles";

function baseState(overrides: Partial<TitleEvaluationState> = {}): TitleEvaluationState {
  return {
    level: 1,
    rank: "E",
    longestStreak: 0,
    totalXp: 0,
    totalQuestsCompleted: 0,
    stats: { STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 },
    questsCompletedByStat: { STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 },
    ...overrides,
  };
}

function entry(id: string, unlockRule: unknown, alreadyUnlocked = false): TitleCatalogEntry {
  return { id, unlockRule, alreadyUnlocked };
}

describe("parseTitleRule", () => {
  it("parses every known rule type", () => {
    expect(parseTitleRule({ type: "rank", value: "B" })).toEqual({ type: "rank", value: "B" });
    expect(parseTitleRule({ type: "level", value: 10 })).toEqual({ type: "level", value: 10 });
    expect(parseTitleRule({ type: "streak", days: 7 })).toEqual({ type: "streak", days: 7 });
    expect(parseTitleRule({ type: "totalQuestsCompleted", value: 50 })).toEqual({
      type: "totalQuestsCompleted",
      value: 50,
    });
    expect(parseTitleRule({ type: "totalXp", value: 5000 })).toEqual({
      type: "totalXp",
      value: 5000,
    });
    expect(parseTitleRule({ type: "stat", stat: "STR", value: 25 })).toEqual({
      type: "stat",
      stat: "STR",
      value: 25,
    });
    expect(parseTitleRule({ type: "statQuestsCompleted", stat: "FOCUS", value: 20 })).toEqual({
      type: "statQuestsCompleted",
      stat: "FOCUS",
      value: 20,
    });
  });

  it.each([
    ["not an object", "nope"],
    ["null", null],
    ["an array", []],
    ["missing type", { value: 5 }],
    ["unknown type", { type: "doesNotExist", value: 5 }],
    ["rank with an invalid rank letter", { type: "rank", value: "Z" }],
    ["rank with a numeric value", { type: "rank", value: 1 }],
    ["level with a string value", { type: "level", value: "10" }],
    ["level with zero", { type: "level", value: 0 }],
    ["level with a negative value", { type: "level", value: -5 }],
    ["streak with a missing days field", { type: "streak" }],
    ["streak with NaN days", { type: "streak", days: Number.NaN }],
    ["totalQuestsCompleted with a boolean value", { type: "totalQuestsCompleted", value: true }],
    ["totalXp with zero", { type: "totalXp", value: 0 }],
    ["stat with an invalid stat code", { type: "stat", stat: "LUK", value: 10 }],
    ["stat with a missing value", { type: "stat", stat: "STR" }],
    [
      "statQuestsCompleted with an invalid stat code",
      { type: "statQuestsCompleted", stat: "LUK", value: 10 },
    ],
  ])("returns null for %s", (_label, raw) => {
    expect(parseTitleRule(raw)).toBeNull();
  });
});

describe("evaluateTitleRules", () => {
  it("unlocks a rank title when the current rank meets or exceeds it", () => {
    const titles = [entry("rank-c", { type: "rank", value: "C" })];
    expect(evaluateTitleRules(baseState({ rank: "C" }), titles)).toEqual(["rank-c"]);
    expect(evaluateTitleRules(baseState({ rank: "S" }), titles)).toEqual(["rank-c"]);
    expect(evaluateTitleRules(baseState({ rank: "D" }), titles)).toEqual([]);
  });

  it("unlocks a level title at the exact boundary, not one below it", () => {
    const titles = [entry("level-10", { type: "level", value: 10 })];
    expect(evaluateTitleRules(baseState({ level: 9 }), titles)).toEqual([]);
    expect(evaluateTitleRules(baseState({ level: 10 }), titles)).toEqual(["level-10"]);
    expect(evaluateTitleRules(baseState({ level: 11 }), titles)).toEqual(["level-10"]);
  });

  it("unlocks a streak title from the longest-ever streak, not the current one", () => {
    const titles = [entry("streak-7", { type: "streak", days: 7 })];
    expect(evaluateTitleRules(baseState({ longestStreak: 6 }), titles)).toEqual([]);
    expect(evaluateTitleRules(baseState({ longestStreak: 7 }), titles)).toEqual(["streak-7"]);
    // A broken-then-restarted streak (current back to 1) still satisfies it, because the
    // all-time longest never goes down.
    expect(
      evaluateTitleRules(baseState({ longestStreak: 7 /* current could be 1 */ }), titles),
    ).toEqual(["streak-7"]);
  });

  it("unlocks a totalQuestsCompleted title at the lifetime boundary", () => {
    const titles = [entry("quests-50", { type: "totalQuestsCompleted", value: 50 })];
    expect(evaluateTitleRules(baseState({ totalQuestsCompleted: 49 }), titles)).toEqual([]);
    expect(evaluateTitleRules(baseState({ totalQuestsCompleted: 50 }), titles)).toEqual([
      "quests-50",
    ]);
  });

  it("unlocks a totalXp title at the lifetime boundary", () => {
    const titles = [entry("xp-5000", { type: "totalXp", value: 5000 })];
    expect(evaluateTitleRules(baseState({ totalXp: 4999 }), titles)).toEqual([]);
    expect(evaluateTitleRules(baseState({ totalXp: 5000 }), titles)).toEqual(["xp-5000"]);
  });

  it("unlocks a stat title only for the stat named, at the boundary", () => {
    const titles = [entry("str-25", { type: "stat", stat: "STR", value: 25 })];
    expect(
      evaluateTitleRules(
        baseState({ stats: { STR: 24, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 } }),
        titles,
      ),
    ).toEqual([]);
    expect(
      evaluateTitleRules(
        baseState({ stats: { STR: 25, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 } }),
        titles,
      ),
    ).toEqual(["str-25"]);
    expect(
      evaluateTitleRules(
        baseState({ stats: { STR: 0, AGI: 25, VIT: 0, INT: 0, FOCUS: 0 } }),
        titles,
      ),
    ).toEqual([]);
  });

  it("unlocks a statQuestsCompleted title only for the stat named, at the boundary", () => {
    const titles = [entry("focus-20", { type: "statQuestsCompleted", stat: "FOCUS", value: 20 })];
    expect(
      evaluateTitleRules(
        baseState({ questsCompletedByStat: { STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 19 } }),
        titles,
      ),
    ).toEqual([]);
    expect(
      evaluateTitleRules(
        baseState({ questsCompletedByStat: { STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 20 } }),
        titles,
      ),
    ).toEqual(["focus-20"]);
    expect(
      evaluateTitleRules(
        baseState({ questsCompletedByStat: { STR: 20, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 } }),
        titles,
      ),
    ).toEqual([]);
  });

  it("never returns a title the player already has, even if its rule is met", () => {
    const titles = [entry("rank-c", { type: "rank", value: "C" }, true)];
    expect(evaluateTitleRules(baseState({ rank: "S" }), titles)).toEqual([]);
  });

  it("ignores a malformed or unrecognized rule instead of throwing", () => {
    const titles = [
      entry("bad-1", null),
      entry("bad-2", "a plain string"),
      entry("bad-3", { type: "rank", value: "not-a-rank" }),
      entry("bad-4", { type: "somethingNew", value: 1 }),
      entry("bad-5", undefined),
    ];
    expect(() => evaluateTitleRules(baseState({ rank: "S", level: 999 }), titles)).not.toThrow();
    expect(evaluateTitleRules(baseState({ rank: "S", level: 999 }), titles)).toEqual([]);
  });

  it("evaluates every title independently and returns all newly-earned ids", () => {
    const titles = [
      entry("rank-c", { type: "rank", value: "C" }),
      entry("level-10", { type: "level", value: 10 }),
      entry("already-owned", { type: "level", value: 1 }, true),
      entry("not-met", { type: "level", value: 100 }),
    ];
    const result = evaluateTitleRules(baseState({ rank: "C", level: 10 }), titles);
    expect(result).toEqual(["rank-c", "level-10"]);
  });

  it("returns an empty array when there are no titles to evaluate", () => {
    expect(evaluateTitleRules(baseState(), [])).toEqual([]);
  });
});
