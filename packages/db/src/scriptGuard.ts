import { isLocalSupabaseHost } from "./host";

/**
 * Every CLI script that can write data (seed, backfill-titles, and any future one-off
 * maintenance script) must call this before doing anything else. Always prints the target
 * host first — never a key or other env value. The hosted project is PRODUCTION (see
 * CLAUDE.md and docs/PRODUCTION.md): for any non-local host this refuses unless
 * CONFIRM_PRODUCTION_WRITE=true is explicitly set, so a stray SUPABASE_URL left over from
 * another task can never silently write to production.
 */
export function assertScriptMayRun(scriptLabel: string): void {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error(`[${scriptLabel}] SUPABASE_URL is not set.`);
  }

  const host = new URL(url).host;
  console.log(`[${scriptLabel}] Target Supabase host: ${host}`);

  if (isLocalSupabaseHost(url)) return;

  if (process.env.CONFIRM_PRODUCTION_WRITE !== "true") {
    throw new Error(
      `[${scriptLabel}] Refusing to run against non-local host "${host}" — this project is ` +
        "PRODUCTION. Set CONFIRM_PRODUCTION_WRITE=true only if you specifically intend to run " +
        "this against production.",
    );
  }

  console.warn(
    `[${scriptLabel}] CONFIRM_PRODUCTION_WRITE=true — proceeding against PRODUCTION host "${host}".`,
  );
}
