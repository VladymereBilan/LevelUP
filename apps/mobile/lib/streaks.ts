import { supabase, type MobileDatabase } from "./supabase";

export type StreakRow = MobileDatabase["public"]["Tables"]["streaks"]["Row"];

/**
 * Fetches the signed-in user's own streak row (RLS scopes this to their
 * row only). No retry here: by the time `getMyProfile` has resolved, the
 * `handle_new_user` trigger's single transaction has already committed the
 * streak row alongside the profile row.
 */
export async function getMyStreak(userId: string): Promise<StreakRow> {
  const { data, error } = await supabase
    .from("streaks")
    .select("user_id, current, longest, last_completed_date, grace_days_used")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw error ? new Error(error.message) : new Error("Streak not found.");
  }

  return data;
}
