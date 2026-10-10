import { Text, View } from "react-native";
import type { Stat } from "@levelup/engine";
import { Icon, type IconName } from "./Icon";
import { colors, fonts, statLabels, statTones, toneColors } from "../theme/tokens";

interface StatBarProps {
  stat: Stat;
  value: number;
}

const STAT_ICONS: Record<Stat, IconName> = {
  STR: "dumbbell",
  AGI: "sparkles",
  VIT: "shield",
  INT: "book",
  FOCUS: "focus",
};

/** A soft display ceiling for the stat bar fill — raw stat values are unbounded, the bar isn't. */
const DISPLAY_CEILING = 100;

/** One row in the Home screen's "Core stats" card: icon, code, label, value, and a fill track. */
export function StatBar({ stat, value }: StatBarProps) {
  const tone = statTones[stat];
  const color = toneColors[tone];
  const percent = Math.min(100, Math.max(0, value));

  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className="h-[29px] w-[29px] items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon name={STAT_ICONS[stat]} size={15} color={color} />
      </View>
      <View className="min-w-0 flex-1 gap-1.5">
        <View className="flex-row items-center">
          <Text
            style={{
              width: 34,
              color: colors.text,
              fontFamily: fonts.displaySemiBold,
              fontSize: 10,
            }}
          >
            {stat === "FOCUS" ? "FOC" : stat}
          </Text>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 9 }}>{statLabels[stat]}</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 10 }}>
            {value}
          </Text>
        </View>
        <View
          className="h-1 overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(11,11,20,0.85)" }}
        >
          <View
            style={{
              width: `${Math.min(100, (percent / DISPLAY_CEILING) * 100)}%`,
              height: "100%",
              borderRadius: 4,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
    </View>
  );
}
