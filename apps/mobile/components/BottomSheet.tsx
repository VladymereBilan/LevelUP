import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, PanResponder, Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/tokens";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

const CLOSE_VELOCITY = 0.5;
const CLOSE_DISTANCE_RATIO = 0.3;
const SPRING_CONFIG = { damping: 18, stiffness: 180 };

/** A draggable bottom sheet: Reanimated drives the open/close motion, PanResponder drives the drag gesture. */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (sheetHeight > 0) {
      translateY.value = withTiming(sheetHeight, { duration: 220 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    } else {
      setMounted(false);
    }
  }, [visible, sheetHeight, translateY]);

  useEffect(() => {
    if (mounted && sheetHeight > 0) {
      translateY.value = visible ? withSpring(0, SPRING_CONFIG) : sheetHeight;
    }
  }, [mounted, sheetHeight, visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        translateY.value = Math.max(0, gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > sheetHeight * CLOSE_DISTANCE_RATIO || gesture.vy > CLOSE_VELOCITY) {
          onClose();
        } else {
          translateY.value = withSpring(0, SPRING_CONFIG);
        }
      },
    }),
  ).current;

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    const height = event.nativeEvent.layout.height;
    if (height !== sheetHeight) setSheetHeight(height);
  }

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1"
        style={{ backgroundColor: "rgba(7,7,13,0.6)" }}
        onPress={onClose}
      />
      <Animated.View
        onLayout={handleLayout}
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.elevated,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 24,
          },
          sheetStyle,
        ]}
      >
        <View
          {...panResponder.panHandlers}
          className="mt-3 mb-2 h-10 w-full items-center justify-center"
          accessibilityRole="adjustable"
          accessibilityLabel="Drag to close"
        >
          <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.disabled }} />
        </View>
        <View className="px-5">{children}</View>
      </Animated.View>
    </Modal>
  );
}
