import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityForm, type ActivityFormValues } from "../../../../components/ActivityForm";
import { Icon } from "../../../../components/Icon";
import { ApiError } from "../../../../lib/api";
import { getActivity, updateActivity, type ActivityRow } from "../../../../lib/activities";
import { useSession } from "../../../../lib/AuthProvider";
import { listMyCategories, type CategoryRow } from "../../../../lib/categories";
import { invalidateBootstrapCache } from "../../../../lib/bootstrap";
import { getMyStreak } from "../../../../lib/streaks";
import { useFocusLoad } from "../../../../lib/useFocusLoad";
import { colors, fontSizes, fonts } from "../../../../theme/tokens";

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const userId = session.user.id;
    setLoadError(null);
    try {
      const [found, myCategories, streak] = await Promise.all([
        getActivity(id),
        listMyCategories(userId),
        getMyStreak(userId).catch(() => null),
      ]);
      if (!found) {
        setLoadError("Activity not found.");
        return;
      }
      setActivity(found);
      setCategories(myCategories);
      setStreakDays(streak?.current ?? 0);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load activity.");
    }
  }, [session, id]);

  const { loading } = useFocusLoad(load);

  async function handleSubmit(values: ActivityFormValues) {
    if (values.category.kind !== "existing") return;
    setSubmitting(true);
    setError(null);

    try {
      await updateActivity(id, {
        categoryId: values.category.categoryId,
        name: values.name,
        metricType: values.metricType,
        target: values.target,
        schedule: values.schedule,
        difficulty: values.difficulty,
      });

      invalidateBootstrapCache();
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save changes. Try again.");
      setSubmitting(false);
    }
  }

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
          }}
        >
          Edit Activity
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.violet} />
        </View>
      ) : loadError || !activity ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: colors.danger, fontSize: 14, textAlign: "center" }}>
            {loadError ?? "Activity not found."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}>
          <ActivityForm
            categories={categories}
            allowNewCategory={false}
            initialValues={{
              categoryId: activity.category_id,
              name: activity.name,
              metricType: activity.metric_type,
              target: activity.target_value,
              schedule: activity.schedule,
              difficulty: activity.difficulty,
            }}
            streakDays={streakDays}
            submitting={submitting}
            submitLabel="Save Changes"
            error={error}
            onSubmit={(values) => void handleSubmit(values)}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
