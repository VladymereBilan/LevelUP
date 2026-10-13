import "../global.css";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { AuthProvider, useSession } from "../lib/AuthProvider";
import { OnboardingProvider, useOnboarding } from "../lib/OnboardingProvider";
import { colors } from "../theme/tokens";

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={colors.violet} />
    </View>
  );
}

function RootLayoutNav() {
  const { session, loading } = useSession();
  const { status } = useOnboarding();

  if (loading || (session && status === "loading")) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!!session && status === "ready"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && status === "needs-onboarding"}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Reachable regardless of session state: right after the OAuth
          redirect, the session may still be settling. Only rendered if
          +native-intent's redirect didn't already intercept the path. */}
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Render with the system font rather than hanging on the splash spinner if
  // the bundled faces fail to load — a broken font is a cosmetic problem, a
  // permanently loading app is not.
  if (!fontsLoaded && !fontError) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <OnboardingProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </OnboardingProvider>
    </AuthProvider>
  );
}
