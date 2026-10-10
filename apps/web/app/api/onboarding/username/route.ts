import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "onboarding.username", maxRequests: 10, windowSeconds: 60 };

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/**
 * Sets the caller's hunter name during onboarding (or a later rename).
 * profiles grants clients SELECT only, so this write has to go through the
 * service-role client here rather than the anon/authenticated client
 * directly. Uniqueness is enforced at the DB level (a case-insensitive
 * unique index) — the duplicate-check here is just a fast-path error
 * message; the DB constraint is what actually prevents a race between two
 * concurrent requests picking the same name.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const body: unknown = await request.json().catch(() => ({}));
  const username =
    typeof body === "object" && body !== null && "username" in body
      ? (body as Record<string, unknown>).username
      : undefined;

  if (typeof username !== "string" || !USERNAME_PATTERN.test(username)) {
    return Response.json(
      { error: "Username must be 3-20 characters: letters, numbers, or underscores." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("profiles").update({ username }).eq("id", userId);

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "That username is already taken." }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ username }, { status: 200 });
}
