import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Schedule } from "@levelup/engine";
import { SCHEDULE_PRESET_SUMMARIES, presetForSchedule } from "../../../../../lib/schedulePresets";
import { BottomSheet } from "../../../../../components/BottomSheet";
import { Button } from "../../../../../components/Button";
import { Chip } from "../../../../../components/Chip";
import { Icon } from "../../../../../components/Icon";
import {
  countCompletedQuests,
  deleteActivity,
  listMyActivities,
  removalFor,
  setActivityArchived,
  type ActivityRow,
} from "../../../../../lib/activities";
import { useSession } from "../../../../../lib/AuthProvider";
import { listMyCategories, type CategoryRow } from "../../../../../lib/categories";
import { invalidateBootstrapCache } from "../../../../../lib/bootstrap";
import { getCategoryIcon } from "../../../../../lib/questFormat";
import { useFocusLoad, type LoadMode } from "../../../../../lib/useFocusLoad";
import { colors, fontSizes, fonts } from "../../../../../theme/tokens";

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Named the same way the form named it, so an activity set up as "Weekends" doesn't read
 * back as "Sun, Sat" here. Only a genuinely custom set is spelled out day by day. */
function scheduleSummary(schedule: Schedule): string {
  const preset = presetForSchedule(schedule);
  if (preset === "custom") {
    return (schedule.weekdays ?? []).map((d) => WEEKDAY_ABBR[d]).join(", ") || "No days";
  }
  if (preset === "one_off") return `One-time: ${schedule.date ?? "?"}`;
  return SCHEDULE_PRESET_SUMMARIES[preset];
}

export default function ManageActivitiesScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ActivityRow | null>(null);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);

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
      invalidateBootstrapCache();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update activity.");
    } finally {
      setPendingId(null);
    }
  }

  /**
   * Checked here rather than from the list, because the row only knows what the activity is,
   * not what it has been used for. An activity with completed quests can only be archived:
   * quests cascade on delete, so removing it would retroactively shrink the streak calendar,
   * the challenge counts and the lifetime total.
   */
  async function askToDelete(activity: ActivityRow) {
    setPendingId(activity.id);
    setError(null);
    try {
      const removal = removalFor(await countCompletedQuests(activity.id));
      if (removal.kind === "delete") {
        setConfirmNotice(null);
      } else {
        setConfirmNotice(
          `${activity.name} has ${removal.completedQuests} completed quest${
            removal.completedQuests === 1 ? "" : "s"
          }. Deleting it would remove them from your stats, so it can only be archived.`,
        );
      }
      setConfirming(activity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check that activity.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(activity: ActivityRow) {
    setPendingId(activity.id);
    try {
      await deleteActivity(activity.id);
      invalidateBootstrapCache();
      setConfirming(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete activity.");
      setConfirming(null);
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
          style={{
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: fontSizes.bodyLarge,
            flex: 1,
          }}
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
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40, flexGrow: 1 }}
        >
          {/* Categories are edited from here rather than from a tab of their own: this is
              already the screen someone opens to tidy up what they are tracking. */}
          {categories.length > 0 ? (
            <View style={{ gap: 10, marginBottom: 22 }}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: fontSizes.label,
                  fontWeight: "700",
                  letterSpacing: 1.4,
                }}
              >
                CATEGORIES
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    testID={`edit-category-${category.id}`}
                    label={category.name}
                    icon={getCategoryIcon(category.icon)}
                    tint={category.color}
                    selected={false}
                    onPress={() => router.push(`/quests/categories/${category.id}`)}
                  />
                ))}
              </View>
              <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                Tap one to rename it or change its colour, icon or stat.
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text
              style={{ color: colors.danger, fontSize: fontSizes.caption, textAlign: "center" }}
            >
              {error}
            </Text>
          ) : null}

          {!error && activities && activities.length === 0 ? (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 60 }}>
              <Icon name="quest" size={24} color={colors.disabled} />
              <Text
                style={{ color: colors.muted, fontSize: fontSizes.caption, textAlign: "center" }}
              >
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
                    style={{
                      color: colors.text,
                      fontFamily: fonts.displaySemiBold,
                      fontSize: fontSizes.body,
                    }}
                  >
                    {activity.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
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
                  testID={`archive-${activity.id}`}
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
                  <View
                    style={activity.archived ? { transform: [{ rotate: "180deg" }] } : undefined}
                  >
                    <Icon
                      name={activity.archived ? "arrow" : "minus"}
                      size={15}
                      color={activity.archived ? colors.success : colors.danger}
                    />
                  </View>
                </Pressable>
                <Pressable
                  testID={`delete-${activity.id}`}
                  onPress={() => void askToDelete(activity)}
                  disabled={pendingId === activity.id}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                    opacity: pendingId === activity.id ? 0.5 : 1,
                  }}
                >
                  <Icon name="trash" size={15} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      <BottomSheet visible={confirming !== null} onClose={() => setConfirming(null)}>
        <View style={{ gap: 14 }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.displaySemiBold,
              fontSize: fontSizes.bodyLarge,
            }}
          >
            {confirmNotice ? "Archive this activity?" : "Delete this activity?"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: fontSizes.body, lineHeight: 20 }}>
            {confirmNotice ??
              `${confirming?.name ?? "This activity"} has never been completed, so deleting it removes nothing from your stats. This cannot be undone.`}
          </Text>
          {confirmNotice ? (
            <Button
              testID="confirm-archive"
              variant="secondary"
              icon="minus"
              loading={pendingId === confirming?.id}
              onPress={() => {
                const activity = confirming;
                setConfirming(null);
                if (activity && !activity.archived) void handleToggleArchived(activity);
              }}
            >
              Archive instead
            </Button>
          ) : (
            <Button
              testID="confirm-delete"
              variant="danger"
              icon="trash"
              loading={pendingId === confirming?.id}
              onPress={() => confirming && void handleDelete(confirming)}
            >
              Delete permanently
            </Button>
          )}
          <Button variant="ghost" onPress={() => setConfirming(null)}>
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
