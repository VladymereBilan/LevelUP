import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { calcQuestXp } from "@levelup/engine";
import { Icon } from "../../../components/Icon";
import { QuestCard } from "../../../components/QuestCard";
import { useSession } from "../../../lib/AuthProvider";
import { loadTodaysQuestBoard, type QuestBoardItem } from "../../../lib/questBoard";
import { getMyStreak } from "../../../lib/streaks";
import { formatProgressLabel, getCategoryIcon, progressPercent } from "../../../lib/questFormat";
import { colors, fonts } from "../../../theme/tokens";

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  items: QuestBoardItem[];
}

function groupByCategory(items: QuestBoardItem[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  for (const item of items) {
    const existing = groups.get(item.categoryId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.categoryId, {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        items: [item],
      });
    }
  }
  return [...groups.values()];
}

export default function QuestsScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<CategoryGroup[] | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts: { isRefresh: boolean }) => {
      if (!session) return;
      if (opts.isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [board, streak] = await Promise.all([loadTodaysQuestBoard(), getMyStreak(session.user.id)]);
        setGroups(groupByCategory(board.items));
        setStreakDays(streak.current);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quests.");
      } finally {
        if (opts.isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    async function run() {
      await load({ isRefresh: false });
    }
    void run();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color={colors.violet} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ isRefresh: true })}
            tintColor={colors.violet}
          />
        }
      >
        <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 22, marginBottom: 16 }}>
          Today&apos;s Quests
        </Text>

        {error ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
            <Icon name="quest" size={28} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 13, textAlign: "center" }}>{error}</Text>
          </View>
        ) : !groups || groups.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 60 }}>
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "rgba(124,58,237,0.14)" }}
            >
              <Icon name="quest" size={24} color={colors.violetLight} />
            </View>
            <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 15 }}>
              No quests today
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", maxWidth: 260 }}>
              Add activities from your categories and they&apos;ll show up here on their scheduled days.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.categoryId} className="mb-5">
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.4,
                  marginBottom: 10,
                }}
              >
                {group.categoryName.toUpperCase()}
              </Text>
              {group.items.map((item) => {
                const xp = calcQuestXp({
                  difficulty: item.difficulty,
                  source: "manual",
                  streakDays,
                });
                return (
                  <QuestCard
                    key={item.questId}
                    title={item.title}
                    progressLabel={formatProgressLabel(item.metricType, item.progress, item.target)}
                    percent={progressPercent(item.metricType, item.progress, item.target)}
                    xp={xp}
                    difficulty={item.difficulty}
                    icon={getCategoryIcon(item.categoryIcon)}
                    complete={item.status === "completed"}
                    onPress={() => router.push(`/quests/${item.questId}`)}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
