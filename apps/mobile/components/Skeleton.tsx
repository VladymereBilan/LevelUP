import { useEffect } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/tokens";

const PULSE_MS = 900;
const MIN_OPACITY = 0.35;

/**
 * A placeholder block for content that hasn't arrived.
 *
 * It pulses rather than sitting still, because a static grey box is indistinguishable from a
 * rendering bug — the motion is what says "loading" instead of "broken". That was the whole
 * problem with the full-screen spinner it replaces: a spinner tells you the app is busy but
 * nothing about what is coming, so every screen's wait looked identical and the layout
 * arrived as a jump. A skeleton shaped like the real content means the screen only fills in.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(MIN_OPACITY, { duration: PULSE_MS }), -1, true);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "rgba(148,163,184,0.13)",
        },
        pulse,
        style,
      ]}
    />
  );
}

/** A card-shaped placeholder, matching the bordered surfaces the real screens use. */
export function SkeletonCard({
  height,
  children,
}: {
  height?: number;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        height,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(27,27,47,0.5)",
        gap: 10,
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}
