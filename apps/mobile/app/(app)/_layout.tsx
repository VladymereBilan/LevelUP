import { Tabs } from "expo-router";
import { TabIcon } from "../../components/TabIcon";
import { colors, fontSizes, fonts } from "../../theme/tokens";

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
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: "Quests",
          tabBarIcon: ({ focused }) => <TabIcon name="quest" focused={focused} />,
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
        name="challenges"
        options={{
          title: "Challenges",
          tabBarIcon: ({ focused }) => <TabIcon name="trophy" focused={focused} />,
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
