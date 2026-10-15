import { Platform } from "react-native";
import {
  getSdkStatus,
  initialize,
  requestPermission,
  readRecords,
  SdkAvailabilityStatus,
} from "react-native-health-connect";

/** Android-only — Health Connect doesn't exist on iOS; callers should check this before
 * doing anything else here. */
export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const status = await getSdkStatus();
  return status === SdkAvailabilityStatus.SDK_AVAILABLE;
}

export async function initializeHealthConnect(): Promise<boolean> {
  return initialize();
}

export interface HealthConnectGrants {
  steps: boolean;
  exerciseSessions: boolean;
}

export async function requestHealthConnectPermissions(): Promise<HealthConnectGrants> {
  const granted = await requestPermission([
    { accessType: "read", recordType: "Steps" },
    { accessType: "read", recordType: "ExerciseSession" },
  ]);
  return {
    steps: granted.some((p) => "recordType" in p && p.recordType === "Steps"),
    exerciseSessions: granted.some((p) => "recordType" in p && p.recordType === "ExerciseSession"),
  };
}

function startOfLocalDayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/** Sum of today's (local calendar day) Steps records. */
export async function getTodaySteps(): Promise<number> {
  const result = await readRecords("Steps", {
    timeRangeFilter: {
      operator: "between",
      startTime: startOfLocalDayIso(),
      endTime: new Date().toISOString(),
    },
  });
  return result.records.reduce((sum, record) => sum + record.count, 0);
}

export interface HealthExerciseSession {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

/** Today's (local calendar day) ExerciseSession records, with duration pre-computed. */
export async function getTodayExerciseSessions(): Promise<HealthExerciseSession[]> {
  const result = await readRecords("ExerciseSession", {
    timeRangeFilter: {
      operator: "between",
      startTime: startOfLocalDayIso(),
      endTime: new Date().toISOString(),
    },
  });
  return result.records.map((record) => ({
    id: record.metadata?.id ?? `${record.startTime}-${record.endTime}`,
    startTime: record.startTime,
    endTime: record.endTime,
    durationMinutes: Math.round(
      (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60_000,
    ),
  }));
}

/**
 * Why this exists rather than the caller chaining the four steps itself: a quest screen
 * needs to tell apart "this phone has no Health Connect" from "you said no" from "it broke",
 * because each wants different words on screen, and none of them should look like an error
 * the player caused. Returning a result instead of throwing is what keeps that distinction
 * at the call site.
 */
export type StepSyncResult =
  | { status: "ok"; steps: number }
  | { status: "unavailable" }
  | { status: "denied" }
  | { status: "failed"; message: string };

/** Reads today's step total, asking for availability and permission first. */
export async function syncTodaySteps(): Promise<StepSyncResult> {
  try {
    if (!(await isHealthConnectAvailable())) return { status: "unavailable" };

    await initializeHealthConnect();
    const grants = await requestHealthConnectPermissions();
    if (!grants.steps) return { status: "denied" };

    return { status: "ok", steps: await getTodaySteps() };
  } catch (err) {
    return {
      status: "failed",
      message: err instanceof Error ? err.message : "Could not read from Health Connect.",
    };
  }
}
