import { getRank, xpToNext, type Rank } from "@levelup/engine";
import { supabase } from "./supabase";

export interface RankHistoryEntry {
  rank: Rank;
  achievedAt: string;
}

/** Pure function of cumulative XP, not incremental state — summing first then computing level
 * gives the identical result as applying each award one at a time (the per-level thresholds
 * are fixed), so this sidesteps @levelup/engine's awardXp() entirely. That matters because
 * awardXp() throws on a negative amount (a penalty's XP loss), while a running cumulative sum
 * handles a dip and recovery the same way profiles.xp/level already do. */
function levelForTotalXp(totalXp: number): number {
  let remaining = Math.max(0, totalXp);
  let level = 1;
  let threshold = xpToNext(level);
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = xpToNext(level);
  }
  return level;
}

/**
 * Reconstructs every rank the player has ever crossed into, by replaying their xp_events
 * ledger (the only source of truth for lifetime XP — same ledger statsProgress.ts sums for
 * lifetime totals) through the same xpToNext/getRank math the server uses. No separate
 * history table: this works retroactively for XP earned before this screen existed, at the
 * cost of re-deriving it on every load — trivial at the event counts a personal habit tracker
 * produces.
 *
 * The starting rank (E, before any XP) is never included — only actual transitions — and the
 * result is newest-first to match how the Profile screen lists it (current rank on top).
 */
export async function getRankHistory(userId: string): Promise<RankHistoryEntry[]> {
  const { data, error } = await supabase
    .from("xp_events")
    .select("amount, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const entries: RankHistoryEntry[] = [];
  let cumulativeXp = 0;
  let lastRank: Rank = "E";

  for (const event of data ?? []) {
    cumulativeXp += event.amount;
    const rank = getRank(levelForTotalXp(cumulativeXp));
    if (rank !== lastRank) {
      entries.push({ rank, achievedAt: event.created_at });
      lastRank = rank;
    }
  }

  return entries.reverse();
}
