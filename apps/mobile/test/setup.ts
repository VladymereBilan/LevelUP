/**
 * Native modules a rendered component may reach for. Each is stubbed to the
 * smallest shape its callers actually use — a stub returning the wrong shape
 * fails further from its cause than no stub at all.
 */
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// Reads EXPO_PUBLIC_* at module scope and registers an AppState listener, so it
// cannot be imported under the test runner at all.
jest.mock("../lib/supabase", () => ({ supabase: {} }));
