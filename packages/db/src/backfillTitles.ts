import type { Rank } from "@levelup/engine";
import { createServiceRoleClient } from "./client";
import { computeNewlyUnlockedTitles, type UnlockedTitle } from "./titleAwarding";

export interface BackfillResult {
  userId: string;
  titlesUnlocked: UnlockedTitle[];
}

/**
 * Evaluates title rules for one user against their CURRENT profile/stats/streak — unlike
 * complete_quest's own path, there's no quest being completed right now, so no `extra` xp/
 * quest-stat bump is passed to computeNewlyUnlockedTitles. For a player whose titles were
 * never evaluated (everyone, until this shipped), this is how their existing progress
 * retroactively counts.
 *
 * Safe to re-run: computeNewlyUnlockedTitles already excludes already-owned titles, and the
 * award itself is an upsert with `ignoreDuplicates`, so running this twice for the same user
 * is a no-op the second time.
 */
export async function backfillTitlesForUser(userId: string): Promise<BackfillResult> {
  const supabase = createServiceRoleClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("level, rank")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    throw new Error(`Profile not found for user ${userId}: ${profileError?.message}`);
  }

  const { data: stats, error: statsError } = await supabase
    .from("stats")
    .select("str, agi, vit, int, focus")
    .eq("user_id", userId)
    .single();
  if (statsError || !stats) {
    throw new Error(`Stats not found for user ${userId}: ${statsError?.message}`);
  }

  const { data: streak, error: streakError } = await supabase
    .from("streaks")
    .select("longest")
    .eq("user_id", userId)
    .single();
  if (streakError || !streak) {
    throw new Error(`Streak not found for user ${userId}: ${streakError?.message}`);
  }

  const titlesUnlocked = await computeNewlyUnlockedTitles(supabase, userId, {
    level: profile.level,
    rank: profile.rank as Rank,
    longestStreak: streak.longest,
    stats: { STR: stats.str, AGI: stats.agi, VIT: stats.vit, INT: stats.int, FOCUS: stats.focus },
  });

  if (titlesUnlocked.length > 0) {
    const { error: insertError } = await supabase.from("user_titles").upsert(
      titlesUnlocked.map((title) => ({ user_id: userId, title_id: title.id })),
      { onConflict: "user_id,title_id", ignoreDuplicates: true },
    );
    if (insertError) {
      throw new Error(`Failed to award backfilled titles for user ${userId}: ${insertError.message}`);
    }
  }

  return { userId, titlesUnlocked };
}
