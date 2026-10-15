import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Stat } from "@levelup/engine";
import { Button } from "../../../../../components/Button";
import { CategoryFields, type CategoryFieldValues } from "../../../../../components/CategoryFields";
import { Icon } from "../../../../../components/Icon";
import { useSession } from "../../../../../lib/AuthProvider";
import { invalidateBootstrapCache } from "../../../../../lib/bootstrap";
import {
  conflictingCategoryName,
  listMyCategories,
  updateCategory,
  type CategoryRow,
} from "../../../../../lib/categories";
import { getCategoryIcon } from "../../../../../lib/questFormat";
import { useFocusLoad } from "../../../../../lib/useFocusLoad";
import { colors, fontSizes, fonts } from "../../../../../theme/tokens";

/**
 * Renaming exists because two categories can end up sharing a name, and until now nothing
 * could tell them apart or change either one. Deliberately edit-only: deleting a category
 * cascades to its activities and their quest history, which is a separate decision from
 * "this one is called the wrong thing".
 */
export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [values, setValues] = useState<CategoryFieldValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const mine = await listMyCategories(session.user.id);
      setCategories(mine);
      const current = mine.find((category) => category.id === id);
      if (!current) {
        setError("That category no longer exists.");
        return;
      }
      // Seeded once, on load: re-seeding on every focus would discard edits in progress.
      setValues((existing) =>
        existing
          ? existing
          : {
              name: current.name,
              icon: getCategoryIcon(current.icon),
              color: current.color,
              stat: current.stat as Stat,
            },
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load that category.");
    }
  }, [session, id]);

  const { loading } = useFocusLoad(load);

  const conflict = values ? conflictingCategoryName(categories, id, values.name) : undefined;
  const nameError =
    values && values.name.trim().length === 0
      ? "Category name is required."
      : conflict
        ? `You already have a category called "${conflict.name}".`
        : null;

  async function handleSave() {
    if (!values || nameError) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateCategory(id, {
        name: values.name.trim(),
        color: values.color,
        icon: values.icon,
        stat: values.stat,
      });
      invalidateBootstrapCache();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save that category.");
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
          <Icon name="arrow" size={15} color={colors.muted} />
        </Pressable>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: fontSizes.title,
          }}
        >
          Edit Category
        </Text>
      </View>

      {loading || !values ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          {error ? (
            <Text style={{ color: colors.danger, fontSize: fontSizes.body }}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.violet} />
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <CategoryFields values={values} onChange={setValues} showStatWarning />

          {nameError ? (
            <Text
              testID="category-name-error"
              style={{ color: colors.danger, fontSize: fontSizes.label }}
            >
              {nameError}
            </Text>
          ) : null}
          {error ? (
            <Text style={{ color: colors.danger, fontSize: fontSizes.caption }}>{error}</Text>
          ) : null}

          <Button
            testID="save-category"
            icon="check"
            loading={submitting}
            disabled={nameError !== null}
            onPress={() => void handleSave()}
          >
            Save Category
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
