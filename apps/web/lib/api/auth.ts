import { createServiceRoleClient, type Database } from "@levelup/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedRequest {
  supabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Verifies the caller's Supabase access token from the Authorization
 * header and returns a service-role client plus their user id. The
 * service-role client is what makes `complete_quest`/`generate_daily_quests`
 * callable at all (their EXECUTE grant is service_role-only) — this route
 * layer, not Postgres RLS, is what's responsible for making sure that
 * client is only ever used on behalf of the user whose token verified.
 */
export async function authenticate(request: Request): Promise<AuthenticatedRequest | Response> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.match(/^Bearer (.+)$/i)?.[1];

  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return { supabase, userId: data.user.id };
}

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
}

/** Returns a 429 Response if the caller is over the limit, otherwise null. */
export async function enforceRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  config: RateLimitConfig,
): Promise<Response | null> {
  const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
    p_endpoint: config.endpoint,
    p_max_requests: config.maxRequests,
    p_window_seconds: config.windowSeconds,
  });

  if (error) {
    throw new Error(`check_rate_limit failed: ${error.message}`);
  }
  if (!allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}
