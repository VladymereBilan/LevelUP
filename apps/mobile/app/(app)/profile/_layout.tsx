import { Stack } from "expo-router";
import { colors } from "../../../theme/tokens";

/** This tab's own stack, so Health Connect can push a detail screen while the tab bar stays
 * visible — same pattern as quests/_layout.tsx. */
export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
