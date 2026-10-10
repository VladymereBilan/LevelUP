import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { STATS, type Stat, type StatBlock } from "@levelup/engine";
import { colors } from "../theme/tokens";

interface RadarChartProps {
  values: StatBlock;
  size?: number;
}

const RING_FRACTIONS = [1 / 3, 2 / 3, 1];
const LABEL_OFFSET = 16;

function polarPoint(center: number, radius: number, angle: number): [number, number] {
  return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
}

function anglesFor(count: number): number[] {
  return Array.from({ length: count }, (_, i) => -Math.PI / 2 + i * ((2 * Math.PI) / count));
}

function polygonPoints(center: number, radius: number, angles: readonly number[]): string {
  return angles.map((angle) => polarPoint(center, radius, angle).join(",")).join(" ");
}

/** 5-axis radar/pentagon chart of the player's stats — each axis scaled to the highest of
 * the 5 current values (not a fixed ceiling), so it always reads as "balance between my own
 * stats" rather than shrinking to a sliver for a player whose stats are all still low. */
export function RadarChart({ values, size = 220 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.34;
  const angles = anglesFor(STATS.length);
  const maxValue = Math.max(1, ...STATS.map((stat) => values[stat]));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {RING_FRACTIONS.map((fraction) => (
        <Polygon
          key={fraction}
          points={polygonPoints(center, radius * fraction, angles)}
          fill="none"
          stroke={colors.border}
          strokeWidth={1}
        />
      ))}

      {angles.map((angle, index) => {
        const [x, y] = polarPoint(center, radius, angle);
        return (
          <Line
            key={index}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke={colors.border}
            strokeWidth={1}
          />
        );
      })}

      <Polygon
        points={angles
          .map((angle, index) => {
            const fraction = values[STATS[index] as Stat] / maxValue;
            return polarPoint(center, radius * fraction, angle).join(",");
          })
          .join(" ")}
        fill="rgba(124,58,237,0.32)"
        stroke={colors.violetLight}
        strokeWidth={2}
      />

      {angles.map((angle, index) => {
        const fraction = values[STATS[index] as Stat] / maxValue;
        const [x, y] = polarPoint(center, radius * fraction, angle);
        return <Circle key={index} cx={x} cy={y} r={3} fill={colors.violetLight} />;
      })}

      {angles.map((angle, index) => {
        const [x, y] = polarPoint(center, radius + LABEL_OFFSET, angle);
        return (
          <SvgText
            key={index}
            x={x}
            y={y}
            fill={colors.muted}
            fontSize={10}
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {STATS[index] === "FOCUS" ? "FOC" : STATS[index]}
          </SvgText>
        );
      })}
    </Svg>
  );
}
