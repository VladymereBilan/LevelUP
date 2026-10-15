import { Platform } from "react-native";
import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import { syncTodaySteps } from "./healthConnect";

jest.mock("react-native-health-connect", () => ({
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  requestPermission: jest.fn(),
  readRecords: jest.fn(),
  SdkAvailabilityStatus: {
    SDK_AVAILABLE: 3,
    SDK_UNAVAILABLE: 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
  },
}));

const mockSdkStatus = jest.mocked(getSdkStatus);
const mockInitialize = jest.mocked(initialize);
const mockRequestPermission = jest.mocked(requestPermission);
const mockReadRecords = jest.mocked(readRecords);

function grantSteps() {
  mockRequestPermission.mockResolvedValue([
    { accessType: "read", recordType: "Steps" },
  ] as unknown as Awaited<ReturnType<typeof requestPermission>>);
}

function stepRecords(...counts: number[]) {
  mockReadRecords.mockResolvedValue({
    records: counts.map((count) => ({ count })),
  } as unknown as Awaited<ReturnType<typeof readRecords>>);
}

beforeEach(() => {
  Platform.OS = "android";
  mockSdkStatus.mockResolvedValue(SdkAvailabilityStatus.SDK_AVAILABLE);
  mockInitialize.mockResolvedValue(true);
});

describe("syncTodaySteps", () => {
  it("sums today's step records", async () => {
    grantSteps();
    stepRecords(1200, 3400, 50);

    await expect(syncTodaySteps()).resolves.toEqual({ status: "ok", steps: 4650 });
  });

  it("reports zero rather than failing on a day with no records", async () => {
    grantSteps();
    stepRecords();

    await expect(syncTodaySteps()).resolves.toEqual({ status: "ok", steps: 0 });
  });

  it("reports unavailable on iOS without touching the native module", async () => {
    Platform.OS = "ios";

    await expect(syncTodaySteps()).resolves.toEqual({ status: "unavailable" });
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it("reports unavailable when Health Connect is not installed", async () => {
    mockSdkStatus.mockResolvedValue(SdkAvailabilityStatus.SDK_UNAVAILABLE);

    await expect(syncTodaySteps()).resolves.toEqual({ status: "unavailable" });
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("distinguishes a refused permission from a breakage", async () => {
    mockRequestPermission.mockResolvedValue([]);

    await expect(syncTodaySteps()).resolves.toEqual({ status: "denied" });
    expect(mockReadRecords).not.toHaveBeenCalled();
  });

  it("does not grant itself steps off an unrelated permission", async () => {
    mockRequestPermission.mockResolvedValue([
      { accessType: "read", recordType: "ExerciseSession" },
    ] as unknown as Awaited<ReturnType<typeof requestPermission>>);

    await expect(syncTodaySteps()).resolves.toEqual({ status: "denied" });
  });

  it("turns a thrown native error into a result instead of propagating it", async () => {
    grantSteps();
    mockReadRecords.mockRejectedValue(new Error("Health Connect client disconnected"));

    await expect(syncTodaySteps()).resolves.toEqual({
      status: "failed",
      message: "Health Connect client disconnected",
    });
  });
});
