import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Icon } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import { Button } from "../../components/Button";
import { signInWithGoogle } from "../../lib/auth";
import { colors, fontSizes } from "../../theme/tokens";

// Both pages live in apps/web, the same origin the API routes are served from.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export default function LoginScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === "error") {
        setError(result.message);
      }
      // "success": AuthProvider's onAuthStateChange picks up the new
      // session and the root layout's route guard switches to (app) on
      // its own — nothing to do here. "cancelled": silent no-op.
    } finally {
      setIsSigningIn(false);
    }
  }

  function openUrl(path: string) {
    if (!API_URL) return;
    void WebBrowser.openBrowserAsync(`${API_URL}${path}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 items-center justify-between overflow-hidden px-6 pb-7 pt-10">
        <View
          className="absolute h-[260px] w-[260px] rounded-full"
          style={{ top: 140, left: 40, borderWidth: 1, borderColor: "rgba(124,58,237,0.14)" }}
        />
        <View
          className="absolute h-[188px] w-[188px] rounded-full"
          style={{ top: 176, left: 76, borderWidth: 1, borderColor: "rgba(96,165,250,0.1)" }}
        />

        <View className="mt-36 items-center">
          <View
            className="mb-6 h-[68px] w-[68px] items-center justify-center rounded-2xl"
            style={{
              transform: [{ rotate: "45deg" }],
              borderWidth: 1,
              borderColor: "rgba(167,139,250,0.22)",
              backgroundColor: "rgba(124,58,237,0.14)",
            }}
          >
            <View style={{ transform: [{ rotate: "-45deg" }] }}>
              <Icon name="sparkles" size={31} color={colors.violetLight} />
            </View>
          </View>
          <Logo />
          <Text style={{ marginTop: 10, color: colors.muted, fontSize: 14, letterSpacing: 0.3 }}>
            Turn your life into a quest
          </Text>
          <View className="mt-7 flex-row items-center gap-2.5">
            <View
              style={{ width: 38, height: 1, backgroundColor: colors.disabled, opacity: 0.4 }}
            />
            <Text
              style={{
                color: colors.disabled,
                fontSize: fontSizes.label,
                fontWeight: "700",
                letterSpacing: 2.5,
              }}
            >
              BEGIN YOUR JOURNEY
            </Text>
            <View
              style={{ width: 38, height: 1, backgroundColor: colors.disabled, opacity: 0.4 }}
            />
          </View>
        </View>

        <View className="w-full">
          <Button variant="google" icon="google" onPress={handlePress} loading={isSigningIn}>
            Continue with Google
          </Button>
          {error ? (
            <Text
              style={{
                marginTop: 10,
                color: colors.danger,
                fontSize: fontSizes.caption,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          ) : null}
          <Text
            style={{
              marginTop: 16,
              color: colors.disabled,
              fontSize: fontSizes.label,
              lineHeight: 14,
              textAlign: "center",
            }}
          >
            By continuing, you agree to our{" "}
            <Text
              onPress={() => openUrl("/terms")}
              suppressHighlighting
              style={{ color: colors.muted, textDecorationLine: "underline" }}
            >
              Terms
            </Text>{" "}
            and acknowledge our{" "}
            <Text
              onPress={() => openUrl("/privacy")}
              suppressHighlighting
              style={{ color: colors.muted, textDecorationLine: "underline" }}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
