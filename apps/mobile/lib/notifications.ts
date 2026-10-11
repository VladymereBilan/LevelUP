import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHANNEL_ID = "quest-reminders";
const DAILY_REMINDER_ID = "daily-quest-reminder";
const STREAK_REMINDER_ID = "streak-at-risk-reminder";

/** Fixed local hour the streak-at-risk nudge fires at — late enough that most of the day's
 * quests would already be done, early enough to still act on it before local midnight. */
const STREAK_REMINDER_HOUR = 21;

export interface NotificationPrefs {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  streakReminderEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminderEnabled: false,
  dailyReminderHour: 18,
  dailyReminderMinute: 0,
  streakReminderEnabled: false,
};

const PREFS_KEY = "notification_prefs";

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const stored = await SecureStore.getItemAsync(PREFS_KEY);
  if (!stored) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Android requires a channel before any notification using it can be shown — a no-op on
 * iOS. Safe to call every time the app starts. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Quest reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#7C3AED",
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Re-derives both scheduled local notifications from `prefs`, replacing whatever was
 * scheduled before. Cheap enough to call on every save rather than diffing. */
export async function applyNotificationSchedule(prefs: NotificationPrefs): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID).catch(() => {});

  if (prefs.dailyReminderEnabled) {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: "New Quest Available",
        body: "Your quests for today are up — jump in and keep the streak going.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.dailyReminderHour,
        minute: prefs.dailyReminderMinute,
        channelId: CHANNEL_ID,
      },
    });
  }

  if (prefs.streakReminderEnabled) {
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: "Streak at Risk",
        body: "You haven't completed a quest today — finish one before the day resets.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: STREAK_REMINDER_HOUR,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await savePrefs(prefs);
  await applyNotificationSchedule(prefs);
}
