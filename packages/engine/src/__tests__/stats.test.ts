import { describe, expect, it } from "vitest";
import { applyStatGain, calcStatGain, createEmptyStats, totalStatPoints } from "../stats";

describe("createEmptyStats", () => {
  it("starts every stat at 0", () => {
    expect(createEmptyStats()).toEqual({ STR: 0, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 });
  });
});

describe("applyStatGain", () => {
  it("adds a positive amount to the target stat only", () => {
    const stats = createEmptyStats();
    const next = applyStatGain(stats, "STR", 5);
    expect(next).toEqual({ STR: 5, AGI: 0, VIT: 0, INT: 0, FOCUS: 0 });
  });

  it("does not mutate the input stats", () => {
    const stats = createEmptyStats();
    applyStatGain(stats, "STR", 5);
    expect(stats.STR).toBe(0);
  });

  it("floors a stat at 0 when a negative amount would take it below zero", () => {
    const stats = { ...createEmptyStats(), VIT: 3 };
    const next = applyStatGain(stats, "VIT", -10);
    expect(next.VIT).toBe(0);
  });

  it("subtracts without going negative when amount is within range", () => {
    const stats = { ...createEmptyStats(), INT: 10 };
    const next = applyStatGain(stats, "INT", -4);
    expect(next.INT).toBe(6);
  });
});

describe("totalStatPoints", () => {
  it("sums all five stats", () => {
    const stats = { STR: 1, AGI: 2, VIT: 3, INT: 4, FOCUS: 5 };
    expect(totalStatPoints(stats)).toBe(15);
  });
});

describe("calcStatGain", () => {
  it.each([
    ["easy", 1],
    ["normal", 2],
    ["hard", 3],
  ] as const)("difficulty %s awards %i stat point(s)", (difficulty, expected) => {
    expect(calcStatGain(difficulty)).toBe(expected);
  });
});
