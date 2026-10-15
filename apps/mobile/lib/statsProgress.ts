import { getLocalDateString } from "@levelup/engine";
import { supabase } from "./supabase";

const DAY_MS = 86_400_000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `dateIso` is a plain YYYY-MM-DD local date — reading it at UTC noon avoids any DST/
 * timezone ambiguity about which calendar day it names (same trick as ActivityForm's
 * daysBetween). */
function weekdayLabel(dateIso: string): string {
  return WEEKDAY_LABELS[new Date(`${dateIso}T12:00:00Z`).getUTCDay()] ?? "";
}

function localDateDaysAgo(days: number, timezone: string): string {
  return getLocalDateString(new Date(Date.now() - days * DAY_MS), timezone);
}

export interface LifetimeTotals {
  totalXp: number;
  questsDone: number;
}

/** Sums every xp_events.amount (not just this session's awards — the ledger is the only
 * source of truth for lifetime XP) and counts completed quests, both all-time. */
export async function getLifetimeTotals(userId: string): Promise<LifetimeTotals> {
  const [xpResult, questsResult] = await Promise.all([
    supabase.from("xp_events").select("amount").eq("user_id", userId),
    supabase
      .from("quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);

  if (xpResult.error) throw new Error(xpResult.error.message);
  if (questsResult.error) throw new Error(questsResult.error.message);

  const totalXp = (xpResult.data ?? []).reduce((sum, row) => sum + row.amount, 0);
  return { totalXp, questsDone: questsResult.count ?? 0 };
}

export interface WeeklyXpDay {
  date: string;
  label: string;
  xp: number;
}

export interface WeeklyXpSummary {
  /** 7 entries, oldest first, ending today. */
  days: WeeklyXpDay[];
  totalThisWeek: number;
  /** null when the prior 7-day window has no XP at all — a percentage against zero is
   * meaningless, so callers should show something like "New" instead. */
  percentChangeFromPriorWeek: number | null;
}

/** Buckets the last 14 local days of xp_events by local calendar date (never the server's
 * UTC day — see CLAUDE.md), then splits that into "this week" (last 7 days) vs the 7 before
 * it, for the weekly bar chart and its week-over-week delta. */
export async function getWeeklyXpSummary(
  userId: string,
  timezone: string,
): Promise<WeeklyXpSummary> {
  const since = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("xp_events")
    .select("amount, created_at")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);

  const xpByLocalDate = new Map<string, number>();
  for (const event of data ?? []) {
    const localDate = getLocalDateString(new Date(event.created_at), timezone);
    xpByLocalDate.set(localDate, (xpByLocalDate.get(localDate) ?? 0) + event.amount);
  }

  const days: WeeklyXpDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = localDateDaysAgo(i, timezone);
    days.push({ date, label: weekdayLabel(date), xp: xpByLocalDate.get(date) ?? 0 });
  }

  let totalPriorWeek = 0;
  for (let i = 13; i >= 7; i--) {
    totalPriorWeek += xpByLocalDate.get(localDateDaysAgo(i, timezone)) ?? 0;
  }

  const totalThisWeek = days.reduce((sum, day) => sum + day.xp, 0);
  const percentChangeFromPriorWeek =
    totalPriorWeek > 0
      ? Math.round(((totalThisWeek - totalPriorWeek) / totalPriorWeek) * 100)
      : null;

  return { days, totalThisWeek, percentChangeFromPriorWeek };
}

function bucketLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const fraction = count / maxCount;
  if (fraction >= 0.75) return 4;
  if (fraction >= 0.5) return 3;
  if (fraction >= 0.25) return 2;
  return 1;
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * One week-aligned grid of days, laid out the way a calendar is read.
 *
 * `rows` is seven rows, Sunday first, each holding one cell per calendar week with the
 * oldest week on the left — so every row is a single weekday and every column is a single
 * week. `null` marks a square that belongs to the grid but not to the window: the days
 * before it began, and the rest of the current week, which hasn't happened yet.
 *
 * The previous shape was a flat run of the last 35 days wrapped into rows of seven. That
 * put time running left-to-right *and* top-to-bottom, so the "5 weeks ago"/"Today" labels
 * underneath described an axis the grid didn't have — and because the window simply ended
 * today, a column wasn't a weekday either: the first column was whatever day it happened to
 * be 35 days ago, shifting daily. Nothing about it could be read as a calendar.
 */
export interface StreakCalendar {
  rows: readonly (readonly (HeatmapDay | null)[])[];
  /** Row labels, aligned to `rows`. */
  weekdayLabels: readonly string[];
  /** The grid's first square — the Sunday the window opens on. The window always ends
   * today, which is why there's no matching `lastDate`: the caption says "today". */
  firstDate: string;
  /** The busiest day in the window, which the shading is scaled against. */
  maxCount: number;
}

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
/** Read at UTC noon so no timezone or DST shift can move a plain YYYY-MM-DD onto the
 * neighbouring calendar day — the same trick weekdayLabel uses. */
function dayOfWeek(dateIso: string): number {
  return new Date(`${dateIso}T12:00:00Z`).getUTCDay();
}

function addDays(dateIso: string, days: number): string {
  const base = new Date(`${dateIso}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Completed-quest counts per local day, arranged as a week-aligned calendar.
 *
 * Shading is scaled to the busiest day in the window rather than to a fixed count, so the
 * grid reads sensibly whether someone finishes one quest a day or ten. That does mean the
 * shades are relative — the same four-quest day can look different in a different window —
 * which is why the UI shows a legend rather than leaving it to be guessed.
 */
export async function getStreakCalendar(
  userId: string,
  timezone: string,
  weeks = 13,
): Promise<StreakCalendar> {
  const today = getLocalDateString(new Date(), timezone);
  // The grid's last column is the current week, so it starts on the Sunday (weeks - 1)
  // weeks before this one. Everything is derived from that anchor, which is what makes a
  // column a real week instead of an arbitrary seven-day slice.
  const firstSunday = addDays(today, -dayOfWeek(today) - (weeks - 1) * 7);
  const lastDay = addDays(firstSunday, weeks * 7 - 1);

  const { data, error } = await supabase
    .from("quests")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", new Date(`${firstSunday}T00:00:00Z`).toISOString());
  if (error) throw new Error(error.message);

  const countByLocalDate = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.completed_at) continue;
    const localDate = getLocalDateString(new Date(row.completed_at), timezone);
    countByLocalDate.set(localDate, (countByLocalDate.get(localDate) ?? 0) + 1);
  }

  const inWindow = (date: string) => date >= firstSunday && date <= today;
  const dates: string[] = [];
  for (let date = firstSunday; date <= lastDay; date = addDays(date, 1)) {
    dates.push(date);
  }

  const maxCount = Math.max(
    1,
    ...dates.filter(inWindow).map((date) => countByLocalDate.get(date) ?? 0),
  );

  const rows = WEEKDAY_INITIALS.map((_, weekday) =>
    Array.from({ length: weeks }, (_, week) => {
      const date = dates[week * 7 + weekday];
      if (date === undefined || !inWindow(date)) return null;
      const count = countByLocalDate.get(date) ?? 0;
      return { date, count, level: bucketLevel(count, maxCount) };
    }),
  );

  return {
    rows,
    weekdayLabels: WEEKDAY_INITIALS,
    firstDate: firstSunday,
    maxCount,
  };
}
