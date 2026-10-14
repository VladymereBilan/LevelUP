import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { calcQuestXp } from "@levelup/engine";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { QuestCard } from "../../../components/QuestCard";
import { ApiError } from "../../../lib/api";
import { useSession } from "../../../lib/AuthProvider";
import { invalidateBootstrapCache, loadBootstrap } from "../../../lib/bootstrap";
import {
  STARTER_TEMPLATE_OPTIONS,
  seedStarterTemplate,
  type StarterTemplateId,
} from "../../../lib/onboarding";
import { type QuestBoardItem } from "../../../lib/questBoard";
import {
  formatProgressLabel,
  getCategoryIcon,
  progressPercent,
  bestCaseSourceForMetric,
} from "../../../lib/questFormat";
import { useFocusLoad, type LoadMode } from "../../../lib/useFocusLoad";
import { colors, fontSizes, fonts } from "../../../theme/tokens";

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
  const [hasAnyActivities, setHasAnyActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingTemplate, setSeedingTemplate] = useState<string | null>(null);

  const load = useCallback(
    async (_mode: LoadMode) => {
      if (!session) return;
      setError(null);

      try {
        const { quests, streak, activityCount } = await loadBootstrap();
        setGroups(groupByCategory(quests));
        setStreakDays(streak.current);
        setHasAnyActivities(activityCount > 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quests.");
      }
    },
    [session],
  );

  const { loading, refreshing, refresh } = useFocusLoad(load);

  async function handleChooseTemplate(templateId: StarterTemplateId) {
    setSeedingTemplate(templateId);
    setError(null);
    try {
      await seedStarterTemplate(templateId);
      // The next load generates the new template's quests itself — /api/bootstrap
      // runs generation before it reads.
      invalidateBootstrapCache();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set up that template.");
    } finally {
      setSeedingTemplate(null);
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.violet}
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: fonts.displaySemiBold,
              fontSize: fontSizes.title,
            }}
          >
            Today&apos;s Quests
          </Text>
          <Pressable
            onPress={() => router.push("/quests/activities")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Icon name="edit" size={15} color={colors.muted} />
          </Pressable>
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

        {error && !groups ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
            <Icon name="quest" size={28} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: fontSizes.body, textAlign: "center" }}>
              {error}
            </Text>
          </View>
        ) : !hasAnyActivities && (!groups || groups.length === 0) ? (
          <View style={{ alignItems: "center", gap: 14, paddingVertical: 48 }}>
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "rgba(124,58,237,0.14)" }}
            >
              <Icon name="quest" size={24} color={colors.violetLight} />
            </View>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.displaySemiBold,
                fontSize: fontSizes.bodyLarge,
              }}
            >
              No activities yet
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: fontSizes.label,
                textAlign: "center",
                maxWidth: 260,
              }}
            >
              Choose a template to start with ready-made quests, or build your own.
            </Text>
            {error ? (
              <Text
                style={{ color: colors.danger, fontSize: fontSizes.label, textAlign: "center" }}
              >
                {error}
              </Text>
            ) : null}
            <View style={{ width: "100%", gap: 10, marginTop: 6 }}>
              {STARTER_TEMPLATE_OPTIONS.map((template) => (
                <Button
                  key={template.id}
                  variant="secondary"
                  icon={template.icon}
                  loading={seedingTemplate === template.id}
                  disabled={seedingTemplate !== null}
                  onPress={() => void handleChooseTemplate(template.id)}
                >
                  {template.name}
                </Button>
              ))}
              <Button
                variant="ghost"
                icon="plus"
                disabled={seedingTemplate !== null}
                onPress={() => router.push("/quests/activities/new")}
              >
                Add your own activity
              </Button>
            </View>
          </View>
        ) : !groups || groups.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 60 }}>
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "rgba(124,58,237,0.14)" }}
            >
              <Icon name="quest" size={24} color={colors.violetLight} />
            </View>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.displaySemiBold,
                fontSize: fontSizes.bodyLarge,
              }}
            >
              No quests today
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: fontSizes.label,
                textAlign: "center",
                maxWidth: 260,
              }}
            >
              Nothing scheduled for today. Add another activity, or check back tomorrow.
            </Text>
          </View>
        ) : (
          groups.map((group) => {
            // A category is how someone models a routine — "Push Day" with five exercises in
            // it — so the header carries the routine's own progress. Without it the group was
            // a bare caption and finishing a whole session read no differently from finishing
            // one exercise of it.
            const done = group.items.filter((item) => item.status === "completed").length;
            const allDone = done === group.items.length;
            return (
              <View key={group.categoryId} className="mb-5">
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: fontSizes.label,
                      fontWeight: "700",
                      letterSpacing: 1.4,
                    }}
                  >
                    {group.categoryName.toUpperCase()}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      overflow: "hidden",
                      backgroundColor: "rgba(148,163,184,0.16)",
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.round((done / group.items.length) * 100)}%`,
                        height: "100%",
                        backgroundColor: allDone ? colors.success : colors.violet,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      color: allDone ? colors.success : colors.muted,
                      fontSize: fontSizes.label,
                      fontWeight: "700",
                    }}
                  >
                    {done}/{group.items.length}
                  </Text>
                </View>
                {group.items.map((item) => {
                  const xp = calcQuestXp({
                    difficulty: item.difficulty,
                    source: bestCaseSourceForMetric(item.metricType),
                    streakDays,
                  });
                  return (
                    <QuestCard
                      key={item.questId}
                      title={item.title}
                      progressLabel={formatProgressLabel(
                        item.metricType,
                        item.progress,
                        item.target,
                      )}
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
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
