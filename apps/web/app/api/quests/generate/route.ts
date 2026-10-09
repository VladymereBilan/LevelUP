import { getLocalDateString } from "@levelup/engine";
import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "quests.generate", maxRequests: 5, windowSeconds: 60 };

/**
 * Called by the app on open. Creates today's pending quests (the user's
 * LOCAL today, per their profile.timezone) from their active activities.
 * Idempotent — generate_daily_quests() relies on quests' unique
 * (user_id, activity_id, date) constraint, so calling this twice for the
 * same local day is always safe and just returns fewer new rows the second
 * time.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const localDate = getLocalDateString(new Date(), profile.timezone);

  const { data: quests, error } = await supabase.rpc("generate_daily_quests", {
    p_user_id: userId,
    p_date: localDate,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ date: localDate, quests: quests ?? [] }, { status: 200 });
}
