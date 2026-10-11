import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads root .env.local (and .env as a fallback) into process.env for
 * vitest runs — mirrors apps/web/vitest.setup.ts exactly, so both packages
 * behave the same way when a developer has a configured .env.local:
 * `pnpm test` will pick it up and attempt the real-DB suites, which then
 * require SUPABASE_URL to point at a local Supabase instance — see
 * testing.ts for why there's no flag to point them at the hosted project.
 * Existing process.env values always win.
 */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
loadEnvFile(resolve(repoRoot, ".env.local"));
loadEnvFile(resolve(repoRoot, ".env"));
