import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { calcQuestXp, xpToNext } from "@levelup/engine";
import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { LevelBadge } from "../../../components/LevelBadge";
import { QuestCard } from "../../../components/QuestCard";
import { RankChip } from "../../../components/RankChip";
import { Skeleton, SkeletonCard } from "../../../components/Skeleton";
import { StreakChip } from "../../../components/StreakChip";
import { XpBar } from "../../../components/XpBar";
import { ApiError } from "../../../lib/api";
import { useSession } from "../../../lib/AuthProvider";
import { invalidateBootstrapCache, loadBootstrap } from "../../../lib/bootstrap";
import { bootMark } from "../../../lib/bootTrace";
import {
  STARTER_TEMPLATE_OPTIONS,
  seedStarterTemplate,
  type StarterTemplateId,
} from "../../../lib/onboarding";
import type { ProfileSummary } from "../../../lib/profile";
import { type QuestBoardItem } from "../../../lib/questBoard";
import {
  bestCaseSourceForMetric,
  formatProgressLabel,
  getCategoryIcon,
  initials,
  progressPercent,
} from "../../../lib/questFormat";
import type { StreakRow } from "../../../lib/streaks";
import { useFocusLoad } from "../../../lib/useFocusLoad";
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

interface HomeData {
  profile: ProfileSummary;
  streak: StreakRow;
  groups: CategoryGroup[];
  hasAnyActivities: boolean;
  equippedTitleName: string | null;
}

/**
 * Home and a separate Quests tab rendered the same `loadBootstrap()` payload twice
 * — Home to show "2 of 5 completed" and a button to the screen that drew the real
 * board. The board is inline here instead, so the count and the thing it counted are
 * the same pixels. Core stats aren't duplicated here either: the Stats tab's radar
 * already plots all five values.
 */
export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedingTemplate, setSeedingTemplate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;

    try {
      const { profile, streak, quests, activityCount, titles } = await loadBootstrap();
      setData({
        profile,
        streak,
        groups: groupByCategory(quests),
        hasAnyActivities: activityCount > 0,
        equippedTitleName: titles.find((title) => title.id === profile.title_id)?.name ?? null,
      });
      setError(null);
      bootMark("home data");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your data.");
    }
  }, [session]);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        {/* Shaped like the real screen below, so arriving data fills this in rather than
            replacing a centred spinner with a whole layout at once. */}
        <View style={{ padding: 20, gap: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Skeleton width={43} height={43} radius={16} />
            <View style={{ gap: 6, flex: 1 }}>
              <Skeleton width={70} height={8} />
              <Skeleton width={120} height={14} />
            </View>
            <Skeleton width={64} height={28} radius={14} />
          </View>

          <SkeletonCard height={166}>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
              <Skeleton width={72} height={72} radius={20} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width={90} height={10} />
                <Skeleton width="70%" height={16} />
                <Skeleton height={8} radius={4} />
                <Skeleton width={120} height={8} />
              </View>
            </View>
          </SkeletonCard>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Skeleton width={110} height={9} style={{ flex: 1 }} />
            <Skeleton width={34} height={34} radius={10} />
            <Skeleton width={34} height={34} radius={10} />
          </View>

          {/* Two groups of two, matching the category grouping the board renders — the
              header row with its progress bar, then the cards under it. */}
          {[0, 1].map((group) => (
            <View key={group} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Skeleton width={74} height={9} />
                <Skeleton height={3} radius={2} style={{ flex: 1 }} />
                <Skeleton width={22} height={9} />
              </View>
              {[0, 1].map((card) => (
                <SkeletonCard key={card} height={84}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Skeleton width={38} height={38} radius={12} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Skeleton width="60%" height={13} />
                      <Skeleton height={6} radius={3} />
                    </View>
                  </View>
                </SkeletonCard>
              ))}
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <Text style={{ color: colors.danger, fontSize: fontSizes.body, textAlign: "center" }}>
          {error ?? "Something went wrong."}
        </Text>
        <Button
          variant="secondary"
          icon="arrow"
          loading={refreshing}
          onPress={() => void refresh()}
        >
          Try again
        </Button>
      </SafeAreaView>
    );
  }

  const { profile, streak, groups, hasAnyActivities, equippedTitleName } = data;
  const xpMax = xpToNext(profile.level);

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
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View
              className="h-[43px] w-[43px] items-center justify-center rounded-2xl"
              style={{
                borderWidth: 1,
                borderColor: "rgba(167,139,250,0.35)",
                backgroundColor: "#241a3f",
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.caption,
                }}
              >
                {initials(profile.username)}
              </Text>
            </View>
            <View className="gap-0.5">
              <Text
                style={{
                  color: colors.muted,
                  fontSize: fontSizes.label,
                  fontWeight: "700",
                  letterSpacing: 1.3,
                }}
              >
                WELCOME BACK
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.bodyLarge,
                }}
              >
                {profile.username}
              </Text>
              {equippedTitleName ? (
                <Text style={{ color: colors.violetLight, fontSize: fontSizes.label }}>
                  {equippedTitleName}
                </Text>
              ) : null}
            </View>
          </View>
          <StreakChip days={streak.current} />
        </View>

        <View
          className="min-h-[166px] flex-row items-center gap-4 overflow-hidden rounded-[23px] border p-5"
          style={{ borderColor: "rgba(124,58,237,0.24)", backgroundColor: "rgba(27,27,47,0.9)" }}
        >
          <LevelBadge level={profile.level} />
          <View className="min-w-0 flex-1 gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <RankChip rank={profile.rank} />
              <Text
                style={{
                  color: colors.muted,
                  fontSize: fontSizes.label,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                }}
              >
                PLAYER RANK
              </Text>
            </View>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.displaySemiBold,
                fontSize: fontSizes.heading,
              }}
            >
              Keep climbing.
            </Text>
            <View className="flex-row justify-between">
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.body,
                }}
              >
                {profile.xp.toLocaleString()} / {xpMax.toLocaleString()} XP
              </Text>
              <Text
                style={{
                  color: colors.violetLight,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.label,
                }}
              >
                {Math.round((profile.xp / xpMax) * 100)}%
              </Text>
            </View>
            <XpBar current={profile.xp} max={xpMax} />
            <Text
              style={{
                color: colors.disabled,
                fontSize: fontSizes.label,
                fontWeight: "700",
                letterSpacing: 0.6,
              }}
            >
              {Math.max(0, xpMax - profile.xp).toLocaleString()} XP TO LEVEL{" "}
              {String(profile.level + 1).padStart(2, "0")}
            </Text>
          </View>
        </View>

        <View className="mb-2.5 mt-6 flex-row items-center px-0.5">
          <Text
            style={{
              flex: 1,
              color: colors.muted,
              fontSize: fontSizes.label,
              fontWeight: "700",
              letterSpacing: 1.4,
            }}
          >
            TODAY&apos;S QUESTS
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

        {!hasAnyActivities && groups.length === 0 ? (
          <View style={{ alignItems: "center", gap: 14, paddingVertical: 36 }}>
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
        ) : groups.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 44 }}>
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
                    streakDays: streak.current,
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
                      tint={item.categoryColor}
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
