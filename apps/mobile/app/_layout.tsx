import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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
import { bootMark } from "../lib/bootTrace";
import { colors } from "../theme/tokens";

void SplashScreen.preventAutoHideAsync();

/** Past this, a boot that hasn't resolved falls through to the spinner — a splash that
 * never lifts reads as a crashed app, where a spinner at least shows signs of life. */
const SPLASH_CAP_MS = 6000;

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

/**
 * The native splash is a process-global, one-shot resource: it can be hidden
 * once and there is no API to bring it back. So the "already handed off" latch
 * lives here rather than in component state — it outlives any particular render
 * and is the honest shape of the thing being tracked.
 */
let splashHandedOff = false;

/**
 * Keeps the native splash up for the whole first boot rather than handing off to
 * a spinner partway through, and returns whether it's still holding.
 *
 * One-way, because of the above: a later boot-ish window (a sign-in resolving
 * within the cap, say) must fall through to the spinner. Treating it as "hold"
 * would render nothing at all, the splash being long gone by then.
 */
function useSplashGate(booting: boolean): boolean {
  const [capExpired, setCapExpired] = useState(false);

  useEffect(() => {
    if (splashHandedOff) return;
    // A boot that never resolves still has to let go: a splash that stays up
    // reads as a crashed app, where a spinner at least animates.
    const timer = setTimeout(() => setCapExpired(true), SPLASH_CAP_MS);
    return () => clearTimeout(timer);
  }, []);

  const held = !splashHandedOff && booting && !capExpired;

  useEffect(() => {
    if (held || splashHandedOff) return;
    splashHandedOff = true;
    void SplashScreen.hideAsync();
  }, [held]);

  return held;
}

function RootLayoutNav({ fontsReady }: { fontsReady: boolean }) {
  const { session, loading } = useSession();
  const { status } = useOnboarding();

  const booting = !fontsReady || loading || (!!session && status === "loading");
  const splashHeld = useSplashGate(booting);

  if (splashHeld) return null;
  if (booting) return <LoadingScreen />;

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
  // Rendered unconditionally, even before the faces resolve, so AuthProvider's session
  // restore and OnboardingProvider's first query overlap with font loading instead of
  // queueing behind it. Nothing styled is visible meanwhile — RootLayoutNav holds the
  // splash until `fontsReady`.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // A broken font is a cosmetic problem; a permanently loading app is not.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) bootMark("fonts");
  }, [fontsReady]);

  return (
    <AuthProvider>
      <OnboardingProvider>
        <StatusBar style="light" />
        <RootLayoutNav fontsReady={fontsReady} />
      </OnboardingProvider>
    </AuthProvider>
  );
}
