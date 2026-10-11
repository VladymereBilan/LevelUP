/**
 * The hosted Supabase project (levelup-dev, ref vxtxwqdsickveyjvgcyu) is PRODUCTION — see
 * CLAUDE.md and docs/PRODUCTION.md. Development and all automated tests run against a local
 * Supabase (`npx supabase start`, from packages/db) instead. This is the single source of
 * truth for "is this URL local" — both the test-suite guard (testing.ts) and the CLI-script
 * guard (scriptGuard.ts) import it, so the definition of "safe to touch" never drifts between
 * the two.
 */
export function isLocalSupabaseHost(url: string): boolean {
  const hostname = new URL(url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}
