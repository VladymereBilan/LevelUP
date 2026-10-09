import type { ActivityTarget } from "./types";

/**
 * Safe ceilings on activity targets. These exist so a quest can never be
 * configured to encourage extreme exercise or sleep deprivation, however the
 * user (or a template) sets it up.
 */
export const MAX_MINUTES_TARGET = 180; // 3 hours
export const MAX_REPS_TARGET = 500;
export const MAX_SETS_TARGET = 20;
export const MAX_WEIGHT_KG = 300;

export function isSafeActivityTarget(target: ActivityTarget): boolean {
  switch (target.type) {
    case "checkbox":
      return true;
    case "minutes":
      return target.minutes > 0 && target.minutes <= MAX_MINUTES_TARGET;
    case "reps":
      return target.reps > 0 && target.reps <= MAX_REPS_TARGET;
    case "sets_reps_weight":
      return (
        target.sets > 0 &&
        target.sets <= MAX_SETS_TARGET &&
        target.reps > 0 &&
        target.reps <= MAX_REPS_TARGET &&
        (target.weightKg === undefined ||
          (target.weightKg >= 0 && target.weightKg <= MAX_WEIGHT_KG))
      );
  }
}

/** Clamps a target's numeric fields into the safe ranges above. */
export function clampActivityTarget(target: ActivityTarget): ActivityTarget {
  switch (target.type) {
    case "checkbox":
      return target;
    case "minutes":
      return { type: "minutes", minutes: clamp(target.minutes, 1, MAX_MINUTES_TARGET) };
    case "reps":
      return { type: "reps", reps: clamp(target.reps, 1, MAX_REPS_TARGET) };
    case "sets_reps_weight":
      return {
        type: "sets_reps_weight",
        sets: clamp(target.sets, 1, MAX_SETS_TARGET),
        reps: clamp(target.reps, 1, MAX_REPS_TARGET),
        ...(target.weightKg === undefined
          ? {}
          : { weightKg: clamp(target.weightKg, 0, MAX_WEIGHT_KG) }),
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
