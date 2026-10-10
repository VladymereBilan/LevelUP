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

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

function bucketLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const fraction = count / maxCount;
  if (fraction >= 0.75) return 4;
  if (fraction >= 0.5) return 3;
  if (fraction >= 0.25) return 2;
  return 1;
}

/** Buckets completed-quest counts per local day into 5 intensity levels, scaled to the
 * busiest day in the window — not a fixed count — so the heatmap reads sensibly whether
 * someone completes 1 quest a day or 10. */
export async function getStreakHeatmap(
  userId: string,
  timezone: string,
  totalDays = 35,
): Promise<HeatmapDay[]> {
  const since = new Date(Date.now() - totalDays * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("quests")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", since);
  if (error) throw new Error(error.message);

  const countByLocalDate = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.completed_at) continue;
    const localDate = getLocalDateString(new Date(row.completed_at), timezone);
    countByLocalDate.set(localDate, (countByLocalDate.get(localDate) ?? 0) + 1);
  }

  const days: { date: string; count: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = localDateDaysAgo(i, timezone);
    days.push({ date, count: countByLocalDate.get(date) ?? 0 });
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  return days.map((d) => ({ ...d, level: bucketLevel(d.count, maxCount) }));
}
