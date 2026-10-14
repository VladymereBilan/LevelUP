import type { Rank, Stat } from "@levelup/engine";

/**
 * Mirrors the `:root` custom properties in `design/reference/src/index.css`.
 * Never import from `design/reference` directly — that project is a visual
 * reference only, redrawn here by hand.
 */
export const colors = {
  canvas: "#07070D",
  background: "#0B0B14",
  surface: "#12121F",
  elevated: "#1B1B2F",
  violet: "#7C3AED",
  violetLight: "#A78BFA",
  blue: "#3B82F6",
  blueLight: "#60A5FA",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#F8FAFC",
  muted: "#94A3B8",
  disabled: "#475569",
  border: "rgba(148, 163, 184, 0.14)",
} as const;

export const gradient = {
  colors: [colors.violet, colors.blue] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const fonts = {
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  display: "SpaceGrotesk_500Medium",
  displaySemiBold: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
} as const;

/**
 * The type scale. Named `fontSizes` rather than `type` because
 * `import { type }` collides with TypeScript's type-only import modifier.
 *
 * Nothing should sit below `label` (11): the app had 52 pieces
 * of text at 7-9px, which is roughly half the smallest size either platform's
 * own guidelines consider legible — hard to read at arm's length, and harder
 * still for anyone who needs reading glasses or is outdoors.
 *
 * These are raw pixel sizes and do NOT scale with the system font setting.
 * Honouring that setting means letting text reflow, which several fixed-height
 * cards here can't yet do — a real fix, but a layout change rather than a
 * number change.
 */
export const fontSizes = {
  /** Uppercase, tracked micro-labels — section headers, stat captions. */
  label: 11,
  /** Secondary and supporting copy. */
  caption: 12,
  /** Default body text. */
  body: 13,
  /** Emphasised body, list titles. */
  bodyLarge: 15,
  /** Card and section headings. */
  heading: 17,
  /** Screen titles. */
  title: 22,
  /** Numerals meant to be read across the room — level, XP totals. */
  display: 28,
} as const;

export type StatTone = "red" | "blue" | "green" | "violet" | "amber";

export const statTones: Record<Stat, StatTone> = {
  STR: "red",
  AGI: "blue",
  VIT: "green",
  INT: "violet",
  FOCUS: "amber",
};

export const statLabels: Record<Stat, string> = {
  STR: "Strength",
  AGI: "Agility",
  VIT: "Vitality",
  INT: "Intellect",
  FOCUS: "Focus",
};

export const toneColors: Record<StatTone, string> = {
  red: "#F87171",
  blue: colors.blueLight,
  green: "#4ADE80",
  violet: colors.violetLight,
  amber: "#FBBF24",
};

export const difficultyColors = {
  easy: colors.success,
  normal: colors.blueLight,
  hard: "#F87171",
} as const;

/** Original flavor names for each rank letter — purely presentational, no game-rule meaning. */
export const rankLabels: Record<Rank, string> = {
  E: "Newcomer",
  D: "Apprentice",
  C: "Rising Challenger",
  B: "Elite Operative",
  A: "Veteran Ascendant",
  S: "Legendary Vanguard",
};
