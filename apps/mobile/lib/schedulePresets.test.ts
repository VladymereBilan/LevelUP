import {
  daysForPreset,
  presetForSchedule,
  scheduleForPreset,
  schedulePresetError,
  WEEKDAY_DAYS,
  WEEKEND_DAYS,
} from "./schedulePresets";

const SATURDAY = 6;
const SUNDAY = 0;

describe("daysForPreset", () => {
  it("never puts a weekend day in Weekdays", () => {
    const days = daysForPreset("weekdays", []);

    expect(days).toEqual([1, 2, 3, 4, 5]);
    expect(days).not.toContain(SATURDAY);
    expect(days).not.toContain(SUNDAY);
  });

  it("puts only weekend days in Weekends", () => {
    expect(daysForPreset("weekends", [])).toEqual([0, 6]);
  });

  it("ignores the custom picks for every preset but custom", () => {
    const picks = [0, 3, 6];

    expect(daysForPreset("weekdays", picks)).toEqual([...WEEKDAY_DAYS]);
    expect(daysForPreset("weekends", picks)).toEqual([...WEEKEND_DAYS]);
    expect(daysForPreset("daily", picks)).toEqual([]);
    expect(daysForPreset("one_off", picks)).toEqual([]);
    expect(daysForPreset("custom", picks)).toEqual([0, 3, 6]);
  });

  it("sorts custom picks, whatever order they were tapped in", () => {
    expect(daysForPreset("custom", [5, 1, 3])).toEqual([1, 3, 5]);
  });
});

describe("scheduleForPreset", () => {
  it("stores every day-of-week preset under the existing weekdays kind", () => {
    // The point of the preset layer: no migration, and generate_daily_quests() keeps
    // matching on the same `kind` and the same day numbers.
    for (const preset of ["weekdays", "weekends", "custom"] as const) {
      expect(scheduleForPreset(preset, [2], "2026-10-20").kind).toBe("weekdays");
    }
  });

  it("round-trips through presetForSchedule", () => {
    const cases = [
      { preset: "daily" as const, custom: [] },
      { preset: "weekdays" as const, custom: [] },
      { preset: "weekends" as const, custom: [] },
      { preset: "custom" as const, custom: [2, 4] },
      { preset: "one_off" as const, custom: [] },
    ];

    for (const { preset, custom } of cases) {
      const schedule = scheduleForPreset(preset, custom, "2026-10-20");
      expect(presetForSchedule(schedule)).toBe(preset);
    }
  });
});

describe("presetForSchedule", () => {
  it("reopens a Mon-to-Fri activity as Weekdays, not as a custom pick", () => {
    expect(presetForSchedule({ kind: "weekdays", weekdays: [1, 2, 3, 4, 5] })).toBe("weekdays");
    expect(presetForSchedule({ kind: "weekdays", weekdays: [5, 3, 1, 4, 2] })).toBe("weekdays");
  });

  it("reopens a Sat/Sun activity as Weekends", () => {
    expect(presetForSchedule({ kind: "weekdays", weekdays: [6, 0] })).toBe("weekends");
  });

  it("falls back to custom for anything else, including a near miss", () => {
    expect(presetForSchedule({ kind: "weekdays", weekdays: [1, 2, 3, 4, 5, 6] })).toBe("custom");
    expect(presetForSchedule({ kind: "weekdays", weekdays: [1, 3, 5] })).toBe("custom");
    expect(presetForSchedule({ kind: "weekdays", weekdays: [] })).toBe("custom");
  });
});

describe("schedulePresetError", () => {
  it("only the custom picker can be left empty", () => {
    expect(schedulePresetError("custom", [])).toBe("Pick at least one day.");
    expect(schedulePresetError("custom", [3])).toBeNull();
    expect(schedulePresetError("weekdays", [])).toBeNull();
    expect(schedulePresetError("weekends", [])).toBeNull();
    expect(schedulePresetError("daily", [])).toBeNull();
  });
});
