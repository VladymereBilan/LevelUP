import { Text, View } from "react-native";
import Svg, { Defs, G, LinearGradient, Polygon, Stop } from "react-native-svg";
import { colors, fonts } from "../theme/tokens";

interface LevelBadgeProps {
  level: number;
  width?: number;
  height?: number;
}

const HEX_RATIO: readonly [number, number][] = [
  [0.5, 0],
  [0.94, 0.22],
  [0.94, 0.73],
  [0.5, 1],
  [0.06, 0.73],
  [0.06, 0.22],
];

function hexPoints(width: number, height: number): string {
  return HEX_RATIO.map(([px, py]) => `${px * width},${py * height}`).join(" ");
}

/** The level-number hexagon badge shown on the Home status card. */
export function LevelBadge({ level, width = 86, height = 96 }: LevelBadgeProps) {
  const inset = 3.5;
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="levelOuter" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.violet} />
            <Stop offset="1" stopColor={colors.blue} />
          </LinearGradient>
          <LinearGradient id="levelInner" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor="#2A2448" />
            <Stop offset="1" stopColor="#11111F" />
          </LinearGradient>
        </Defs>
        <Polygon points={hexPoints(width, height)} fill="url(#levelOuter)" />
        <G transform={`translate(${inset}, ${inset})`}>
          <Polygon points={hexPoints(innerWidth, innerHeight)} fill="url(#levelInner)" />
        </G>
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text
          style={{ color: colors.violetLight, fontSize: 8, fontWeight: "700", letterSpacing: 1.2 }}
        >
          LEVEL
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: 32,
            lineHeight: 34,
          }}
        >
          {String(level).padStart(2, "0")}
        </Text>
      </View>
    </View>
  );
}
