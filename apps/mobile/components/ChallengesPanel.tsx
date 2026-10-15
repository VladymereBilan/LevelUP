import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";
import { listChallenges, type ChallengeRow, type ChallengeStatus } from "../lib/challenges";
import { useFocusLoad } from "../lib/useFocusLoad";
import { colors, fontSizes, fonts, gradient } from "../theme/tokens";

type Filter = "active" | "upcoming" | "ended";

const FILTER_STATUSES: Record<Filter, readonly ChallengeStatus[]> = {
  active: ["active"],
  upcoming: ["upcoming"],
  ended: ["completed", "failed"],
};

const FILTER_LABELS: Record<Filter, string> = {
  active: "Active",
  upcoming: "Upcoming",
  ended: "Completed",
};

type Tier = "WEEKLY" | "MONTHLY" | "ELITE";

/** No tier column exists on `challenges` — reward size is a reasonable, fully generic stand-
 * in (never branches on a specific challenge's name/id) for "how big a deal is this". */
function challengeTier(rewardXp: number): Tier {
  if (rewardXp > 1500) return "ELITE";
  if (rewardXp > 800) return "MONTHLY";
  return "WEEKLY";
}

const TIER_TONE: Record<Tier, { color: string; icon: IconName }> = {
  WEEKLY: { color: colors.violet, icon: "flame" },
  MONTHLY: { color: colors.blue, icon: "focus" },
  ELITE: { color: colors.warning, icon: "trophy" },
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

function formatDuration(ms: number): string {
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;
  return "<1h";
}

function statusLabel(challenge: ChallengeRow, now: number): string {
  const startsAtMs = new Date(challenge.startsAt).getTime();
  const endsAtMs = new Date(challenge.endsAt).getTime();

  switch (challenge.status) {
    case "upcoming":
      return `Starts in ${formatDuration(startsAtMs - now)}`;
    case "active":
      return `${formatDuration(endsAtMs - now)} left`;
    case "completed":
      return "Completed";
    case "failed":
      return "Not met";
  }
}

interface ChallengesData {
  rows: ChallengeRow[];
  /** Captured once per load (not read via Date.now() during render — react-hooks/purity
   * disallows calling impure functions in the render body). "Time remaining" can lag behind
   * the wall clock by up to a focus/refresh cycle, same as every other live-updating value
   * on this screen. */
  loadedAtMs: number;
}

/**
 * Survives unmount, so toggling the Stats segment away and back renders the last
 * result immediately and revalidates behind it, instead of flashing a spinner every
 * time. Module-scoped for the same reason `lib/bootstrap.ts`'s cache is — it has to
 * outlive the component reading it. Deliberately has no TTL: the MMKV + TanStack
 * Query layer replaces this wholesale.
 */
let cachedChallenges: ChallengesData | null = null;

/**
 * The former Challenges tab, as a panel under the Stats tab's segmented control.
 * Not mounted until its segment is first selected, which keeps
 * `GET /api/challenges` off the request path of every Stats visit — `useFocusLoad`
 * fires on mount here, the screen around it already being focused.
 */
export function ChallengesPanel() {
  const [data, setData] = useState<ChallengesData | null>(cachedChallenges);
  const [filter, setFilter] = useState<Filter>("active");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { challenges: rows } = await listChallenges();
      cachedChallenges = { rows, loadedAtMs: Date.now() };
      setData(cachedChallenges);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges.");
    }
  }, []);

  const { loading, refreshing, refresh } = useFocusLoad(load);

  if (loading && !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
  }

  if (!data) {
    return (
      <View
        style={{
          flex: 1,
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
      </View>
    );
  }

  const { rows: challenges, loadedAtMs: now } = data;
  const activeCount = challenges.filter((c) => c.status === "active").length;
  const visible = challenges.filter((c) => FILTER_STATUSES[filter].includes(c.status));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 36, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.violet}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ flex: 1, color: colors.muted, fontSize: fontSizes.label }}>
          Limited-time objectives built to test your consistency.
        </Text>
        <Text
          style={{
            color: colors.violetLight,
            fontSize: fontSizes.label,
            fontWeight: "700",
            letterSpacing: 0.8,
            backgroundColor: "rgba(124,58,237,0.14)",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          {activeCount} ACTIVE
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => {
          const selected = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: selected ? "rgba(167,139,250,0.5)" : colors.border,
                backgroundColor: selected ? "rgba(124,58,237,0.16)" : "transparent",
              }}
            >
              <Text
                style={{
                  color: selected ? colors.text : colors.muted,
                  fontSize: fontSizes.caption,
                  fontFamily: selected ? fonts.bodySemiBold : fonts.body,
                }}
              >
                {FILTER_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={{ color: colors.danger, fontSize: fontSizes.label, textAlign: "center" }}>
          {error}
        </Text>
      ) : null}

      {visible.length === 0 ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 48 }}>
          <Icon name="trophy" size={24} color={colors.disabled} />
          <Text style={{ color: colors.muted, fontSize: fontSizes.caption, textAlign: "center" }}>
            No {FILTER_LABELS[filter].toLowerCase()} challenges right now.
          </Text>
        </View>
      ) : (
        visible.map((challenge) => {
          const tier = challengeTier(challenge.rewardXp);
          const tone = TIER_TONE[tier];
          const percent = Math.min(
            100,
            Math.round((challenge.progress / challenge.targetValue) * 100),
          );
          const ended = challenge.status === "completed" || challenge.status === "failed";

          return (
            <View
              key={challenge.id}
              style={{
                padding: 16,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(27,27,47,0.75)",
                gap: 10,
                opacity: challenge.status === "upcoming" ? 0.7 : 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: `${tone.color}22`,
                  }}
                >
                  <Icon name={tone.icon} size={19} color={tone.color} />
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: tone.color,
                      fontSize: fontSizes.label,
                      fontWeight: "700",
                      letterSpacing: 0.6,
                    }}
                  >
                    {tier} CHALLENGE
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label, marginTop: 2 }}>
                    {statusLabel(challenge, now)}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.bodyLarge,
                }}
              >
                {challenge.name}
              </Text>
              {challenge.description ? (
                <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                  {challenge.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.muted, fontSize: fontSizes.label, fontWeight: "700" }}>
                  PROGRESS
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.displaySemiBold,
                    fontSize: fontSizes.body,
                  }}
                >
                  {challenge.progress} / {challenge.targetValue} QUESTS
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: "rgba(11,11,20,0.85)",
                }}
              >
                <LinearGradient
                  colors={gradient.colors}
                  start={gradient.start}
                  end={gradient.end}
                  style={{ width: `${percent}%`, height: "100%" }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <View>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>REWARD</Text>
                  <Text
                    style={{
                      color: colors.violetLight,
                      fontFamily: fonts.displaySemiBold,
                      fontSize: fontSizes.caption,
                    }}
                  >
                    +{challenge.rewardXp.toLocaleString()} XP
                  </Text>
                </View>
                {ended ? (
                  <Icon
                    name={challenge.status === "completed" ? "check" : "minus"}
                    size={16}
                    color={challenge.status === "completed" ? colors.success : colors.disabled}
                  />
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
