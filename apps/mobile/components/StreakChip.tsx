import { Text, View } from "react-native";
import { Icon } from "./Icon";
import { colors, fonts } from "../theme/tokens";

interface StreakChipProps {
  days: number;
}

/** The flame + day-count pill shown in the Home header. */
export function StreakChip({ days }: StreakChipProps) {
  return (
    <View
      className="h-[35px] flex-row items-center gap-1.5 rounded-full px-2.5"
      style={{ backgroundColor: "rgba(245,158,11,0.08)", borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" }}
    >
      <Icon name="flame" size={16} color={colors.warning} />
      <Text style={{ color: colors.warning, fontFamily: fonts.displaySemiBold, fontSize: 12 }}>{days}</Text>
      <Text style={{ color: "#B88735", fontSize: 7, fontWeight: "700" }}>DAYS</Text>
    </View>
  );
}
