import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { xpToNext, STATS } from "@levelup/engine";
import { Icon } from "../../components/Icon";
import { Skeleton, SkeletonCard } from "../../components/Skeleton";
import { Button } from "../../components/Button";
import { LevelBadge } from "../../components/LevelBadge";
import { RankChip } from "../../components/RankChip";
import { StatBar } from "../../components/StatBar";
import { StreakChip } from "../../components/StreakChip";
import { XpBar } from "../../components/XpBar";
import { useSession } from "../../lib/AuthProvider";
import { loadBootstrap } from "../../lib/bootstrap";
import { bootMark } from "../../lib/bootTrace";
import type { ProfileSummary } from "../../lib/profile";
import type { StatsRow } from "../../lib/stats";
import type { StreakRow } from "../../lib/streaks";
import { initials } from "../../lib/questFormat";
import { useFocusLoad } from "../../lib/useFocusLoad";
import { colors, fontSizes, fonts } from "../../theme/tokens";

interface HomeData {
  profile: ProfileSummary;
  stats: StatsRow;
  streak: StreakRow;
  questsCompleted: number;
  questsTotal: number;
  equippedTitleName: string | null;
}

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;

    try {
      const { profile, stats, streak, quests, titles } = await loadBootstrap();
      setData({
        profile,
        stats,
        streak,
        questsCompleted: quests.filter((quest) => quest.status === "completed").length,
        questsTotal: quests.length,
        equippedTitleName: titles.find((title) => title.id === profile.title_id)?.name ?? null,
      });
      setError(null);
      bootMark("home data");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your data.");
    }
  }, [session]);

  const { loading, refreshing, refresh } = useFocusLoad(load);

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

          <View style={{ gap: 10 }}>
            <Skeleton width={80} height={9} />
            <SkeletonCard>
              {[0, 1, 2, 3, 4].map((row) => (
                <View key={row} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Skeleton width={52} height={10} />
                  <Skeleton height={8} radius={4} style={{ flex: 1 }} />
                </View>
              ))}
            </SkeletonCard>
          </View>

          <View style={{ gap: 10 }}>
            <Skeleton width={110} height={9} />
            <SkeletonCard height={76} />
          </View>
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
        <Text style={{ color: colors.danger, fontSize: 14, textAlign: "center" }}>
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

  const { profile, stats, streak, questsCompleted, questsTotal, equippedTitleName } = data;
  const xpMax = xpToNext(profile.level);
  const statValues: Record<(typeof STATS)[number], number> = {
    STR: stats.str,
    AGI: stats.agi,
    VIT: stats.vit,
    INT: stats.int,
    FOCUS: stats.focus,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 4 }}
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

        <View className="mb-2.5 mt-6 flex-row items-center justify-between px-0.5">
          <Text
            style={{
              color: colors.muted,
              fontSize: fontSizes.label,
              fontWeight: "700",
              letterSpacing: 1.4,
            }}
          >
            CORE STATS
          </Text>
        </View>
        <View
          className="gap-3.5 rounded-2xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: "rgba(27,27,47,0.7)" }}
        >
          {STATS.map((stat) => (
            <StatBar key={stat} stat={stat} value={statValues[stat]} />
          ))}
        </View>

        <View className="mb-2.5 mt-6 flex-row items-center justify-between px-0.5">
          <Text
            style={{
              color: colors.muted,
              fontSize: fontSizes.label,
              fontWeight: "700",
              letterSpacing: 1.4,
            }}
          >
            TODAY&apos;S QUESTS
          </Text>
        </View>
        <View
          className="flex-row items-center gap-3 rounded-2xl border p-4"
          style={{ borderColor: colors.border, backgroundColor: "rgba(27,27,47,0.7)" }}
        >
          <View
            className="h-[43px] w-[43px] items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(124,58,237,0.13)" }}
          >
            <Icon
              name={questsTotal > 0 && questsCompleted === questsTotal ? "check" : "quest"}
              size={18}
              color={
                questsTotal > 0 && questsCompleted === questsTotal
                  ? colors.success
                  : colors.violetLight
              }
            />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.displaySemiBold,
                fontSize: fontSizes.body,
              }}
            >
              {questsTotal === 0
                ? "No quests scheduled today"
                : `${questsCompleted} of ${questsTotal} completed`}
            </Text>
            <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
              {questsTotal === 0
                ? "Add activities to see quests here."
                : questsCompleted === questsTotal
                  ? "All done for today. Nice work."
                  : `${questsTotal - questsCompleted} quest${questsTotal - questsCompleted === 1 ? "" : "s"} left.`}
            </Text>
          </View>
        </View>
        <View className="mt-3">
          <Button icon="quest" onPress={() => router.push("/quests")}>
            Open quests
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
