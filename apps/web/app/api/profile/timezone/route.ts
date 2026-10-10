import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "profile.timezone", maxRequests: 10, windowSeconds: 60 };

/**
 * Sets the caller's IANA timezone, read from the device on sign-in — it
 * drives every local-date calculation server-side (streaks, the daily XP
 * cap, quest generation), so it has to be right, and profiles grants
 * clients SELECT only. Cheap to call on every sign-in: a no-op write when
 * the value hasn't changed since the last one.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const body: unknown = await request.json().catch(() => ({}));
  const timezone =
    typeof body === "object" && body !== null && "timezone" in body
      ? (body as Record<string, unknown>).timezone
      : undefined;

  if (typeof timezone !== "string" || !isValidTimeZone(timezone)) {
    return Response.json({ error: "Invalid IANA timezone." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update({ timezone }).eq("id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ timezone }, { status: 200 });
}

function isValidTimeZone(timezone: string): boolean {
  try {
    // Throws a RangeError for anything that isn't a real IANA zone name —
    // the standard way to validate one without a hardcoded list.
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
