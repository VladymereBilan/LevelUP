import { useState } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";
import type { StreakCalendar } from "../lib/statsProgress";
import { colors, fontSizes } from "../theme/tokens";

const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "rgba(148,163,184,0.1)",
  1: "rgba(124,58,237,0.28)",
  2: "rgba(124,58,237,0.5)",
  3: "rgba(124,58,237,0.75)",
  4: colors.violet,
};

const GAP = 4;
const ROW_LABEL_WIDTH = 14;
const MAX_CELL = 26;
/** Only for a container with no width yet to divide up. Not a floor on the computed size:
 * enforcing a minimum is what would make a wide grid overflow instead of shrink. */
const FALLBACK_CELL = 9;
/** Width to lay out against before the first measurement lands, so the very first frame is
 * close to right rather than collapsed. Narrower than any phone this ships to. */
const ASSUMED_WIDTH = 300;

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

/**
 * The square size that makes `weeks` columns span exactly `availableWidth`.
 *
 * Pulled out of the component and exported so it can be asserted directly: the bug it exists
 * to prevent is a grid drawn at a hardcoded size, which looks correct in isolation and
 * occupies a third of its card on a real phone. A render test can confirm the cells are
 * sized from the container; only this can confirm the arithmetic.
 */
export function heatmapCellSize(availableWidth: number, weeks: number): number {
  if (availableWidth <= 0 || weeks <= 0) return FALLBACK_CELL;
  const gaps = ROW_LABEL_WIDTH + GAP + (weeks - 1) * GAP;
  return Math.max(1, Math.min(MAX_CELL, Math.floor((availableWidth - gaps) / weeks)));
}

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
 * Cells are sized from the measured container rather than fixed, because a fixed 14px square
 * at five columns filled about a third of the card it sat in and read as a chart that had
 * been cut off.
 *
 * Shading is relative to the busiest day in the window, not an absolute count, so the legend
 * is part of the chart rather than an optional extra — without it the colours can't be read.
 */
export function Heatmap({ calendar }: { calendar: StreakCalendar }) {
  const { rows, weekdayLabels, firstDate, maxCount } = calendar;
  const [width, setWidth] = useState(0);

  const weeks = rows[0]?.length ?? 0;
  const cell = heatmapCellSize(width || ASSUMED_WIDTH, weeks);

  function measure(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={{ gap: GAP }} testID="heatmap" onLayout={measure}>
      <Text
        style={{
          color: colors.disabled,
          fontSize: fontSizes.label,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {`${shortDate(firstDate).toUpperCase()} TO TODAY`}
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
          {row.map((day, week) => (
            <View
              key={week}
              testID={`heatmap-cell-${weekday}-${week}`}
              // A null cell is a real square in the grid that isn't a real day — before the
              // window opened, or later this week. Drawn as nothing rather than as level 0,
              // which would claim a day with no completions.
              style={{
                width: cell,
                height: cell,
                borderRadius: 3,
                backgroundColor: day ? LEVEL_COLORS[day.level] : "transparent",
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
