import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "../../../components/Icon";
import { Button } from "../../../components/Button";
import {
  getTodayExerciseSessions,
  getTodaySteps,
  initializeHealthConnect,
  isHealthConnectAvailable,
  requestHealthConnectPermissions,
  type HealthExerciseSession,
} from "../../../lib/healthConnect";
import {
  invalidateQuestBoardCache,
  loadTodaysQuestBoard,
  type QuestBoardItem,
} from "../../../lib/questBoard";
import { completeQuest } from "../../../lib/quests";
import { colors, fonts } from "../../../theme/tokens";

type SyncState = "checking" | "unavailable" | "disconnected" | "connected";

export default function HealthConnectScreen() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [todaySteps, setTodaySteps] = useState(0);
  const [sessions, setSessions] = useState<HealthExerciseSession[]>([]);
  const [eligibleQuests, setEligibleQuests] = useState<QuestBoardItem[]>([]);
  const [syncingQuestId, setSyncingQuestId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const available = await isHealthConnectAvailable();
      setState(available ? "disconnected" : "unavailable");
    })();
  }, []);

  async function loadEligibleQuests() {
    const board = await loadTodaysQuestBoard();
    setEligibleQuests(
      board.items.filter(
        (item) =>
          item.status === "pending" &&
          (item.metricType === "steps" || item.metricType === "minutes"),
      ),
    );
  }

  async function connect() {
    setError(null);
    try {
      await initializeHealthConnect();
      const grants = await requestHealthConnectPermissions();
      if (!grants.steps && !grants.exerciseSessions) {
        setError("Permission was not granted.");
        return;
      }
      setState("connected");
      const [steps, todaysSessions] = await Promise.all([
        grants.steps ? getTodaySteps() : Promise.resolve(0),
        grants.exerciseSessions ? getTodayExerciseSessions() : Promise.resolve([]),
      ]);
      setTodaySteps(steps);
      setSessions(todaysSessions);
      await loadEligibleQuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Health Connect.");
    }
  }

  async function syncQuest(item: QuestBoardItem, progress: number) {
    setSyncingQuestId(item.questId);
    setError(null);
    try {
      await completeQuest(item.questId, { progress, source: "health" });
      invalidateQuestBoardCache();
      await loadEligibleQuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync quest.");
    } finally {
      setSyncingQuestId(null);
    }
  }

  const totalExerciseMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 20, gap: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: "180deg" }],
          }}
        >
          <Icon name="arrow" size={16} color={colors.muted} />
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 15 }}>
          Health Connect
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 20 }}>
        {state === "checking" ? <ActivityIndicator color={colors.violet} /> : null}

        {state === "unavailable" ? (
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
            Health Connect isn&apos;t available on this device. It requires Android, and the Health
            Connect app installed from Google Play.
          </Text>
        ) : null}

        {state === "disconnected" ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              Connect Health Connect to sync steps and exercise sessions into matching quests. Only
              step counts and exercise session times are read — nothing is written back to Health
              Connect.
            </Text>
            <Button icon="dumbbell" onPress={() => void connect()}>
              Connect Health Connect
            </Button>
          </View>
        ) : null}

        {state === "connected" ? (
          <>
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(27,27,47,0.62)",
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>TODAY</Text>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 }}>
                {todaySteps.toLocaleString()} steps
              </Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>
                {sessions.length} exercise session{sessions.length === 1 ? "" : "s"} (
                {totalExerciseMinutes} min total)
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text
                style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
              >
                SYNC TO QUESTS
              </Text>
              {eligibleQuests.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  No pending steps or minutes quests to sync right now.
                </Text>
              ) : (
                eligibleQuests.map((item) => {
                  const progress = item.metricType === "steps" ? todaySteps : totalExerciseMinutes;
                  return (
                    <View
                      key={item.questId}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 14,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: "rgba(27,27,47,0.62)",
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontFamily: fonts.bodySemiBold,
                            fontSize: 13,
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>
                          {progress} {item.metricType === "steps" ? "steps" : "min"} available
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => void syncQuest(item, progress)}
                        // Every Sync button is disabled while any one of them is in flight:
                        // two overlapping completions each compute the player's new XP from
                        // the same pre-completion profile row, so the second write would
                        // silently overwrite the first one's award.
                        disabled={syncingQuestId !== null || progress <= 0}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: "rgba(124,58,237,0.16)",
                          opacity: syncingQuestId !== null || progress <= 0 ? 0.5 : 1,
                        }}
                      >
                        {syncingQuestId === item.questId ? (
                          <ActivityIndicator color={colors.violetLight} size="small" />
                        ) : (
                          <Text
                            style={{
                              color: colors.violetLight,
                              fontFamily: fonts.bodySemiBold,
                              fontSize: 12,
                            }}
                          >
                            Sync
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : null}

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
