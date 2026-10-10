import { useEffect, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, gradient } from "../theme/tokens";

interface XpBarProps {
  current: number;
  max: number;
  height?: number;
}

const SHIMMER_DURATION_MS = 2500;

/** The XP progress bar on the Home status card: a gradient fill with a looping shimmer sweep. */
export function XpBar({ current, max, height = 7 }: XpBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  const [fillWidth, setFillWidth] = useState(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.linear }), -1, false);
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -fillWidth + shimmer.value * fillWidth * 2 }],
  }));

  function handleFillLayout(event: LayoutChangeEvent) {
    setFillWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      style={{
        height,
        padding: 1,
        borderRadius: 10,
        backgroundColor: "rgba(11,11,20,0.8)",
      }}
    >
      <View
        onLayout={handleFillLayout}
        style={{
          width: `${percent}%`,
          height: "100%",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={{
            flex: 1,
            shadowColor: colors.violet,
            shadowOpacity: 0.35,
            shadowRadius: 10,
          }}
        >
          {fillWidth > 0 ? (
            <Animated.View style={[{ position: "absolute", inset: 0, width: fillWidth }, shimmerStyle]}>
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.35)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          ) : null}
        </LinearGradient>
      </View>
    </View>
  );
}
