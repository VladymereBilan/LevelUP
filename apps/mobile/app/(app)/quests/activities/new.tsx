import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ActivityForm, type ActivityFormValues } from "../../../../components/ActivityForm";
import { Icon } from "../../../../components/Icon";
import { ApiError } from "../../../../lib/api";
import { createActivity } from "../../../../lib/activities";
import { useSession } from "../../../../lib/AuthProvider";
import { createCategory, listMyCategories, type CategoryRow } from "../../../../lib/categories";
import { invalidateBootstrapCache } from "../../../../lib/bootstrap";
import { getMyStreak } from "../../../../lib/streaks";
import { useFocusLoad } from "../../../../lib/useFocusLoad";
import { colors, fonts } from "../../../../theme/tokens";

export default function NewActivityScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const userId = session.user.id;
    const [myCategories, streak] = await Promise.all([
      listMyCategories(userId),
      getMyStreak(userId).catch(() => null),
    ]);
    setCategories(myCategories);
    setStreakDays(streak?.current ?? 0);
  }, [session]);

  const { loading } = useFocusLoad(load);

  async function handleSubmit(values: ActivityFormValues) {
    if (!session) return;
    const userId = session.user.id;
    setSubmitting(true);
    setError(null);

    try {
      const categoryId =
        values.category.kind === "existing"
          ? values.category.categoryId
          : (await createCategory(userId, values.category.input)).id;

      await createActivity(userId, {
        categoryId,
        name: values.name,
        metricType: values.metricType,
        target: values.target,
        schedule: values.schedule,
        difficulty: values.difficulty,
      });

      invalidateBootstrapCache();
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save activity. Try again.");
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
        <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 15 }}>
          Add Activity
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.violet} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }}>
          <ActivityForm
            categories={categories}
            allowNewCategory
            streakDays={streakDays}
            submitting={submitting}
            submitLabel="Save Activity"
            error={error}
            onSubmit={(values) => void handleSubmit(values)}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
