import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Icon } from "../../../components/Icon";
import { Stepper } from "../../../components/Stepper";
import { Button } from "../../../components/Button";
import { signOut } from "../../../lib/auth";
import {
  ensureNotificationChannel,
  getNotificationPrefs,
  requestNotificationPermission,
  setNotificationPrefs,
  type NotificationPrefs,
} from "../../../lib/notifications";
import { colors, fonts } from "../../../theme/tokens";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

function sectionLabel(text: string) {
  return (
    <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 }}>
      {text}
    </Text>
  );
}

function card(children: React.ReactNode) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(27,27,47,0.62)",
        padding: 16,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}

function toggleRow(label: string, value: boolean, onChange: (next: boolean) => void) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodyMedium, flex: 1 }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.disabled, true: colors.violet }}
        thumbColor={colors.text}
      />
    </View>
  );
}

function navRow(icon: "dumbbell" | "shield", label: string, onPress: () => void) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 }}
    >
      <Icon name={icon} size={16} color={colors.violetLight} />
      <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodyMedium, flex: 1 }}>
        {label}
      </Text>
      <Icon name="arrow" size={14} color={colors.muted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    void ensureNotificationChannel();
    getNotificationPrefs().then(setPrefs);
  }, []);

  async function updatePrefs(next: NotificationPrefs) {
    setPrefs(next);
    if (next.dailyReminderEnabled || next.streakReminderEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        // Permission denied: keep the toggle visually off rather than silently failing —
        // nothing gets scheduled either way, this just keeps the UI honest about it.
        const reverted = { ...next, dailyReminderEnabled: false, streakReminderEnabled: false };
        setPrefs(reverted);
        await setNotificationPrefs(reverted);
        return;
      }
    }
    await setNotificationPrefs(next);
  }

  function openUrl(path: string) {
    if (!API_URL) return;
    void WebBrowser.openBrowserAsync(`${API_URL}${path}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, flexGrow: 1 }}>
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(124,58,237,0.14)",
            }}
          >
            <Icon name="profile" size={24} color={colors.violetLight} />
          </View>
          <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 17 }}>
            Settings
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {sectionLabel("NOTIFICATIONS")}
          {card(
            prefs ? (
              <>
                {toggleRow(
                  "Daily quest reminder",
                  prefs.dailyReminderEnabled,
                  (value) => void updatePrefs({ ...prefs, dailyReminderEnabled: value }),
                )}
                {prefs.dailyReminderEnabled ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Reminder time</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Stepper
                        value={prefs.dailyReminderHour}
                        min={0}
                        max={23}
                        suffix="h"
                        onChange={(hour) => void updatePrefs({ ...prefs, dailyReminderHour: hour })}
                      />
                      <Stepper
                        value={prefs.dailyReminderMinute}
                        min={0}
                        max={45}
                        step={15}
                        suffix="m"
                        onChange={(minute) =>
                          void updatePrefs({ ...prefs, dailyReminderMinute: minute })
                        }
                      />
                    </View>
                  </View>
                ) : null}
                {toggleRow(
                  "Streak-at-risk reminder",
                  prefs.streakReminderEnabled,
                  (value) => void updatePrefs({ ...prefs, streakReminderEnabled: value }),
                )}
              </>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 12 }}>Loading...</Text>
            ),
          )}
        </View>

        <View style={{ gap: 10 }}>
          {sectionLabel("HEALTH & FITNESS")}
          {card(
            navRow("dumbbell", "Health Connect sync", () => router.push("/profile/health-connect")),
          )}
        </View>

        <View style={{ gap: 10 }}>
          {sectionLabel("ABOUT")}
          {card(
            <>
              {navRow("shield", "Privacy Policy", () => openUrl("/privacy"))}
              {navRow("shield", "Terms of Service", () => openUrl("/terms"))}
            </>,
          )}
        </View>

        <View style={{ marginTop: "auto" }}>
          <Button
            variant="ghost"
            icon="logout"
            onPress={() => {
              void signOut();
            }}
          >
            Sign out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
