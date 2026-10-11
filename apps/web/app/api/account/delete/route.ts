import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "account.delete", maxRequests: 5, windowSeconds: 60 };
const CONFIRMATION_PHRASE = "DELETE";

/**
 * Permanently deletes the caller's account — required by Google Play's data-deletion policy
 * alongside apps/web/app/delete-account (for a user who can't or won't sign back in).
 *
 * Deletes only the auth.users row, via the service role. Every per-user table (profiles,
 * stats, streaks, categories, activities, quests, xp_events, user_titles, user_challenges,
 * rate_limit_hits) cascades from that single delete — see packages/db/supabase/migrations'
 * `on delete cascade` chain back to auth.users via profiles, and specifically
 * 20260310000012_xp_events_allow_cascade_delete.sql for why xp_events's append-only guard
 * doesn't block it. No migration was needed for this feature: every existing user_id column
 * already cascades (verified by this route's own test, which checks every one of those tables
 * is empty after deletion — not just assumed from the schema).
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const body: unknown = await request.json().catch(() => ({}));
  const confirmation =
    typeof body === "object" && body !== null && "confirmation" in body
      ? (body as Record<string, unknown>).confirmation
      : undefined;

  if (confirmation !== CONFIRMATION_PHRASE) {
    return Response.json(
      { error: `Type ${CONFIRMATION_PHRASE} to confirm account deletion.` },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    // Deliberately generic — this is the one response path where even an
    // internal error message shouldn't be echoed back.
    return Response.json({ error: "Failed to delete account." }, { status: 500 });
  }

  return Response.json({ deleted: true }, { status: 200 });
}
