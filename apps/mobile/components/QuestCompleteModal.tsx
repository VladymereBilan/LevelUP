import { Modal, Text, View } from "react-native";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { LevelBadge } from "./LevelBadge";
import { RankChip } from "./RankChip";
import type { QuestCompleteResult } from "../lib/quests";
import { colors, fonts } from "../theme/tokens";

interface QuestCompleteModalProps {
  visible: boolean;
  result: QuestCompleteResult | null;
  onContinue: () => void;
}

/** The XP/level-up/rank-up celebration shown right after a quest completes. */
export function QuestCompleteModal({ visible, result, onContinue }: QuestCompleteModalProps) {
  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(7,7,13,0.92)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text
            style={{ color: colors.violetLight, fontSize: 10, fontWeight: "700", letterSpacing: 2 }}
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

        {result.title ? (
          <Text
            style={{ marginTop: 16, color: colors.violetLight, fontSize: 12, textAlign: "center" }}
          >
            New title unlocked: {result.title}
          </Text>
        ) : null}

        <Text style={{ marginTop: 16, color: colors.muted, fontSize: 11 }}>
          Streak: {result.streak.current} day{result.streak.current === 1 ? "" : "s"}
        </Text>

        <View style={{ marginTop: 32, width: "100%" }}>
          <Button onPress={onContinue}>Continue</Button>
        </View>
      </View>
    </Modal>
  );
}
