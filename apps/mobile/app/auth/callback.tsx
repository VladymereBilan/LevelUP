import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { completeGoogleSignIn } from "../../lib/auth";
import { colors } from "../../theme/tokens";

/**
 * Fallback for the Google OAuth redirect in case +native-intent's
 * `redirectSystemPath` didn't intercept it first (the expected path:
 * `openAuthSessionAsync`'s own promise handles the exchange and this
 * screen is never rendered). If the router does land here, it still
 * completes the sign-in itself before bouncing to "/", where the root
 * layout's session guard sends the user to the right place. Never logs
 * the authorization code.
 */
export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const pending = code ? completeGoogleSignIn(code) : Promise.resolve();
    pending.finally(() => {
      router.replace("/");
    });
  }, [code]);

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
