import type { ActivityTarget, MetricType } from "@levelup/engine";
import type { IconName } from "../components/Icon";

export function formatProgressLabel(
  metricType: MetricType,
  progress: number,
  target: ActivityTarget,
): string {
  switch (metricType) {
    case "checkbox":
      return progress >= 1 ? "Done" : "Not done";
    case "minutes":
      return `${progress} / ${target.type === "minutes" ? target.minutes : 0} min`;
    case "reps":
      return `${progress} / ${target.type === "reps" ? target.reps : 0} reps`;
    case "sets_reps_weight":
      return `${progress} / ${target.type === "sets_reps_weight" ? target.sets : 0} sets`;
  }
}

function targetDenominator(metricType: MetricType, target: ActivityTarget): number {
  switch (metricType) {
    case "checkbox":
      return 1;
    case "minutes":
      return target.type === "minutes" ? target.minutes : 1;
    case "reps":
      return target.type === "reps" ? target.reps : 1;
    case "sets_reps_weight":
      return target.type === "sets_reps_weight" ? target.sets : 1;
  }
}

export function progressPercent(
  metricType: MetricType,
  progress: number,
  target: ActivityTarget,
): number {
  const denom = targetDenominator(metricType, target);
  if (denom <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress / denom) * 100)));
}

/** @levelup/engine's starter templates (packages/engine/src/templates.ts) use a handful of
 * icon names that don't have a 1:1 match in this app's Icon set — aliased to the closest
 * existing icon, matching how the same stat is iconified elsewhere (e.g. StatBar). */
const CATEGORY_ICON_ALIASES: Record<string, IconName> = {
  dumbbell: "dumbbell",
  book: "book",
  moon: "moon",
  run: "sparkles",
  target: "focus",
  heart: "shield",
};

export function getCategoryIcon(icon: string): IconName {
  return CATEGORY_ICON_ALIASES[icon] ?? "sparkles";
}
