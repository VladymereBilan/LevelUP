import { supabase, type MobileDatabase } from "./supabase";

export type StatsRow = MobileDatabase["public"]["Tables"]["stats"]["Row"];

/**
 * Fetches the signed-in user's own stats row (RLS scopes this to their
 * row only). No retry here: by the time `getMyProfile` has resolved, the
 * `handle_new_user` trigger's single transaction has already committed the
 * stats row alongside the profile row.
 */
export async function getMyStats(userId: string): Promise<StatsRow> {
  const { data, error } = await supabase
    .from("stats")
    .select("user_id, str, agi, vit, int, focus")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw error ? new Error(error.message) : new Error("Stats not found.");
  }

  return data;
}
