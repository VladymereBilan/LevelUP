import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, type IconName } from "./Icon";
import { colors } from "../theme/tokens";

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

/** A tab bar icon: an active tab gets a small top indicator bar and a tinted glow chip. */
export function TabIcon({ name, focused }: TabIconProps) {
  return (
    <View className="items-center">
      {focused ? (
        <LinearGradient
          colors={[colors.violet, colors.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", top: -7, width: 22, height: 2, borderRadius: 2 }}
        />
      ) : null}
      <View
        className="h-7 w-[35px] items-center justify-center rounded-lg"
        style={focused ? { backgroundColor: "rgba(124,58,237,0.16)" } : undefined}
      >
        <Icon name={name} size={20} color={focused ? colors.violetLight : colors.disabled} />
      </View>
    </View>
  );
}
