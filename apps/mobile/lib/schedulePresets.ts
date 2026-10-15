import type { Schedule } from "@levelup/engine";

/**
 * What the form offers, which is not what the database stores.
 *
 * The persisted `Schedule["kind"]` has exactly three values, and `"weekdays"` there means
 * "these chosen days of the week" (0 = Sunday ... 6 = Saturday) rather than Monday to Friday.
 * The form used to surface that value directly under the label "Weekdays", so picking
 * "Weekdays" presented all seven day chips and happily accepted Saturday and Sunday.
 *
 * Presets fix the label without touching the stored shape: `weekdays`, `weekends` and
 * `custom` all persist as `kind: "weekdays"`, differing only in which days they fill in. No
 * migration, and `generate_daily_quests()` keeps matching on the same day numbers.
 */
export type SchedulePreset = "daily" | "weekdays" | "weekends" | "custom" | "one_off";

/** Monday to Friday. */
export const WEEKDAY_DAYS = [1, 2, 3, 4, 5] as const;
/** Saturday and Sunday. */
export const WEEKEND_DAYS = [0, 6] as const;

export const SCHEDULE_PRESET_LABELS: Record<SchedulePreset, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekends: "Weekends",
  custom: "Pick days",
  one_off: "One-time",
};

export const SCHEDULE_PRESET_SUMMARIES: Record<SchedulePreset, string> = {
  daily: "Every day",
  weekdays: "Mon to Fri",
  weekends: "Sat and Sun",
  custom: "Chosen days",
  one_off: "One-off",
};

function sameDays(days: readonly number[], expected: readonly number[]): boolean {
  if (days.length !== expected.length) return false;
  const sorted = [...days].sort((a, b) => a - b);
  return expected.every((day, index) => sorted[index] === day);
}

/** Which days a preset selects. `custom` is the only one that defers to the user's picks. */
export function daysForPreset(preset: SchedulePreset, customDays: readonly number[]): number[] {
  if (preset === "weekdays") return [...WEEKDAY_DAYS];
  if (preset === "weekends") return [...WEEKEND_DAYS];
  if (preset === "custom") return [...customDays].sort((a, b) => a - b);
  return [];
}

/**
 * The preset an already-saved schedule should reopen as, so editing an activity shows the
 * same choice that created it rather than always falling back to the custom day picker.
 */
export function presetForSchedule(schedule: Schedule): SchedulePreset {
  if (schedule.kind === "daily") return "daily";
  if (schedule.kind === "one_off") return "one_off";

  const days = schedule.weekdays ?? [];
  if (sameDays(days, WEEKDAY_DAYS)) return "weekdays";
  if (sameDays(days, WEEKEND_DAYS)) return "weekends";
  return "custom";
}

/** The stored shape for a preset. Everything but `daily` and `one_off` persists as
 * `kind: "weekdays"`, which is the value the quest generator already matches on. */
export function scheduleForPreset(
  preset: SchedulePreset,
  customDays: readonly number[],
  oneOffDate: string,
): Schedule {
  if (preset === "daily") return { kind: "daily" };
  if (preset === "one_off") return { kind: "one_off", date: oneOffDate };
  return { kind: "weekdays", weekdays: daysForPreset(preset, customDays) };
}

/** Only the custom preset can be left with nothing selected, so it is the only one that can
 * fail this check. */
export function schedulePresetError(
  preset: SchedulePreset,
  customDays: readonly number[],
): string | null {
  if (preset !== "custom") return null;
  return customDays.length === 0 ? "Pick at least one day." : null;
}
