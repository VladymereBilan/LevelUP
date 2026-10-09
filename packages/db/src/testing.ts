import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Shared environment-gating for every test suite that runs against a real
 * Supabase (local or hosted) rather than mocks — there's no way to verify
 * RLS, a server-only RPC's privileges, or a route handler's DB writes short
 * of a real Postgres + PostgREST.
 *
 * The policy every caller of this module follows: SKIP only when
 * SUPABASE_URL isn't set at all (a genuinely unconfigured environment).
 * Once a URL is configured, any problem — host unreachable, a rejected key,
 * a missing RLS_TEST_ALLOW_REMOTE opt-in for a non-local host — is a test
 * FAILURE, not a quiet skip: a configured-but-broken setup is worth
 * surfacing loudly. See each call site's file-level comment for the exact
 * commands to run it.
 */

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseTestEnvConfigured(): boolean {
  return SUPABASE_URL !== "";
}

export function missingSupabaseEnvVarNames(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

/** Call when skipping (SUPABASE_URL unset) — never logs values, only names. */
export function warnSkippingSupabaseTests(testFileLabel: string): void {
  console.warn(
    `[${testFileLabel}] Skipping: no SUPABASE_URL configured. ` +
      `Missing/empty env var(s): ${missingSupabaseEnvVarNames().join(", ")}. Values are never logged. ` +
      "Point these at a local (`npx supabase start`) or hosted Supabase project, then re-run. " +
      "See packages/db/README.md.",
  );
}

function isLocalHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

/**
 * Validates the environment is actually usable — the remote-host opt-in,
 * network reachability, and both keys — then returns a ready service-role
 * client. Throws (test FAILURE) on any problem; see the file-level comment
 * above for why that's the right behavior once a URL is configured.
 */
export async function createVerifiedServiceRoleClient(
  testFileLabel: string,
): Promise<SupabaseClient<Database>> {
  const host = new URL(SUPABASE_URL).host;
  const hostname = new URL(SUPABASE_URL).hostname;
  // Printed before anything else — including before the remote-host guard
  // — so it's visible no matter how this ends.
  console.log(`[${testFileLabel}] Supabase host: ${host}`);

  if (!isLocalHost(hostname) && process.env.RLS_TEST_ALLOW_REMOTE !== "true") {
    throw new Error(
      `Refusing to run against non-local host "${host}" without RLS_TEST_ALLOW_REMOTE=true. ` +
        "This suite creates/deletes real auth users and rows. Set RLS_TEST_ALLOW_REMOTE=true " +
        "only if you intend to run it against this project.",
    );
  }

  // Reachability: network-level only. ANY HTTP response — including a 401
  // (e.g. a missing/rejected apikey header) — means the host is reachable;
  // only a thrown network error (DNS failure, connection refused, TLS
  // error, timeout) means it isn't.
  let healthResponse: Response;
  try {
    healthResponse = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(5000),
    });
  } catch (networkError) {
    const reason = networkError instanceof Error ? networkError.message : String(networkError);
    throw new Error(`Supabase at "${host}" is unreachable (network error): ${reason}`);
  }
  console.log(`[${testFileLabel}] Reachability probe: HTTP ${healthResponse.status} from ${host}`);

  // Key validation: a configured-but-wrong key is a FAILURE, not a skip.
  // /auth/v1/settings (not /rest/v1/) deliberately: the PostgREST root
  // endpoint is service_role-only on some projects (a platform hardening
  // setting, unrelated to whether the anon key itself is valid), and any
  // actual table would depend on that table's own RLS grants for anon —
  // neither of which is what we're trying to check here. The auth
  // settings endpoint validates the apikey itself and nothing else: 200
  // means accepted, 401 "Invalid API key" means genuinely rejected.
  const anonCheck = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(5000),
  });
  if (!anonCheck.ok) {
    throw new Error(
      `Supabase anon key rejected at "${host}": HTTP ${anonCheck.status} ${anonCheck.statusText}`,
    );
  }

  const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: serviceCheckError } = await admin.auth.admin.listUsers({ perPage: 1 });
  if (serviceCheckError) {
    throw new Error(`Supabase service key invalid at "${host}": ${serviceCheckError.message}`);
  }

  return admin;
}

export interface TestUser {
  user: User;
  client: SupabaseClient<Database>;
  /** Raw access token — for constructing an `Authorization` header directly
   * (e.g. calling a route handler's exported function in-process). */
  accessToken: string;
}

/** Creates a confirmed auth user and returns a client signed in as them via the anon key. */
export async function createSignedInTestUser(
  admin: SupabaseClient<Database>,
  label: string,
): Promise<TestUser> {
  const email = `test-${label}-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create test user "${label}": ${createError?.message}`);
  }

  const anon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    throw new Error(`Failed to sign in test user "${label}": ${signInError?.message}`);
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  });

  return { user: created.user, client, accessToken: signedIn.session.access_token };
}
