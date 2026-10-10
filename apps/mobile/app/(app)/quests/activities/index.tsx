import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Schedule } from "@levelup/engine";
import { Chip } from "../../../../components/Chip";
import { Icon } from "../../../../components/Icon";
import { listMyActivities, setActivityArchived, type ActivityRow } from "../../../../lib/activities";
import { useSession } from "../../../../lib/AuthProvider";
import { listMyCategories, type CategoryRow } from "../../../../lib/categories";
import { invalidateQuestBoardCache } from "../../../../lib/questBoard";
import { getCategoryIcon } from "../../../../lib/questFormat";
import { useFocusLoad, type LoadMode } from "../../../../lib/useFocusLoad";
import { colors, fonts } from "../../../../theme/tokens";

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scheduleSummary(schedule: Schedule): string {
  if (schedule.kind === "daily") return "Daily";
  if (schedule.kind === "weekdays") {
    return (schedule.weekdays ?? []).map((d) => WEEKDAY_ABBR[d]).join(", ") || "Weekdays";
  }
  return `One-time: ${schedule.date ?? "?"}`;
}

export default function ManageActivitiesScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(
    async (_mode: LoadMode) => {
      if (!session) return;
      const userId = session.user.id;
      setError(null);
      try {
        const [myActivities, myCategories] = await Promise.all([
          listMyActivities(userId, { archived: showArchived }),
          listMyCategories(userId),
        ]);
        setActivities(myActivities);
        setCategories(myCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activities.");
      }
    },
    [session, showArchived],
  );

  const { loading, refresh } = useFocusLoad(load);

  async function handleToggleArchived(activity: ActivityRow) {
    setPendingId(activity.id);
    try {
      await setActivityArchived(activity.id, !activity.archived);
      invalidateQuestBoardCache();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update activity.");
    } finally {
      setPendingId(null);
    }
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

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
        <Text
          style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 15, flex: 1 }}
        >
          Manage Activities
        </Text>
        <Pressable
          onPress={() => router.push("/quests/activities/new")}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(167,139,250,0.35)",
            backgroundColor: "rgba(124,58,237,0.14)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="plus" size={16} color={colors.violetLight} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Chip label="Active" selected={!showArchived} onPress={() => setShowArchived(false)} />
        <Chip label="Archived" selected={showArchived} onPress={() => setShowArchived(true)} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.violet} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40, flexGrow: 1 }}>
          {error ? (
            <Text style={{ color: colors.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>
          ) : null}

          {!error && activities && activities.length === 0 ? (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 60 }}>
              <Icon name="quest" size={24} color={colors.disabled} />
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
                {showArchived ? "No archived activities." : "No activities yet."}
              </Text>
            </View>
          ) : null}

          {activities?.map((activity) => {
            const category = categoryById.get(activity.category_id);
            return (
              <View
                key={activity.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: "rgba(27,27,47,0.7)",
                  opacity: activity.archived ? 0.6 : 1,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(124,58,237,0.14)",
                  }}
                >
                  <Icon
                    name={category ? getCategoryIcon(category.icon) : "sparkles"}
                    size={17}
                    color={colors.violetLight}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text
                    style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}
                  >
                    {activity.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>
                    {category?.name ?? "Uncategorized"} - {scheduleSummary(activity.schedule)}
                  </Text>
                </View>
                {!activity.archived ? (
                  <Pressable
                    onPress={() => router.push(`/quests/activities/${activity.id}`)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="edit" size={15} color={colors.muted} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void handleToggleArchived(activity)}
                  disabled={pendingId === activity.id}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pendingId === activity.id ? 0.5 : 1,
                  }}
                >
                  <View style={activity.archived ? { transform: [{ rotate: "180deg" }] } : undefined}>
                    <Icon
                      name={activity.archived ? "arrow" : "minus"}
                      size={15}
                      color={activity.archived ? colors.success : colors.danger}
                    />
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
