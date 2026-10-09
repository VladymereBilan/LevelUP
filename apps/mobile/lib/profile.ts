import { supabase, type MobileDatabase } from "./supabase";

export type ProfileSummary = MobileDatabase["public"]["Tables"]["profiles"]["Row"];

const RETRY_DELAYS_MS = [500, 1000];

/**
 * Fetches the signed-in user's own profile row (RLS scopes this to their
 * row only). Retries a couple of times with a short delay before giving
 * up: the signup trigger that creates the profile runs server-side on
 * first sign-in, asynchronously relative to the client receiving its new
 * session, so the very first fetch right after login can legitimately
 * race it and find nothing yet.
 */
export async function getMyProfile(userId: string): Promise<ProfileSummary> {
  let lastError = new Error("Profile not found.");

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, level, xp, rank, title_id, timezone, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      return data;
    }

    lastError = error ? new Error(error.message) : new Error("Profile not found yet.");

    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
