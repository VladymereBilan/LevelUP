import { Stack } from "expo-router";
import { colors } from "../../../theme/tokens";

/**
 * The Home tab's own stack. Home renders the quest board itself, and the quest
 * detail and activity screens push on top of it — grouped under `(home)` rather
 * than sitting in their own tab so back-navigation always lands on the board that
 * opened them, with the tab bar staying visible throughout. `(home)` is a group,
 * so the URLs are unchanged: `/quests/[id]`, `/quests/activities/...`.
 */
export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
