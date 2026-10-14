import { Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import type { Rank } from "@levelup/engine";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface RankChipProps {
  rank: Rank;
  width?: number;
  height?: number;
}

const HEX_RATIO: readonly [number, number][] = [
  [0.1, 0],
  [0.9, 0],
  [1, 0.5],
  [0.9, 1],
  [0.1, 1],
  [0, 0.5],
];

function hexPoints(width: number, height: number): string {
  return HEX_RATIO.map(([px, py]) => `${px * width},${py * height}`).join(" ");
}

/** The small pointed-hexagon chip showing the player's rank letter. */
export function RankChip({ rank, width = 26, height = 21 }: RankChipProps) {
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polygon points={hexPoints(width, height)} fill="rgba(59,130,246,0.16)" />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text
          style={{
            color: colors.blueLight,
            fontFamily: fonts.displaySemiBold,
            fontSize: fontSizes.label,
          }}
        >
          {rank}
        </Text>
      </View>
    </View>
  );
}
