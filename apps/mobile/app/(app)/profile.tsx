import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/Button";
import { signOut } from "../../lib/auth";
import { colors, fonts } from "../../theme/tokens";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 justify-between px-6 py-6">
        <View className="flex-1 items-center justify-center gap-4 px-2">
          <View
            className="h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(124,58,237,0.14)" }}
          >
            <Icon name="profile" size={24} color={colors.violetLight} />
          </View>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.displaySemiBold,
              fontSize: 19,
              textAlign: "center",
            }}
          >
            Profile settings, coming soon
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
            Notification preferences, timezone, and account details will live here.
          </Text>
        </View>
        <Button
          variant="ghost"
          icon="logout"
          onPress={() => {
            void signOut();
          }}
        >
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}
