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

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability, react-hooks/refs --
   this component's whole job is synchronizing with two external, imperative systems: Reanimated's
   SharedValue (mutating `.value` is its documented API, not React state) and RN's PanResponder
   (its own docs recommend `useRef(PanResponder.create(...)).current`). eslint-plugin-react-hooks
   v7's React-Compiler-oriented rules don't yet recognize either as a safe escape hatch. */

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

  // Opening only. Closing belongs to the effect above, and this one used to
  // reach into it: on the render where `visible` flipped to false, both effects
  // ran, and the bare `translateY.value = sheetHeight` here cancelled the
  // withTiming started there. A cancelled Reanimated animation calls back with
  // finished === false, so `setMounted(false)` never ran — leaving the Modal up
  // with its full-screen backdrop over an app that could no longer be tapped,
  // and no state left to change that would re-render it. Every dismissal path
  // hit it: Cancel, the backdrop, the drag, and the hardware back button.
  //
  // Nothing parks the sheet off-screen for the next open, because the closing
  // animation already leaves it exactly there.
  useEffect(() => {
    if (!visible) return;
    if (mounted && sheetHeight > 0) {
      translateY.value = withSpring(0, SPRING_CONFIG);
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
