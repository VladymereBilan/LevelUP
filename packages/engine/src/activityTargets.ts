import type { ActivityTarget, MetricType } from "./types";

/**
 * Safe ceilings on activity targets. These exist so a quest can never be
 * configured to encourage extreme exercise or sleep deprivation, however the
 * user (or a template) sets it up.
 */
export const MAX_MINUTES_TARGET = 180; // 3 hours
export const MAX_REPS_TARGET = 500;
export const MAX_SETS_TARGET = 20;
export const MAX_WEIGHT_KG = 300;
export const MAX_DISTANCE_METERS = 50_000; // 50km — generous ultra-distance ceiling, still bounded
export const MAX_STEPS_TARGET = 50_000; // a very high daily step count, still bounded

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
    case "distance":
      return target.meters > 0 && target.meters <= MAX_DISTANCE_METERS;
    case "steps":
      return target.steps > 0 && target.steps <= MAX_STEPS_TARGET;
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
    case "distance":
      return { type: "distance", meters: clamp(target.meters, 1, MAX_DISTANCE_METERS) };
    case "steps":
      return { type: "steps", steps: clamp(target.steps, 1, MAX_STEPS_TARGET) };
  }
}

/** The safe ceiling a *submitted progress value* for this metric type must never exceed —
 * used server-side to clamp a client-reported progress (e.g. GPS distance, synced steps)
 * before it's persisted, independent of whatever the activity's own configured target is. */
export function maxProgressForMetricType(metricType: MetricType): number {
  switch (metricType) {
    case "checkbox":
      return 1;
    case "minutes":
      return MAX_MINUTES_TARGET;
    case "reps":
      return MAX_REPS_TARGET;
    case "sets_reps_weight":
      return MAX_SETS_TARGET;
    case "distance":
      return MAX_DISTANCE_METERS;
    case "steps":
      return MAX_STEPS_TARGET;
  }
}

/** Clamps a submitted progress value into [0, the metric type's safe ceiling]. */
export function clampProgressValue(metricType: MetricType, progress: number): number {
  return clamp(progress, 0, maxProgressForMetricType(metricType));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
