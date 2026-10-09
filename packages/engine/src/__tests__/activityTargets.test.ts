import { describe, expect, it } from "vitest";
import {
  MAX_MINUTES_TARGET,
  MAX_REPS_TARGET,
  MAX_SETS_TARGET,
  MAX_WEIGHT_KG,
  clampActivityTarget,
  isSafeActivityTarget,
} from "../activityTargets";
import type { ActivityTarget } from "../types";

describe("isSafeActivityTarget", () => {
  it("always allows checkbox targets", () => {
    expect(isSafeActivityTarget({ type: "checkbox" })).toBe(true);
  });

  it("allows minutes within the safe range", () => {
    expect(isSafeActivityTarget({ type: "minutes", minutes: 60 })).toBe(true);
  });

  it("rejects minutes beyond the safe ceiling", () => {
    expect(isSafeActivityTarget({ type: "minutes", minutes: MAX_MINUTES_TARGET + 1 })).toBe(false);
  });

  it("rejects a zero or negative minutes target", () => {
    expect(isSafeActivityTarget({ type: "minutes", minutes: 0 })).toBe(false);
  });

  it("rejects reps beyond the safe ceiling", () => {
    expect(isSafeActivityTarget({ type: "reps", reps: MAX_REPS_TARGET + 1 })).toBe(false);
  });

  it("validates sets_reps_weight across all three fields", () => {
    expect(
      isSafeActivityTarget({ type: "sets_reps_weight", sets: 4, reps: 10, weightKg: 40 }),
    ).toBe(true);
    expect(
      isSafeActivityTarget({ type: "sets_reps_weight", sets: MAX_SETS_TARGET + 1, reps: 10 }),
    ).toBe(false);
    expect(
      isSafeActivityTarget({
        type: "sets_reps_weight",
        sets: 4,
        reps: 10,
        weightKg: MAX_WEIGHT_KG + 1,
      }),
    ).toBe(false);
  });

  it("allows sets_reps_weight without an optional weight", () => {
    expect(isSafeActivityTarget({ type: "sets_reps_weight", sets: 3, reps: 12 })).toBe(true);
  });
});

describe("clampActivityTarget", () => {
  it("leaves an already-safe target unchanged", () => {
    const target: ActivityTarget = { type: "minutes", minutes: 30 };
    expect(clampActivityTarget(target)).toEqual(target);
  });

  it("clamps an over-limit minutes target down to the ceiling", () => {
    expect(clampActivityTarget({ type: "minutes", minutes: 9999 })).toEqual({
      type: "minutes",
      minutes: MAX_MINUTES_TARGET,
    });
  });

  it("clamps every field of a sets_reps_weight target independently", () => {
    const clamped = clampActivityTarget({
      type: "sets_reps_weight",
      sets: 999,
      reps: 999,
      weightKg: 999,
    });
    expect(clamped).toEqual({
      type: "sets_reps_weight",
      sets: MAX_SETS_TARGET,
      reps: MAX_REPS_TARGET,
      weightKg: MAX_WEIGHT_KG,
    });
  });

  it("the result of clamping is always itself safe", () => {
    const clamped = clampActivityTarget({ type: "reps", reps: -50 });
    expect(isSafeActivityTarget(clamped)).toBe(true);
  });
});
