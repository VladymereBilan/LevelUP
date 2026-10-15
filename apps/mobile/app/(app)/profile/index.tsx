import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { DeleteAccountSheet } from "../../../components/DeleteAccountSheet";
import { Icon } from "../../../components/Icon";
import { RankChip } from "../../../components/RankChip";
import { SettingsCard, SettingsNavRow, SettingsToggleRow } from "../../../components/SettingsCard";
import { Button } from "../../../components/Button";
import { useSession } from "../../../lib/AuthProvider";
import { signOut } from "../../../lib/auth";
import {
  ensureNotificationChannel,
  getNotificationPrefs,
  requestNotificationPermission,
  setNotificationPrefs,
  type NotificationPrefs,
} from "../../../lib/notifications";
import { getMyProfile, type ProfileSummary } from "../../../lib/profile";
import { initials } from "../../../lib/questFormat";
import { getRankHistory, type RankHistoryEntry } from "../../../lib/rankHistory";
import { getLifetimeTotals } from "../../../lib/statsProgress";
import { getMyStreak, type StreakRow } from "../../../lib/streaks";
import { listMyTitles, titleIcon, type TitleDisplay } from "../../../lib/titles";
import { useFocusLoad } from "../../../lib/useFocusLoad";
import { colors, fontSizes, fonts, rankLabels } from "../../../theme/tokens";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

interface ProfileData {
  profile: ProfileSummary;
  streak: StreakRow;
  totalXp: number;
  questsDone: number;
  equippedTitle: TitleDisplay | null;
  rankHistory: RankHistoryEntry[];
}

function formatJoinedDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(iso));
}

function sectionHeader(label: string, trailing?: React.ReactNode) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: fontSizes.label,
          fontWeight: "700",
          letterSpacing: 1.2,
        }}
      >
        {label}
      </Text>
      {trailing}
    </View>
  );
}

/**
 * Version name plus build number, because only the second one identifies a build: v4, v5 and
 * v6 all shipped as 1.0.0, so a bug report could not be tied to what the tester was running.
 * The build number is assigned by EAS (`appVersionSource: "remote"`), which is why it is read
 * from the installed binary rather than from app.json, where it deliberately does not exist.
 */
function versionLabel(): string {
  const name = Constants.expoConfig?.version ?? "dev";
  const build = Application.nativeBuildVersion;
  return build ? `LEVEL UP · VERSION ${name} (${build})` : `LEVEL UP · VERSION ${name}`;
}

export default function ProfileScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const userId = session.user.id;

    try {
      const profile = await getMyProfile(userId);
      const [streak, totals, titles, rankHistory] = await Promise.all([
        getMyStreak(userId),
        getLifetimeTotals(userId),
        listMyTitles(userId),
        getRankHistory(userId),
      ]);
      setData({
        profile,
        streak,
        totalXp: totals.totalXp,
        questsDone: totals.questsDone,
        equippedTitle: titles.find((t) => t.id === profile.title_id) ?? null,
        rankHistory,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your profile.");
    }
  }, [session]);

  const { loading, refreshing, refresh } = useFocusLoad(load);

  useEffect(() => {
    void ensureNotificationChannel();
    getNotificationPrefs().then(setNotifPrefs);
  }, []);

  async function toggleDailyReminder(value: boolean) {
    if (!notifPrefs) return;
    const next = { ...notifPrefs, dailyReminderEnabled: value };
    setNotifPrefs(next);
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotifPrefs(notifPrefs);
        return;
      }
    }
    await setNotificationPrefs(next);
  }

  function openUrl(path: string) {
    if (!API_URL) return;
    void WebBrowser.openBrowserAsync(`${API_URL}${path}`);
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

  const { profile, streak, totalXp, questsDone, equippedTitle, rankHistory } = data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.violet}
          />
        }
      >
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
          <View style={{ width: 76, height: 76 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(167,139,250,0.35)",
                backgroundColor: "#241a3f",
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.title,
                }}
              >
                {initials(profile.username)}
              </Text>
            </View>
            <View
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                minWidth: 26,
                height: 26,
                borderRadius: 13,
                paddingHorizontal: 6,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.violet,
                borderWidth: 2,
                borderColor: colors.background,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.body,
                }}
              >
                {profile.level}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 19 }}>
            {profile.username}
          </Text>
          <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
            Joined {formatJoinedDate(profile.created_at)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.62)",
            }}
          >
            <RankChip rank={profile.rank} />
            <View>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: fontSizes.label,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                CURRENT RANK
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.displaySemiBold,
                  fontSize: fontSizes.body,
                }}
              >
                {rankLabels[profile.rank]}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.7)",
              gap: 3,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: fontSizes.label,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              QUESTS
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 18 }}>
              {questsDone.toLocaleString()}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.7)",
              gap: 3,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: fontSizes.label,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              TOTAL XP
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 18 }}>
              {totalXp.toLocaleString()}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.7)",
              gap: 3,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: fontSizes.label,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              STREAK
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 18 }}>
              {streak.current}
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {sectionHeader(
            "EQUIPPED TITLE",
            <Pressable onPress={() => router.push("/stats")}>
              <Text
                style={{
                  color: colors.violetLight,
                  fontSize: fontSizes.label,
                  fontFamily: fonts.bodySemiBold,
                }}
              >
                View all
              </Text>
            </Pressable>,
          )}
          <Pressable
            onPress={() => router.push("/stats")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(27,27,47,0.62)",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(124,58,237,0.14)",
              }}
            >
              <Icon
                name={equippedTitle ? titleIcon(equippedTitle.unlockRule) : "shield"}
                size={18}
                color={colors.violetLight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: fontSizes.label,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                TITLE
              </Text>
              <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 14 }}>
                {equippedTitle?.name ?? "No title equipped"}
              </Text>
              {equippedTitle?.description ? (
                <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                  {equippedTitle.description}
                </Text>
              ) : !equippedTitle ? (
                <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                  Unlock one in Stats
                </Text>
              ) : null}
            </View>
            <Icon name="arrow" size={15} color={colors.muted} />
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {sectionHeader(
            "RANK HISTORY",
            <Text
              style={{
                color: colors.muted,
                fontSize: fontSizes.label,
                fontFamily: fonts.bodySemiBold,
              }}
            >
              {rankHistory.length} ascension{rankHistory.length === 1 ? "" : "s"}
            </Text>,
          )}
          {rankHistory.length === 0 ? (
            <View
              style={{
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(27,27,47,0.62)",
              }}
            >
              <Text style={{ color: colors.muted, fontSize: fontSizes.caption }}>
                Complete quests to climb past Rank E.
              </Text>
            </View>
          ) : (
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(27,27,47,0.62)",
                overflow: "hidden",
              }}
            >
              {rankHistory.map((entry, index) => (
                <View
                  key={`${entry.rank}-${entry.achievedAt}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <RankChip rank={entry.rank} />
                  <Text
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontFamily: fonts.displaySemiBold,
                      fontSize: fontSizes.body,
                    }}
                  >
                    {rankLabels[entry.rank]}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                    {formatShortDate(entry.achievedAt)}
                  </Text>
                  {index === 0 ? (
                    <Text
                      style={{
                        color: colors.violetLight,
                        fontSize: fontSizes.label,
                        fontWeight: "700",
                        letterSpacing: 1,
                      }}
                    >
                      CURRENT
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 10 }}>
          {sectionHeader("SETTINGS")}
          <SettingsCard>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="moon" size={17} color={colors.violetLight} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.body,
                    fontFamily: fonts.bodySemiBold,
                  }}
                >
                  Dark theme
                </Text>
                <Text style={{ color: colors.muted, fontSize: fontSizes.label, marginTop: 1 }}>
                  The only theme, for now
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: "rgba(124,58,237,0.16)",
                }}
              >
                <Text
                  style={{
                    color: colors.violetLight,
                    fontSize: fontSizes.label,
                    fontFamily: fonts.bodySemiBold,
                  }}
                >
                  ON
                </Text>
              </View>
            </View>

            {notifPrefs ? (
              <SettingsToggleRow
                icon="clock"
                label="Daily reminders"
                subtitle={
                  notifPrefs.dailyReminderEnabled
                    ? `Every day at ${String(notifPrefs.dailyReminderHour).padStart(2, "0")}:${String(notifPrefs.dailyReminderMinute).padStart(2, "0")}`
                    : "Reminders paused"
                }
                value={notifPrefs.dailyReminderEnabled}
                onChange={(value) => void toggleDailyReminder(value)}
              />
            ) : null}

            <SettingsNavRow
              icon="bell"
              label="Notifications"
              subtitle="Quests, streaks, and rewards"
              onPress={() => router.push("/profile/notifications")}
            />
            <SettingsNavRow
              icon="dumbbell"
              label="Health Connect"
              subtitle="Sync steps and workouts"
              onPress={() => router.push("/profile/health-connect")}
            />
            <SettingsNavRow
              icon="shield"
              label="Privacy Policy"
              subtitle="Account permissions and data"
              onPress={() => openUrl("/privacy")}
            />
            <SettingsNavRow
              icon="shield"
              label="Terms of Service"
              onPress={() => openUrl("/terms")}
            />
          </SettingsCard>
        </View>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: fontSizes.caption, textAlign: "center" }}>
            {error}
          </Text>
        ) : null}

        <Button
          variant="secondary"
          icon="logout"
          loading={signingOut}
          onPress={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
        >
          Sign out
        </Button>

        <View style={{ gap: 10 }}>
          {sectionHeader("DANGER ZONE")}
          <View
            style={{
              gap: 10,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.3)",
              backgroundColor: "rgba(239,68,68,0.06)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="warning" size={17} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.body,
                    fontFamily: fonts.bodySemiBold,
                  }}
                >
                  Delete my account
                </Text>
                <Text style={{ color: colors.muted, fontSize: fontSizes.label, marginTop: 1 }}>
                  Permanently erases your progress. Cannot be undone.
                </Text>
              </View>
            </View>
            <Button variant="danger" icon="trash" onPress={() => setDeleteSheetVisible(true)}>
              Delete my account
            </Button>
          </View>
        </View>

        <Text
          style={{
            color: colors.disabled,
            fontSize: fontSizes.label,
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          {versionLabel()}
        </Text>
      </ScrollView>

      <DeleteAccountSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
      />
    </SafeAreaView>
  );
}
