import { Text, View } from "react-native";
import {
  explainQuestXp,
  type Difficulty,
  type QuestSource,
  type QuestXpBreakdown,
} from "@levelup/engine";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { colors, fontSizes, fonts } from "../theme/tokens";

/** Player-facing names for the three tracking sources. "manual"/"health" are engine vocabulary;
 * nobody outside the codebase should have to learn them. */
const SOURCE_LABELS: Record<QuestSource, string> = {
  manual: "Tapped in",
  timer: "Timer-tracked",
  health: "Auto-tracked",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

/** Ordered worst-to-best so the comparison below reads as a ladder the player can climb. */
const SOURCES_BY_VALUE: readonly QuestSource[] = ["manual", "timer", "health"];

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: muted ? colors.muted : colors.text, fontSize: fontSizes.body }}>
        {label}
      </Text>
      <Text
        style={{
          color: muted ? colors.muted : colors.text,
          fontFamily: fonts.bodySemiBold,
          fontSize: fontSizes.body,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

interface XpBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  breakdown: QuestXpBreakdown;
}

/**
 * Explains an XP figure instead of asserting it. Opened by tapping the XP on a quest — never
 * shown unprompted, so the quest screen stays as simple as it is for anyone who doesn't care.
 *
 * The comparison at the bottom is the real point: the source multiplier is the biggest lever a
 * player has and the only one that was previously invisible. Seeing "Timer-tracked earns more
 * than Tapped in" once is enough to change how someone finishes every future quest.
 *
 * Every number here comes from the engine's explainQuestXp for the same inputs the completion
 * will use, so this can't drift from what's actually awarded.
 */
export function XpBreakdownSheet({ visible, onClose, breakdown }: XpBreakdownSheetProps) {
  const alternatives = SOURCES_BY_VALUE.map((source) => ({
    source,
    total: explainQuestXp({
      difficulty: breakdown.difficulty,
      source,
      streakDays: breakdown.streakDays,
      baseXp: breakdown.base,
    }).total,
  }));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 18, paddingBottom: 8 }}>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: fontSizes.label,
              fontWeight: "700",
              letterSpacing: 1.4,
            }}
          >
            THIS QUEST IS WORTH
          </Text>
          <Text style={{ color: colors.violetLight, fontFamily: fonts.displayBold, fontSize: 34 }}>
            {breakdown.total} XP
          </Text>
        </View>

        <View style={{ gap: 9 }}>
          <Row label="Base" value={`${breakdown.base} XP`} />
          <Row
            label={DIFFICULTY_LABELS[breakdown.difficulty]}
            value={`x${breakdown.difficultyMultiplier}`}
          />
          <Row
            label={SOURCE_LABELS[breakdown.source]}
            value={`x${breakdown.sourceMultiplier.toFixed(1)}`}
          />
          <Row
            label={
              breakdown.streakDays > 0
                ? `${breakdown.streakDays}-day streak`
                : "No streak bonus yet"
            }
            value={`+${Math.round(breakdown.streakBonus * 100)}%`}
            muted={breakdown.streakDays === 0}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ gap: 9 }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: fontSizes.label,
              fontWeight: "700",
              letterSpacing: 1.2,
            }}
          >
            HOW YOU TRACK IT CHANGES THE XP
          </Text>
          {alternatives.map(({ source, total }) => {
            const isCurrent = source === breakdown.source;
            return (
              <View
                key={source}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: isCurrent ? "rgba(167,139,250,0.35)" : "transparent",
                  backgroundColor: isCurrent ? "rgba(124,58,237,0.12)" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isCurrent ? colors.text : colors.muted,
                    fontFamily: isCurrent ? fonts.bodySemiBold : fonts.body,
                    fontSize: fontSizes.body,
                  }}
                >
                  {SOURCE_LABELS[source]}
                  {isCurrent ? "  ·  this quest" : ""}
                </Text>
                <Text
                  style={{
                    color: isCurrent ? colors.violetLight : colors.muted,
                    fontFamily: fonts.bodySemiBold,
                    fontSize: fontSizes.body,
                  }}
                >
                  {total} XP
                </Text>
              </View>
            );
          })}
          <Text style={{ color: colors.disabled, fontSize: fontSizes.label, lineHeight: 15 }}>
            Timed quests use the built-in timer. Runs track by GPS, and steps can sync from Health
            Connect — both count as auto-tracked.
          </Text>
        </View>

        <Button variant="secondary" onPress={onClose}>
          Got it
        </Button>
      </View>
    </BottomSheet>
  );
}
