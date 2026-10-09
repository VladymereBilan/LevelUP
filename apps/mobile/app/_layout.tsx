import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const COLORS = {
  background: "#0B0B14",
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: "#F5F3FF",
          contentStyle: { backgroundColor: COLORS.background },
        }}
      />
    </>
  );
}
