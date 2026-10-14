import { Pressable, Text, View } from "react-native";
import type { Difficulty } from "@levelup/engine";
import { Icon, type IconName } from "./Icon";
import { colors, difficultyColors, fontSizes, fonts, gradient } from "../theme/tokens";
import { LinearGradient } from "expo-linear-gradient";

interface QuestCardProps {
  title: string;
  progressLabel: string;
  percent: number;
  xp: number;
  difficulty: Difficulty;
  icon: IconName;
  complete?: boolean;
  onPress?: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

/** A single quest row on the Home screen's Today's Quests list. */
export function QuestCard({
  title,
  progressLabel,
  percent,
  xp,
  difficulty,
  icon,
  complete,
  onPress,
}: QuestCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 min-h-[44px] flex-row items-center gap-2.5 overflow-hidden rounded-2xl border px-3 py-3.5"
      style={{
        borderColor: colors.border,
        backgroundColor: "rgba(27,27,47,0.9)",
        opacity: complete ? 0.54 : 1,
      }}
    >
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={{ position: "absolute", left: 0, top: 16, bottom: 16, width: 3, borderRadius: 3 }}
      />
      <View
        className="h-[39px] w-[39px] items-center justify-center rounded-xl"
        style={{
          backgroundColor: complete ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.13)",
          marginLeft: 8,
        }}
      >
        <Icon
          name={complete ? "check" : icon}
          size={18}
          color={complete ? colors.success : colors.violetLight}
        />
      </View>
      <View className="min-w-0 flex-1 gap-2">
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: fontSizes.body,
            textDecorationLine: complete ? "line-through" : "none",
            textDecorationColor: colors.disabled,
          }}
        >
          {title}
        </Text>
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>{progressLabel}</Text>
          <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>{percent}%</Text>
        </View>
        <View
          className="h-1 overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(11,11,20,0.85)" }}
        >
          <LinearGradient
            colors={gradient.colors}
            start={gradient.start}
            end={gradient.end}
            style={{ width: `${Math.min(100, percent)}%`, height: "100%" }}
          />
        </View>
        <View className="mt-0.5 flex-row items-center">
          <Text
            style={{
              color: difficultyColors[difficulty],
              backgroundColor: `${difficultyColors[difficulty]}1A`,
              borderRadius: 5,
              paddingHorizontal: 6,
              paddingVertical: 3,
              fontSize: fontSizes.label,
              fontWeight: "700",
            }}
          >
            {DIFFICULTY_LABEL[difficulty]}
          </Text>
          <Text
            style={{
              marginLeft: "auto",
              color: colors.violetLight,
              fontFamily: fonts.displaySemiBold,
              fontSize: fontSizes.label,
            }}
          >
            +{xp} XP
          </Text>
        </View>
      </View>
      <Icon name="arrow" size={16} color={colors.disabled} />
    </Pressable>
  );
}
