import { StyleSheet, Text, View } from "react-native";
import { getRank, xpToNext } from "@levelup/engine";

const COLORS = {
  background: "#0B0B14",
  violet: "#7C3AED",
  blue: "#3B82F6",
  text: "#F5F3FF",
  muted: "#A1A1AA",
};

export default function HomeScreen() {
  const level = 1;
  const xpNeeded = xpToNext(level);
  const rank = getRank(level);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LEVEL UP</Text>
      <Text style={styles.subtitle}>@levelup/engine is wired up and running.</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Level {level}</Text>
        <Text style={styles.cardValue}>
          {xpNeeded} XP to level {level + 1}
        </Text>
        <Text style={styles.cardValue}>Rank {rank}</Text>
      </View>
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
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    backgroundColor: "#15152A",
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
});
