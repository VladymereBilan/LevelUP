/**
 * Cold-start phase timing, opt-in via `EXPO_PUBLIC_BOOT_TRACE=1`.
 *
 * Gated on an env var rather than `__DEV__` on purpose: cold start is only worth
 * measuring on a release build on a real device over a real network, where `__DEV__`
 * is false. Build with the flag set, then read it over
 * `adb logcat -s ReactNativeJS:V`.
 *
 * `start` is captured at module eval, which Metro runs while the native splash is
 * still up — so "total" is measured from roughly the first line of app JS, not from
 * process launch. Native + bundle load sits before this and has to be read from
 * logcat's own timestamps.
 */
const enabled = process.env.EXPO_PUBLIC_BOOT_TRACE === "1";
const start = Date.now();
let last = start;

export function bootMark(phase: string): void {
  if (!enabled) return;
  const now = Date.now();
  console.log(`[boot] ${phase} +${now - last}ms (total ${now - start}ms)`);
  last = now;
}
