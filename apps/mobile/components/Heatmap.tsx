import { View } from "react-native";
import { colors } from "../theme/tokens";

export interface HeatmapCell {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapProps {
  days: readonly HeatmapCell[];
  columns?: number;
}

const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "rgba(148,163,184,0.1)",
  1: "rgba(124,58,237,0.28)",
  2: "rgba(124,58,237,0.5)",
  3: "rgba(124,58,237,0.75)",
  4: colors.violet,
};

/** A GitHub-style activity grid — `days` reads oldest-first, wrapped into rows of
 * `columns` cells (7, by default: one calendar week per row). */
export function Heatmap({ days, columns = 7 }: HeatmapProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, width: columns * 16 - 4 }}>
      {days.map((day) => (
        <View
          key={day.date}
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            backgroundColor: LEVEL_COLORS[day.level],
          }}
        />
      ))}
    </View>
  );
}
