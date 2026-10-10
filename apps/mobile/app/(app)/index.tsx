import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { xpToNext, STATS } from "@levelup/engine";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/Button";
import { LevelBadge } from "../../components/LevelBadge";
import { RankChip } from "../../components/RankChip";
import { StatBar } from "../../components/StatBar";
import { StreakChip } from "../../components/StreakChip";
import { XpBar } from "../../components/XpBar";
import { useSession } from "../../lib/AuthProvider";
import { getMyProfile, type ProfileSummary } from "../../lib/profile";
import { getMyStats, type StatsRow } from "../../lib/stats";
import { getMyStreak, type StreakRow } from "../../lib/streaks";
import { colors, fonts } from "../../theme/tokens";

interface HomeData {
  profile: ProfileSummary;
  stats: StatsRow;
  streak: StreakRow;
}

function initials(username: string): string {
  const letters = username
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter((letter): letter is string => Boolean(letter));
  return (letters.slice(0, 2).join("") || username.slice(0, 2)).toUpperCase();
}

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getMyProfile(session.user.id)
      .then(async (profile) => {
        const [stats, streak] = await Promise.all([
          getMyStats(profile.id),
          getMyStreak(profile.id),
        ]);
        if (isMounted) setData({ profile, stats, streak });
      })
      .catch((err: unknown) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Failed to load your data.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

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

  if (error || !data) {
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

  const { profile, stats, streak } = data;
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 4 }}>
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
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 12 }}>
                {initials(profile.username)}
              </Text>
            </View>
            <View className="gap-0.5">
              <Text
                style={{ color: colors.muted, fontSize: 8, fontWeight: "700", letterSpacing: 1.3 }}
              >
                WELCOME BACK
              </Text>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 15 }}>
                {profile.username}
              </Text>
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
                style={{ color: colors.muted, fontSize: 8, fontWeight: "700", letterSpacing: 0.8 }}
              >
                PLAYER RANK
              </Text>
            </View>
            <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 17 }}>
              Keep climbing.
            </Text>
            <View className="flex-row justify-between">
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 9 }}>
                {profile.xp.toLocaleString()} / {xpMax.toLocaleString()} XP
              </Text>
              <Text
                style={{
                  color: colors.violetLight,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: 9,
                }}
              >
                {Math.round((profile.xp / xpMax) * 100)}%
              </Text>
            </View>
            <XpBar current={profile.xp} max={xpMax} />
            <Text
              style={{ color: colors.disabled, fontSize: 7, fontWeight: "700", letterSpacing: 0.6 }}
            >
              {Math.max(0, xpMax - profile.xp).toLocaleString()} XP TO LEVEL{" "}
              {String(profile.level + 1).padStart(2, "0")}
            </Text>
          </View>
        </View>

        <View className="mb-2.5 mt-6 flex-row items-center justify-between px-0.5">
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 }}>
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
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 }}>
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
            <Icon name="quest" size={18} color={colors.violetLight} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 11 }}>
              Your quest list lives in the Quests tab
            </Text>
            <Text style={{ color: colors.muted, fontSize: 9 }}>
              Open it to see and complete today&apos;s quests.
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
