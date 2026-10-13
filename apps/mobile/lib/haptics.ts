import * as Haptics from "expo-haptics";

/**
 * The app's haptic vocabulary, defined once so the same event always feels the same.
 *
 * Every call is fire-and-forget and swallows its own errors: haptics are unavailable on some
 * devices and silently disabled by some system settings, and a quest completion must never
 * fail because a phone declined to buzz.
 */

/** A quest was completed. A level-up gets a different shape, not merely a stronger buzz — two
 * beats rather than one, so the moment is distinguishable with the screen unread. */
export function questCompleted(leveledUp: boolean): void {
  if (leveledUp) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 140);
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** A light tick for a deliberate, reversible choice — ticking a checkbox quest, stepping reps.
 * Kept distinctly lighter than questCompleted so progress never feels like finishing. */
export function progressTick(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
