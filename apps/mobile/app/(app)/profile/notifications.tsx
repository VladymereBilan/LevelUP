import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "../../../components/Icon";
import { SettingsCard, SettingsToggleRow } from "../../../components/SettingsCard";
import { Stepper } from "../../../components/Stepper";
import {
  ensureNotificationChannel,
  getNotificationPrefs,
  requestNotificationPermission,
  setNotificationPrefs,
  type NotificationPrefs,
} from "../../../lib/notifications";
import { colors, fontSizes, fonts } from "../../../theme/tokens";

export default function NotificationsScreen() {
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
        const reverted = { ...next, dailyReminderEnabled: false, streakReminderEnabled: false };
        setPrefs(reverted);
        await setNotificationPrefs(reverted);
        return;
      }
    }
    await setNotificationPrefs(next);
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
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: fontSizes.bodyLarge,
          }}
        >
          Notifications
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 20 }}>
        {prefs ? (
          <SettingsCard>
            <SettingsToggleRow
              icon="clock"
              label="Daily quest reminder"
              value={prefs.dailyReminderEnabled}
              onChange={(value) => void updatePrefs({ ...prefs, dailyReminderEnabled: value })}
            />
            {prefs.dailyReminderEnabled ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                  Reminder time
                </Text>
                {/* Stacked, not side by side: two steppers in one row fitted only while the
                    value was a bare label. Once it became a field wide enough to type into,
                    the pair overflowed the card and clipped the minute control off-screen. */}
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ color: colors.muted, fontSize: fontSizes.label, width: 52 }}>
                      Hour
                    </Text>
                    <Stepper
                      testID="reminder-hour"
                      value={prefs.dailyReminderHour}
                      min={0}
                      max={23}
                      onChange={(hour) => void updatePrefs({ ...prefs, dailyReminderHour: hour })}
                    />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ color: colors.muted, fontSize: fontSizes.label, width: 52 }}>
                      Minute
                    </Text>
                    <Stepper
                      testID="reminder-minute"
                      value={prefs.dailyReminderMinute}
                      min={0}
                      max={45}
                      step={15}
                      onChange={(minute) =>
                        void updatePrefs({ ...prefs, dailyReminderMinute: minute })
                      }
                    />
                  </View>
                </View>
              </View>
            ) : null}
            <SettingsToggleRow
              icon="flame"
              label="Streak-at-risk reminder"
              value={prefs.streakReminderEnabled}
              onChange={(value) => void updatePrefs({ ...prefs, streakReminderEnabled: value })}
            />
          </SettingsCard>
        ) : (
          <Text style={{ color: colors.muted, fontSize: fontSizes.caption }}>Loading...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
