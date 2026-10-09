import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { signInWithGoogle } from "../../lib/auth";
import { COLORS } from "../../lib/theme";

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

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>LEVEL UP</Text>
      <Text style={styles.tagline}>Turn real-life habits into quests.</Text>

      <Pressable
        style={[styles.button, isSigningIn && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={isSigningIn}
      >
        {isSigningIn ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  wordmark: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 2,
  },
  tagline: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 220,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
