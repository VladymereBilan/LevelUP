import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors, fonts } from "../theme/tokens";

interface ComingSoonProps {
  icon: IconName;
  title: string;
  copy: string;
}

/** The shared styled-placeholder body for tabs that don't have real content yet. */
export function ComingSoon({ icon, title, copy }: ComingSoonProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(124,58,237,0.14)" }}
        >
          <Icon name={icon} size={24} color={colors.violetLight} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: 19,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 18,
            textAlign: "center",
            maxWidth: 260,
          }}
        >
          {copy}
        </Text>
      </View>
    </SafeAreaView>
  );
}
