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
