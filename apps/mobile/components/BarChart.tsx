import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, gradient } from "../theme/tokens";

export interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: readonly BarChartDatum[];
  /** Highlights the bar at this index (e.g. the best day in the window) — purely cosmetic. */
  highlightIndex?: number;
}

const BAR_AREA_HEIGHT = 96;
const MIN_BAR_HEIGHT = 4;

/** A column bar chart — bar heights are relative to the tallest value in `data`, computed
 * here so callers pass raw numbers, not pre-scaled percentages. */
export function BarChart({ data, highlightIndex }: BarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      {data.map((datum, index) => {
        const heightPx = Math.max(MIN_BAR_HEIGHT, (datum.value / maxValue) * BAR_AREA_HEIGHT);
        const highlighted = index === highlightIndex;
        return (
          <View key={`${datum.label}-${index}`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 8 }}>{datum.value}</Text>
            <View
              style={{
                width: "100%",
                height: BAR_AREA_HEIGHT,
                justifyContent: "flex-end",
              }}
            >
              {datum.value > 0 ? (
                <LinearGradient
                  colors={gradient.colors}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={{
                    width: "100%",
                    height: heightPx,
                    borderRadius: 6,
                    opacity: highlighted ? 1 : 0.65,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: MIN_BAR_HEIGHT,
                    borderRadius: 6,
                    backgroundColor: colors.border,
                  }}
                />
              )}
            </View>
            <Text style={{ color: colors.muted, fontSize: 9, fontFamily: fonts.bodyMedium }}>
              {datum.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
