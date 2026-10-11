import * as Location from "expo-location";
import { MAX_DISTANCE_METERS } from "@levelup/engine";

/** Above this, a GPS fix is too noisy to trust for distance accumulation. */
const MAX_ACCURACY_METERS = 30;
/** Above this implied speed between two fixes, treat it as a GPS jump artifact, not real
 * movement — faster than any realistic foot-powered run. */
const MAX_PLAUSIBLE_SPEED_MS = 10; // 36 km/h

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export interface RunTracker {
  /** Stops watching and returns the final accumulated distance in meters, capped at the
   * engine's safe ceiling — the server re-clamps independently, this just avoids a
   * nonsensical on-screen number during the run itself. */
  stop: () => Promise<number>;
}

/** Starts a foreground-only GPS watch and accumulates distance between successive fixes,
 * filtering out low-accuracy readings and implausible jumps. `onUpdate` fires with the
 * running total (meters) after each accepted fix. */
export async function startRunTracking(onUpdate: (meters: number) => void): Promise<RunTracker> {
  let totalMeters = 0;
  let lastFix: { latitude: number; longitude: number; timestamp: number } | null = null;

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5,
    },
    (location) => {
      const { latitude, longitude, accuracy } = location.coords;
      if (accuracy !== null && accuracy > MAX_ACCURACY_METERS) return;

      const fix = { latitude, longitude, timestamp: location.timestamp };
      if (lastFix) {
        const deltaMeters = haversineMeters(lastFix, fix);
        const deltaSeconds = Math.max(0.001, (fix.timestamp - lastFix.timestamp) / 1000);
        if (deltaMeters / deltaSeconds <= MAX_PLAUSIBLE_SPEED_MS) {
          totalMeters = Math.min(MAX_DISTANCE_METERS, totalMeters + deltaMeters);
          onUpdate(totalMeters);
        }
      }
      lastFix = fix;
    },
  );

  return {
    stop: async () => {
      subscription.remove();
      return totalMeters;
    },
  };
}
