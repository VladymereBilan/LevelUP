import { describe, expect, it } from "vitest";
import { getLocalDateString } from "../timezone";

describe("getLocalDateString", () => {
  it("matches the UTC date when the timezone offset doesn't cross midnight", () => {
    expect(getLocalDateString(new Date("2026-03-05T12:00:00.000Z"), "UTC")).toBe("2026-03-05");
  });

  it("resolves a completion at 23:30 Asia/Manila to that local day", () => {
    // 2026-03-05T15:30:00Z is 2026-03-05 23:30 in Asia/Manila (UTC+8).
    expect(getLocalDateString(new Date("2026-03-05T15:30:00.000Z"), "Asia/Manila")).toBe(
      "2026-03-05",
    );
  });

  it("resolves a completion at 00:30 Asia/Manila to the NEXT local day", () => {
    // 2026-03-05T16:30:00Z is 2026-03-06 00:30 in Asia/Manila (UTC+8) — only
    // one hour after the instant above, but a different local calendar day.
    expect(getLocalDateString(new Date("2026-03-05T16:30:00.000Z"), "Asia/Manila")).toBe(
      "2026-03-06",
    );
  });

  it("proves the two Manila instants above share the same UTC calendar date", () => {
    // This is exactly the bug timezone-awareness avoids: a naive UTC date
    // would record both completions on 2026-03-05, even though the user
    // experienced them on two different local days.
    const beforeMidnightLocal = new Date("2026-03-05T15:30:00.000Z");
    const afterMidnightLocal = new Date("2026-03-05T16:30:00.000Z");
    expect(beforeMidnightLocal.toISOString().slice(0, 10)).toBe(
      afterMidnightLocal.toISOString().slice(0, 10),
    );
  });

  it("resolves a negative UTC offset the same way", () => {
    // 2026-03-05T04:30:00Z is 2026-03-04 23:30 in America/New_York (UTC-5 in March).
    expect(getLocalDateString(new Date("2026-03-05T04:30:00.000Z"), "America/New_York")).toBe(
      "2026-03-04",
    );
  });
});
