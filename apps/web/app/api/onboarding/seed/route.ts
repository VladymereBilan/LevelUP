import { seedStarterTemplate } from "@levelup/db";
import { STARTER_TEMPLATES } from "@levelup/engine";
import { authenticate, enforceRateLimit } from "@/lib/api/auth";

const RATE_LIMIT = { endpoint: "onboarding.seed", maxRequests: 5, windowSeconds: 60 };

const KNOWN_TEMPLATE_IDS = new Set(STARTER_TEMPLATES.map((t) => t.id));

/**
 * Adopts a starter template's categories/activities into the caller's own
 * rows, or does nothing for "start from scratch" (a valid choice, not an
 * error — the player just ends onboarding with zero categories and builds
 * their own later). categories/activities are insert-able directly by
 * clients already, but seeding still goes through a server route so a
 * malicious client can't fabricate `templateId`-shaped data claiming to be
 * one of the curated starter sets, and so this stays rate-limited the same
 * way every other write-triggering route is.
 *
 * Idempotent: categories has no unique constraint on (user_id, name), so
 * seedStarterTemplate() itself would happily insert duplicates on a second
 * call. Onboarding is meant to run once (the mobile client only shows it
 * while the user has zero categories), so a repeat call — a double-tap, a
 * network retry — is a no-op rather than a duplicate seed.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { supabase, userId } = auth;

  const rateLimited = await enforceRateLimit(supabase, userId, RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const body: unknown = await request.json().catch(() => ({}));
  const templateId =
    typeof body === "object" && body !== null && "templateId" in body
      ? (body as Record<string, unknown>).templateId
      : null;

  if (templateId === null || templateId === undefined) {
    return Response.json({ seeded: false, templateId: null }, { status: 200 });
  }

  if (typeof templateId !== "string" || !KNOWN_TEMPLATE_IDS.has(templateId)) {
    const known = [...KNOWN_TEMPLATE_IDS].join(", ");
    return Response.json(
      { error: `Unknown templateId. Known templates: ${known}` },
      { status: 400 },
    );
  }

  const { count, error: countError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return Response.json({ seeded: false, templateId }, { status: 200 });
  }

  try {
    await seedStarterTemplate(userId, templateId);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to seed starter template" },
      { status: 500 },
    );
  }

  return Response.json({ seeded: true, templateId }, { status: 200 });
}
