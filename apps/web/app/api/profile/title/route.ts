import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "profile.title", maxRequests: 10, windowSeconds: 60 };

/**
 * Equips (or, with `titleId: null`, unequips) one of the caller's own unlocked titles.
 * profiles grants clients SELECT only, so this goes through the service-role client the same
 * way every other profile-mutating route does — but unlike timezone, the value here isn't
 * free-form: it must be a title this specific user actually has in user_titles, checked here
 * rather than trusted from the request body.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const body: unknown = await request.json().catch(() => ({}));
  const titleId =
    typeof body === "object" && body !== null && "titleId" in body
      ? (body as Record<string, unknown>).titleId
      : undefined;

  if (titleId !== null && typeof titleId !== "string") {
    return Response.json({ error: "titleId must be a string or null." }, { status: 400 });
  }

  if (titleId !== null) {
    const { data: owned, error: ownedError } = await supabase
      .from("user_titles")
      .select("title_id")
      .eq("user_id", userId)
      .eq("title_id", titleId)
      .maybeSingle();
    if (ownedError) {
      return Response.json({ error: ownedError.message }, { status: 500 });
    }
    if (!owned) {
      return Response.json({ error: "You haven't unlocked that title." }, { status: 403 });
    }
  }

  const { error } = await supabase.from("profiles").update({ title_id: titleId }).eq("id", userId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ titleId }, { status: 200 });
}
