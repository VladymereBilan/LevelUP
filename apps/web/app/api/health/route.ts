import { connection } from "next/server";
import { createServiceRoleClient } from "@levelup/db";

/**
 * Public, unauthenticated health check — exists so a scheduled keep-alive (see
 * .github/workflows/keep-alive.yml) can touch the database every few days and prevent a
 * free-tier Supabase project from pausing for inactivity. Reads one row from `titles` (the
 * smallest, most stable table — a fixed catalog, never user data) via the service-role client,
 * the same path every other server route already uses. Never returns row content, only whether
 * the read succeeded.
 *
 * This takes no Request param, so without an explicit per-request signal Next.js's Cache
 * Components would prerender it once at build time and serve that cached response forever
 * after — defeating the entire point of a keep-alive. await connection() is the
 * Cache-Components-era way to force that (the legacy `export const dynamic` directive is
 * rejected outright when cacheComponents is on — see next.config.ts).
 */
export async function GET(): Promise<Response> {
  await connection();
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("titles").select("id").limit(1).maybeSingle();

  if (error) {
    return Response.json({ status: "error" }, { status: 503 });
  }

  return Response.json({ status: "ok" }, { status: 200 });
}
