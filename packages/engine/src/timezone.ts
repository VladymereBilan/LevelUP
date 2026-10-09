import type { DateString } from "./types";

/**
 * Resolves `now` to the calendar date the user experiences, in their own
 * timezone — not the server's. Daily XP caps, streak tracking, and quest
 * dates all need this: two instants a single hour apart can fall on
 * different local calendar days near midnight, even though their UTC dates
 * are identical (and conversely, instants far apart in UTC can share a local
 * day). `timeZone` is an IANA zone name, e.g. "Asia/Manila".
 */
export function getLocalDateString(now: Date, timeZone: string): DateString {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}
