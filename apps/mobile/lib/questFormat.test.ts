import { describe, expect, it } from "vitest";
import type { ActivityTarget } from "@levelup/engine";
import { bestCaseSourceForMetric, sourceForCompletion } from "./questFormat";

/**
 * The source multiplier is the only thing separating real effort from a tap (health 1.0x,
 * timer 0.8x, manual 0.6x). It used to be chosen from the activity's metric type, so a quest
 * claimed the bonus for being *configured* a certain way rather than for being *done* — a
 * distance quest paid the top multiplier in the game to someone who never moved.
 */

const MINUTES: ActivityTarget = { type: "minutes", minutes: 20 };
const DISTANCE: ActivityTarget = { type: "distance", meters: 2000 };
const CHECKBOX: ActivityTarget = { type: "checkbox" };
const REPS: ActivityTarget = { type: "reps", reps: 10 };

describe("sourceForCompletion", () => {
  it("pays the timer bonus only once the minutes are actually on the clock", () => {
    expect(sourceForCompletion("minutes", 20, MINUTES)).toBe("timer");
    expect(sourceForCompletion("minutes", 25, MINUTES)).toBe("timer");
  });

  it("reports manual for a minutes quest completed without the timer", () => {
    // The exact case reported from the device: Complete Quest is pressable immediately.
    expect(sourceForCompletion("minutes", 0, MINUTES)).toBe("manual");
  });

  it("reports manual for a minutes quest stopped short of its target", () => {
    expect(sourceForCompletion("minutes", 19, MINUTES)).toBe("manual");
  });

  it("pays health for a distance quest only once the distance is covered", () => {
    expect(sourceForCompletion("distance", 2000, DISTANCE)).toBe("health");
    expect(sourceForCompletion("distance", 1999, DISTANCE)).toBe("manual");
    // Previously "health" — the cheapest maximum-value XP in the game.
    expect(sourceForCompletion("distance", 0, DISTANCE)).toBe("manual");
  });

  it("is not fooled by a shortfall that rounds up to 100%", () => {
    // 1990/2000 is 99.5%, which Math.round takes to 100. Gating on the displayed
    // percentage paid the full device-measured bonus for a 10m shortfall; the rule
    // compares against the target itself for exactly this reason.
    expect(sourceForCompletion("distance", 1990, DISTANCE)).toBe("manual");
    expect(sourceForCompletion("minutes", 19, MINUTES)).toBe("manual");
  });

  it("leaves the hand-reported metrics on manual whether or not they hit target", () => {
    // These have no control that could measure anything, so there is no bonus to gate.
    expect(sourceForCompletion("checkbox", 1, CHECKBOX)).toBe("manual");
    expect(sourceForCompletion("checkbox", 0, CHECKBOX)).toBe("manual");
    expect(sourceForCompletion("reps", 10, REPS)).toBe("manual");
    expect(sourceForCompletion("reps", 0, REPS)).toBe("manual");
  });

  it("never claims more than the metric's best case", () => {
    const cases: [Parameters<typeof sourceForCompletion>[0], number, ActivityTarget][] = [
      ["minutes", 20, MINUTES],
      ["minutes", 0, MINUTES],
      ["distance", 2000, DISTANCE],
      ["distance", 0, DISTANCE],
      ["checkbox", 1, CHECKBOX],
      ["reps", 10, REPS],
    ];
    for (const [metricType, progress, target] of cases) {
      const claimed = sourceForCompletion(metricType, progress, target);
      const best = bestCaseSourceForMetric(metricType);
      expect(claimed === best || claimed === "manual").toBe(true);
    }
  });
});
