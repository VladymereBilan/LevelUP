import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "../../components/BarChart";
import { Heatmap } from "../../components/Heatmap";
import { Icon } from "../../components/Icon";
import { RadarChart } from "../../components/RadarChart";
import { RankChip } from "../../components/RankChip";
import { StreakChip } from "../../components/StreakChip";
import { useSession } from "../../lib/AuthProvider";
import { getMyProfile, type ProfileSummary } from "../../lib/profile";
import { getLifetimeTotals, getStreakHeatmap, getWeeklyXpSummary } from "../../lib/statsProgress";
import { getMyStats, type StatsRow } from "../../lib/stats";
import { getMyStreak, type StreakRow } from "../../lib/streaks";
import {
  describeTitleUnlockRule,
  listMyTitles,
  titleIcon,
  type TitleDisplay,
} from "../../lib/titles";
import { useFocusLoad } from "../../lib/useFocusLoad";
import { colors, fonts } from "../../theme/tokens";

interface StatsData {
  profile: ProfileSummary;
  stats: StatsRow;
  streak: StreakRow;
  totalXp: number;
  questsDone: number;
  weekDays: { label: string; xp: number }[];
  totalThisWeek: number;
  percentChangeFromPriorWeek: number | null;
  heatmap: { date: string; level: 0 | 1 | 2 | 3 | 4 }[];
  titles: TitleDisplay[];
}

export default function StatsScreen() {
  const { session } = useSession();
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const userId = session.user.id;

    try {
      const profile = await getMyProfile(userId);
      const [stats, streak, lifetime, weekly, heatmap, titles] = await Promise.all([
        getMyStats(userId),
        getMyStreak(userId),
        getLifetimeTotals(userId),
        getWeeklyXpSummary(userId, profile.timezone),
        getStreakHeatmap(userId, profile.timezone),
        listMyTitles(userId),
      ]);

      setData({
        profile,
        stats,
        streak,
        totalXp: lifetime.totalXp,
        questsDone: lifetime.questsDone,
        weekDays: weekly.days.map((d) => ({ label: d.label, xp: d.xp })),
        totalThisWeek: weekly.totalThisWeek,
        percentChangeFromPriorWeek: weekly.percentChangeFromPriorWeek,
        heatmap: heatmap.map((d) => ({ date: d.date, level: d.level })),
        titles,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats.");
    }
  }, [session]);

  const { loading, refreshing, refresh } = useFocusLoad(load);

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

  if (!data) {
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
        <Text style={{ color: colors.danger, fontSize: 14, textAlign: "center" }}>
          {error ?? "Something went wrong."}
        </Text>
      </SafeAreaView>
    );
  }

  const { profile, stats, streak, totalXp, questsDone, weekDays, totalThisWeek } = data;
  const statValues = {
    STR: stats.str,
    AGI: stats.agi,
    VIT: stats.vit,
    INT: stats.int,
    FOCUS: stats.focus,
  };
  const unlockedCount = data.titles.filter((t) => t.unlocked).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 18 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.violet}
          />
        }
      >
        <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 22 }}>
          Stats &amp; Progress
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.7)",
              gap: 4,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}>
              TOTAL XP
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 22 }}>
              {totalXp.toLocaleString()}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>
              {data.percentChangeFromPriorWeek === null ? (
                "This week"
              ) : (
                <>
                  <Text
                    style={{
                      color: data.percentChangeFromPriorWeek >= 0 ? colors.success : colors.danger,
                    }}
                  >
                    {data.percentChangeFromPriorWeek >= 0 ? "+" : ""}
                    {data.percentChangeFromPriorWeek}%
                  </Text>{" "}
                  this week
                </>
              )}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.7)",
              gap: 4,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}>
              QUESTS DONE
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 22 }}>
              {questsDone.toLocaleString()}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>Since awakening</Text>
          </View>
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(27,27,47,0.7)",
            gap: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View>
              <Text
                style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
              >
                WEEKLY ACTIVITY
              </Text>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}>
                XP earned
              </Text>
            </View>
            <Text
              style={{ color: colors.violetLight, fontFamily: fonts.displaySemiBold, fontSize: 15 }}
            >
              {totalThisWeek.toLocaleString()}{" "}
              <Text style={{ color: colors.muted, fontSize: 10 }}>XP</Text>
            </Text>
          </View>
          <BarChart data={weekDays.map((d) => ({ label: d.label, value: d.xp }))} />
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(27,27,47,0.7)",
            gap: 10,
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <View>
              <Text
                style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
              >
                ATTRIBUTE BALANCE
              </Text>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}>
                Core stats
              </Text>
            </View>
            <RankChip rank={profile.rank} />
          </View>
          <RadarChart values={statValues} />
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(27,27,47,0.7)",
            gap: 12,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <View>
              <Text
                style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }}
              >
                CONSISTENCY
              </Text>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}>
                Streak calendar
              </Text>
            </View>
            <StreakChip days={streak.current} />
          </View>
          <Heatmap days={data.heatmap} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.disabled, fontSize: 9 }}>5 weeks ago</Text>
            <Text style={{ color: colors.disabled, fontSize: 9 }}>Today</Text>
          </View>
        </View>

        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 }}>
            TITLES UNLOCKED
          </Text>
          <Text style={{ color: colors.muted, fontSize: 10 }}>
            {unlockedCount} of {data.titles.length}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {data.titles.map((title) => (
            <View
              key={title.id}
              style={{
                width: "47%",
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(27,27,47,0.62)",
                gap: 6,
                opacity: title.unlocked ? 1 : 0.55,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(124,58,237,0.14)",
                }}
              >
                <Icon name={titleIcon(title.unlockRule)} size={15} color={colors.violetLight} />
              </View>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 12 }}>
                {title.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 9 }}>
                {title.unlocked ? "Unlocked" : describeTitleUnlockRule(title.unlockRule)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
