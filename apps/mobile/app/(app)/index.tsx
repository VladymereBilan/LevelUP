import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { signOut } from "../../lib/auth";
import { useSession } from "../../lib/AuthProvider";
import { getMyProfile, type ProfileSummary } from "../../lib/profile";
import { COLORS } from "../../lib/theme";

export default function HomeScreen() {
  const { session } = useSession();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getMyProfile(session.user.id)
      .then((result) => {
        if (isMounted) setProfile(result);
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load profile.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LEVEL UP</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.violet} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : profile ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{profile.username}</Text>
          <Text style={styles.cardValue}>Level {profile.level}</Text>
          <Text style={styles.cardValue}>Rank {profile.rank}</Text>
        </View>
      ) : null}

      <Pressable
        style={styles.signOutButton}
        onPress={() => {
          void signOut();
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
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
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.violet,
    shadowColor: COLORS.violet,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  cardLabel: {
    color: COLORS.blue,
    fontSize: 16,
    fontWeight: "700",
  },
  cardValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "600",
  },
  error: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: "center",
  },
  signOutButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  signOutText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "600",
  },
});
