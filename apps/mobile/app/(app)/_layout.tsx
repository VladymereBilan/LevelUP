import { Tabs } from "expo-router";
import { TabIcon } from "../../components/TabIcon";
import { colors, fontSizes, fonts } from "../../theme/tokens";

/**
 * Three tabs, down from five. Home absorbed the Quests tab — it was rendering a
 * count of the same board and a button to go see it — and Challenges became a
 * segment of Stats, which is where the rest of someone's progress already lives.
 */
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.violetLight,
        tabBarInactiveTintColor: colors.disabled,
        tabBarLabelStyle: {
          fontSize: fontSizes.label,
          fontFamily: fonts.bodySemiBold,
          marginTop: 2,
        },
        tabBarStyle: {
          height: 76,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: "rgba(14,14,25,0.95)",
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
