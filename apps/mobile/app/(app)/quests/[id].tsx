import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "../../../components/Icon";
import { Button } from "../../../components/Button";
import { QuestCompleteModal } from "../../../components/QuestCompleteModal";
import { ApiError } from "../../../lib/api";
import { loadQuestDetail, updateQuestProgress, type QuestBoardItem } from "../../../lib/questBoard";
import { completeQuest, type QuestCompleteResult } from "../../../lib/quests";
import { formatProgressLabel, progressPercent } from "../../../lib/questFormat";
import { colors, fonts, gradient } from "../../../theme/tokens";
import { LinearGradient } from "expo-linear-gradient";

function targetStepCount(item: QuestBoardItem): number {
  if (item.target.type === "reps") return item.target.reps;
  if (item.target.type === "sets_reps_weight") return item.target.sets;
  return 1;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<QuestBoardItem | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeResult, setCompleteResult] = useState<QuestCompleteResult | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const detail = await loadQuestDetail(id);
        if (!isMounted) return;
        if (!detail) {
          setError("Quest not found.");
          return;
        }
        setItem(detail);
        setLocalProgress(detail.progress);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load quest.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function persistProgress(next: number) {
    setLocalProgress(next);
    updateQuestProgress(id, next).catch(() => {
      // Best-effort: Complete Quest submits the current value explicitly,
      // so a failed intermediate save here isn't fatal to the flow.
    });
  }

  function toggleDone() {
    persistProgress(localProgress >= 1 ? 0 : 1);
  }

  function adjustStep(delta: number, max: number) {
    persistProgress(Math.max(0, Math.min(max, localProgress + delta)));
  }

  function startTimer() {
    if (timerRunning) return;
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }

  function pauseTimer() {
    if (!timerRunning) return;
    setTimerRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedSeconds((seconds) => {
      const addedMinutes = Math.floor(seconds / 60);
      if (addedMinutes > 0) {
        persistProgress(localProgress + addedMinutes);
      }
      return seconds % 60;
    });
  }

  async function handleComplete() {
    if (!item) return;
    setCompleting(true);
    setError(null);
    try {
      const result = await completeQuest(item.questId, { progress: localProgress });
      setCompleteResult(result);
      setShowCompleteModal(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete quest.");
    } finally {
      setCompleting(false);
    }
  }

  function handleModalContinue() {
    setShowCompleteModal(false);
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.violet} />
      </SafeAreaView>
    );
  }

  if (error && !item) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: colors.danger, fontSize: 14, textAlign: "center" }}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!item) return null;

  const alreadyCompleted = item.status === "completed";
  const percent = progressPercent(item.metricType, localProgress, item.target);
  const progressLabel = formatProgressLabel(item.metricType, localProgress, item.target);

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
          {item.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 24, flexGrow: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(27,27,47,0.7)",
          }}
        >
          <View>
            <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}>
              PROGRESS
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.displaySemiBold,
                fontSize: 15,
                marginTop: 4,
              }}
            >
              {progressLabel}
            </Text>
          </View>
          <Text
            style={{ color: colors.violetLight, fontFamily: fonts.displaySemiBold, fontSize: 20 }}
          >
            {percent}%
          </Text>
        </View>

        {item.metricType === "checkbox" ? (
          <Pressable
            onPress={toggleDone}
            disabled={alreadyCompleted}
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              paddingVertical: 28,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: localProgress >= 1 ? "rgba(34,197,94,0.4)" : colors.border,
              backgroundColor: localProgress >= 1 ? "rgba(34,197,94,0.1)" : "rgba(27,27,47,0.62)",
            }}
          >
            <Icon
              name="check"
              size={28}
              color={localProgress >= 1 ? colors.success : colors.disabled}
            />
            <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 14 }}>
              {localProgress >= 1 ? "Marked done" : "Tap to mark done"}
            </Text>
          </Pressable>
        ) : null}

        {item.metricType === "minutes" ? (
          <View style={{ alignItems: "center", gap: 16, paddingVertical: 12 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 44 }}>
              {formatClock(elapsedSeconds)}
            </Text>
            <Button
              variant="secondary"
              icon={timerRunning ? "pause" : "play"}
              onPress={timerRunning ? pauseTimer : startTimer}
              disabled={alreadyCompleted}
            >
              {timerRunning ? "Pause" : "Start"}
            </Button>
          </View>
        ) : null}

        {item.metricType === "reps" || item.metricType === "sets_reps_weight" ? (
          <View style={{ alignItems: "center", gap: 16, paddingVertical: 12 }}>
            {item.target.type === "sets_reps_weight" ? (
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {item.target.reps} reps{item.target.weightKg ? ` x ${item.target.weightKg}kg` : ""}{" "}
                per set
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
              <Pressable
                onPress={() => adjustStep(-1, targetStepCount(item))}
                disabled={alreadyCompleted}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="minus" size={18} color={colors.muted} />
              </Pressable>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displayBold,
                  fontSize: 32,
                  minWidth: 60,
                  textAlign: "center",
                }}
              >
                {localProgress}
              </Text>
              <Pressable
                onPress={() => adjustStep(1, targetStepCount(item))}
                disabled={alreadyCompleted}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="plus" size={18} color={colors.violetLight} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View
          style={{
            height: 6,
            borderRadius: 6,
            overflow: "hidden",
            backgroundColor: "rgba(11,11,20,0.85)",
          }}
        >
          <LinearGradient
            colors={gradient.colors}
            start={gradient.start}
            end={gradient.end}
            style={{ width: `${percent}%`, height: "100%" }}
          />
        </View>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>
        ) : null}

        <View style={{ marginTop: "auto" }}>
          {alreadyCompleted ? (
            <View
              style={{
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                paddingVertical: 14,
                backgroundColor: "rgba(34,197,94,0.1)",
              }}
            >
              <Text
                style={{ color: colors.success, fontFamily: fonts.displaySemiBold, fontSize: 13 }}
              >
                Already completed
              </Text>
            </View>
          ) : (
            <Button icon="check" onPress={() => void handleComplete()} loading={completing}>
              Complete Quest
            </Button>
          )}
        </View>
      </ScrollView>

      <QuestCompleteModal
        visible={showCompleteModal}
        result={completeResult}
        onContinue={handleModalContinue}
      />
    </SafeAreaView>
  );
}
