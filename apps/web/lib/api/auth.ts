import { createServiceRoleClient, type Database } from "@levelup/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedRequest {
  supabase: SupabaseClient<Database>;
  userId: string;
}

function bearerToken(request: Request): string | undefined {
  return request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
}

/**
 * One client per warm function instance rather than one per request, because
 * `getClaims` caches the project's JWKS on the client it's called from: a fresh
 * client each time would refetch the key set on every request, which trades the
 * `getUser` round trip for a different one instead of removing it.
 *
 * Safe to share. It holds no per-user state — no persisted session, no auto-refresh
 * (see createServiceRoleClient) — and every call here passes its token explicitly
 * instead of reading an ambient one.
 */
let sharedClient: SupabaseClient<Database> | undefined;

function serviceRoleClient(): SupabaseClient<Database> {
  sharedClient ??= createServiceRoleClient();
  return sharedClient;
}

/**
 * Verifies the caller's Supabase access token from the Authorization
 * header and returns a service-role client plus their user id. The
 * service-role client is what makes `complete_quest`/`generate_daily_quests`
 * callable at all (their EXECUTE grant is service_role-only) — this route
 * layer, not Postgres RLS, is what's responsible for making sure that
 * client is only ever used on behalf of the user whose token verified.
 *
 * Uses `getClaims`, not `getUser`: the production project signs tokens with an
 * asymmetric key (ES256), so `getClaims` verifies the signature in-process against
 * the project's cached JWKS and answers without a network round trip. `getUser`
 * always asks the Auth server, and every route paid for that before doing any of its
 * own work — on top of the rate-limit RPC — which showed up directly in how long the
 * app took to open.
 *
 * It also keeps local development honest: `packages/db/supabase/config.toml` leaves
 * `signing_keys_path` unset, so a local Supabase still signs with the legacy
 * symmetric secret, and `getClaims` transparently falls back to a server call for
 * tokens it can't verify locally. A hand-rolled JWKS check would have 401'd every
 * request against local — and every real-DB route test with it.
 *
 * See `authenticateFresh` for what the fast path gives up.
 */
export async function authenticate(request: Request): Promise<AuthenticatedRequest | Response> {
  const token = bearerToken(request);

  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const supabase = serviceRoleClient();
  const { data, error } = await supabase.auth.getClaims(token);

  // `role` guards against a token that verifies but doesn't represent a signed-in end
  // user — the project's own anon/service keys are themselves JWTs this project signed.
  if (error || !data || data.claims.role !== "authenticated" || !data.claims.sub) {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return { supabase, userId: data.claims.sub };
}

/**
 * `authenticate`, but asking the Auth server whether the session is still good
 * instead of trusting the token's own expiry.
 *
 * Verified locally, a well-formed token is accepted until it expires, which means a
 * session revoked a minute ago still works for the rest of that token's hour. That's
 * the right trade on a route the app calls every time it opens; it isn't on one that
 * does something irreversible. Use this where the extra round trip is paid once, by a
 * user who deliberately asked for something destructive.
 */
export async function authenticateFresh(
  request: Request,
): Promise<AuthenticatedRequest | Response> {
  const token = bearerToken(request);

  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const supabase = serviceRoleClient();
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
