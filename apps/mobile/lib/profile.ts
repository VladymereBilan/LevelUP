import { supabase, type MobileDatabase } from "./supabase";
import { apiFetch } from "./api";

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

/** Sets the signed-in user's IANA timezone, read from the device. Safe to call on every sign-in. */
export async function setTimezone(timezone: string): Promise<void> {
  await apiFetch<{ timezone: string }>("/api/profile/timezone", { body: { timezone } });
}

/** Equips (or, with `null`, unequips) one of the caller's own unlocked titles. The server
 * re-validates ownership against user_titles — this isn't just a courtesy client-side check. */
export async function equipTitle(titleId: string | null): Promise<{ titleId: string | null }> {
  return apiFetch<{ titleId: string | null }>("/api/profile/title", { body: { titleId } });
}
