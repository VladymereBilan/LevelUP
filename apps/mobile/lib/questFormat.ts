import type { ActivityTarget, MetricType } from "@levelup/engine";
import type { IconName } from "../components/Icon";

/** Up to 2 letters for an avatar — first letter of each word in a multi-word username, or
 * the first 2 characters of a single-word one. */
export function initials(username: string): string {
  const letters = username
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter((letter): letter is string => Boolean(letter));
  return (letters.slice(0, 2).join("") || username.slice(0, 2)).toUpperCase();
}

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
    case "distance":
      return `${formatMeters(progress)} / ${formatMeters(target.type === "distance" ? target.meters : 0)}`;
    case "steps":
      return `${progress} / ${target.type === "steps" ? target.steps : 0} steps`;
  }
}

function formatMeters(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`
    : `${meters} m`;
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
    case "distance":
      return target.type === "distance" ? target.meters : 1;
    case "steps":
      return target.type === "steps" ? target.steps : 1;
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
 * existing icon, matching how the same stat is iconified elsewhere (e.g. StatBar). Entries
 * below that key by their own name (e.g. "flame": "flame") are the options offered by the
 * new-category icon picker (see CATEGORY_ICON_OPTIONS) — identity so they render as chosen. */
const CATEGORY_ICON_ALIASES: Record<string, IconName> = {
  dumbbell: "dumbbell",
  book: "book",
  moon: "moon",
  run: "sparkles",
  target: "focus",
  heart: "shield",
  flame: "flame",
  shield: "shield",
  sparkles: "sparkles",
  focus: "focus",
  trophy: "trophy",
  stats: "stats",
  code: "code",
  calendar: "calendar",
  bell: "bell",
};

export function getCategoryIcon(icon: string): IconName {
  return CATEGORY_ICON_ALIASES[icon] ?? "sparkles";
}

/** Offered by the new-category icon picker (Add Activity screen). Each is a real IconName
 * stored verbatim as categories.icon, so CATEGORY_ICON_ALIASES above resolves it by identity. */
export const CATEGORY_ICON_OPTIONS: readonly IconName[] = [
  "dumbbell",
  "book",
  "moon",
  "flame",
  "shield",
  "sparkles",
  "focus",
  "trophy",
  "stats",
  "code",
  "calendar",
  "bell",
];

/** Swatches offered by the new-category color picker — the app's own accent/stat palette,
 * not an arbitrary wheel, so user-created categories stay visually consistent with the rest
 * of the UI (theme/tokens.ts's colors and toneColors). */
export const CATEGORY_COLOR_OPTIONS: readonly string[] = [
  "#7C3AED",
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#A78BFA",
  "#60A5FA",
  "#4ADE80",
  "#FBBF24",
  "#F87171",
];
