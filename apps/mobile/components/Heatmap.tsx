import { Text, View } from "react-native";
import type { StreakCalendar } from "../lib/statsProgress";
import { colors, fontSizes } from "../theme/tokens";

const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "rgba(148,163,184,0.1)",
  1: "rgba(124,58,237,0.28)",
  2: "rgba(124,58,237,0.5)",
  3: "rgba(124,58,237,0.75)",
  4: colors.violet,
};

const CELL = 14;
const GAP = 4;
const ROW_LABEL_WIDTH = 14;

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Read at UTC noon so no timezone shift moves a plain YYYY-MM-DD onto the next day. */
function shortDate(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00Z`);
  return `${MONTH_ABBR[date.getUTCMonth()] ?? ""} ${date.getUTCDate()}`;
}

/**
 * A calendar of completed-quest activity: one row per weekday, one column per week, oldest
 * week on the left — so a column is a real week and a row is a real weekday.
 *
 * It used to be the last 35 days wrapped into rows of seven, captioned "5 weeks ago" on the
 * left and "Today" on the right. That read as a horizontal timeline, which it wasn't (time
 * also ran downwards), and its columns meant nothing (the window ended today, so the first
 * column was whatever weekday fell 35 days earlier, shifting daily).
 *
 * Shading is relative to the busiest day in the window, not an absolute count, so the legend
 * is part of the chart rather than an optional extra — without it the colours can't be read.
 */
export function Heatmap({ calendar }: { calendar: StreakCalendar }) {
  const { rows, weekdayLabels, firstDate, maxCount } = calendar;

  return (
    <View style={{ gap: GAP, alignItems: "flex-start" }}>
      <Text
        style={{
          color: colors.disabled,
          fontSize: fontSizes.label,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {shortDate(firstDate).toUpperCase()} — TODAY
      </Text>

      {rows.map((row, weekday) => (
        <View key={weekday} style={{ flexDirection: "row", gap: GAP, alignItems: "center" }}>
          <Text
            style={{
              width: ROW_LABEL_WIDTH,
              color: colors.disabled,
              fontSize: fontSizes.label,
              textAlign: "center",
            }}
          >
            {weekdayLabels[weekday]}
          </Text>
          {row.map((cell, week) => (
            <View
              key={week}
              // A null cell is a real square in the grid that isn't a real day — before the
              // window opened, or later this week. Drawn as nothing rather than as level 0,
              // which would claim a day with no completions.
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 3,
                backgroundColor: cell ? LEVEL_COLORS[cell.level] : "transparent",
              }}
            />
          ))}
        </View>
      ))}

      <View style={{ flexDirection: "row", alignItems: "center", gap: GAP, marginTop: 2 }}>
        <Text style={{ color: colors.disabled, fontSize: fontSizes.label }}>None</Text>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <View
            key={level}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: LEVEL_COLORS[level],
            }}
          />
        ))}
        <Text style={{ color: colors.disabled, fontSize: fontSizes.label }}>
          {maxCount === 1 ? "1 quest" : `${maxCount} quests`}
        </Text>
      </View>
    </View>
  );
}
