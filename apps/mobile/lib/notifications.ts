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
  /** Whether the player has already been asked, once, whether they want a daily reminder.
   * Set whichever way they answer — asking twice is how a helpful prompt becomes nagging. */
  reminderOffered: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminderEnabled: false,
  dailyReminderHour: 18,
  dailyReminderMinute: 0,
  streakReminderEnabled: false,
  reminderOffered: false,
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
        body: "Your quests for today are up. Jump in and keep the streak going.",
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
        title: "Streak Check",
        // A fixed daily local trigger can't know whether today's quests are already done,
        // so this can't claim they aren't — it fires for finished players too.
        body: "The day's almost over. Make sure a quest is logged to keep your streak alive.",
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

/**
 * Whether to offer the daily reminder right now. True only once, and only for someone who
 * doesn't already have reminders on.
 *
 * Reminders ship off by default and live two taps deep in Profile, so in practice almost
 * nobody ever found them — which wasted the single strongest reason to come back the next day.
 * Asking at app launch is the usual answer and the wrong one: the player has no reason to say
 * yes yet, and on Android a declined system prompt is not cheap to re-ask. Asking just after a
 * first finished quest trades on a moment where the answer is naturally yes.
 */
export async function shouldOfferDailyReminder(): Promise<boolean> {
  const prefs = await getNotificationPrefs();
  return !prefs.reminderOffered && !prefs.dailyReminderEnabled;
}

/** Accepts the offer: asks for permission, and only enables the reminder if it's granted.
 * Returns whether it ended up scheduled, so the caller can tell the player the truth. */
export async function acceptDailyReminderOffer(): Promise<boolean> {
  const prefs = await getNotificationPrefs();
  const granted = await requestNotificationPermission();
  if (!granted) {
    // Still recorded as offered — re-asking after a denial just trains people to ignore it.
    await savePrefs({ ...prefs, reminderOffered: true });
    return false;
  }
  await ensureNotificationChannel();
  await setNotificationPrefs({
    ...prefs,
    reminderOffered: true,
    dailyReminderEnabled: true,
    streakReminderEnabled: true,
  });
  return true;
}

/** Declines the offer. Nothing is scheduled; Profile -> Notifications is still there whenever
 * they change their mind. */
export async function declineDailyReminderOffer(): Promise<void> {
  const prefs = await getNotificationPrefs();
  await savePrefs({ ...prefs, reminderOffered: true });
}

/** Cancels every scheduled local notification and removes the saved preferences — called on
 * account deletion, alongside signing out and clearing secure storage. Each step is
 * best-effort: a stale/already-cancelled notification ID or a missing key should never block
 * the rest of account-deletion cleanup. */
export async function clearAllNotificationData(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  await SecureStore.deleteItemAsync(PREFS_KEY).catch(() => {});
}
