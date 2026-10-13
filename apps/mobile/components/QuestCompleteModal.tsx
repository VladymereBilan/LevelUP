import { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { LevelBadge } from "./LevelBadge";
import { RankChip } from "./RankChip";
import type { QuestCompleteResult } from "../lib/quests";
import { questCompleted } from "../lib/haptics";
import { colors, fonts } from "../theme/tokens";

interface QuestCompleteModalProps {
  visible: boolean;
  result: QuestCompleteResult | null;
  onContinue: () => void;
  /** Shows the one-time daily-reminder offer. The caller decides when it's warranted (see
   * lib/notifications' shouldOfferDailyReminder) — this component only renders it. */
  offerReminder?: boolean;
  onAcceptReminder?: () => void;
  onDeclineReminder?: () => void;
}

/** The XP/level-up/rank-up celebration shown right after a quest completes. */
export function QuestCompleteModal({
  visible,
  result,
  onContinue,
  offerReminder = false,
  onAcceptReminder,
  onDeclineReminder,
}: QuestCompleteModalProps) {
  const backdrop = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const glow = useSharedValue(0);
  const leveledUp = result?.leveledUp ?? false;

  useEffect(() => {
    if (!visible) {
      backdrop.value = 0;
      scale.value = 0.92;
      glow.value = 0;
      return;
    }
    backdrop.value = withTiming(1, { duration: 160 });
    // Overshoots slightly before settling — the difference between a panel appearing and one
    // arriving. A plain fade read as "a dialog opened"; this reads as something happening.
    scale.value = withSpring(1, { damping: 13, stiffness: 190 });
    // One pulse behind the content, brighter and slower for a level-up.
    glow.value = withSequence(
      withTiming(leveledUp ? 1 : 0.65, { duration: leveledUp ? 320 : 220 }),
      withTiming(0, { duration: leveledUp ? 700 : 480 }),
    );
    questCompleted(leveledUp);
  }, [visible, leveledUp, backdrop, scale, glow]);

  // Declared before the early return below: these are hooks, and skipping them on a render
  // where `result` is null would change hook order between renders.
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.28,
    transform: [{ scale: 0.7 + glow.value * 0.9 }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[{ flex: 1, backgroundColor: "rgba(7,7,13,0.92)" }, backdropStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              alignSelf: "center",
              top: "28%",
              width: 260,
              height: 260,
              borderRadius: 130,
              backgroundColor: colors.violet,
            },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            },
            contentStyle,
          ]}
        >
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text
              style={{
                color: colors.violetLight,
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 2,
              }}
            >
              QUEST COMPLETE
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 28 }}>
              {result.leveledUp ? "LEVEL UP" : "Nice work."}
            </Text>
          </View>

          {result.leveledUp ? (
            <View style={{ marginTop: 28 }}>
              <LevelBadge level={result.level} />
            </View>
          ) : null}

          <View style={{ marginTop: 28, flexDirection: "row", gap: 14 }}>
            <View
              style={{
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "rgba(124,58,237,0.14)",
              }}
            >
              <Icon name="sparkles" size={18} color={colors.violetLight} />
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 14 }}>
                +{result.xpAwarded} XP
              </Text>
            </View>
            <View
              style={{
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "rgba(59,130,246,0.14)",
              }}
            >
              <Icon name="shield" size={18} color={colors.blueLight} />
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 14 }}>
                +{result.statValue} {result.stat}
              </Text>
            </View>
          </View>

          {result.rankedUp ? (
            <View style={{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <RankChip rank={result.rank} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>New rank unlocked!</Text>
            </View>
          ) : null}

          {result.titlesUnlocked.length > 0 ? (
            <View
              style={{
                marginTop: 20,
                width: "100%",
                gap: 8,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(167,139,250,0.35)",
                backgroundColor: "rgba(124,58,237,0.1)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="trophy" size={14} color={colors.violetLight} />
                <Text
                  style={{
                    color: colors.violetLight,
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  TITLE{result.titlesUnlocked.length > 1 ? "S" : ""} UNLOCKED
                </Text>
              </View>
              {result.titlesUnlocked.map((title) => (
                <View key={title.id}>
                  <Text
                    style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}
                  >
                    {title.name}
                  </Text>
                  {title.description ? (
                    <Text style={{ color: colors.muted, fontSize: 10, marginTop: 1 }}>
                      {title.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {result.title ? (
            <Text style={{ marginTop: 16, color: colors.muted, fontSize: 11 }}>
              Equipped title: <Text style={{ color: colors.text }}>{result.title}</Text>
            </Text>
          ) : null}

          <Text style={{ marginTop: 16, color: colors.muted, fontSize: 11 }}>
            Streak: {result.streak.current} day{result.streak.current === 1 ? "" : "s"}
          </Text>

          {offerReminder ? (
            <View
              style={{
                marginTop: 22,
                width: "100%",
                gap: 12,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(96,165,250,0.3)",
                backgroundColor: "rgba(59,130,246,0.1)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Icon name="bell" size={14} color={colors.blueLight} />
                <Text
                  style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}
                >
                  Keep this streak going?
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                A daily nudge, plus a heads-up when your streak is about to break. You can change
                this any time in Profile.
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button icon="bell" onPress={() => onAcceptReminder?.()}>
                    Remind me
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button variant="ghost" onPress={() => onDeclineReminder?.()}>
                    Not now
                  </Button>
                </View>
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 32, width: "100%" }}>
            <Button onPress={onContinue}>Continue</Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
