import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Proves the RLS policies in
 * packages/db/supabase/migrations/20260310000007_rls_policies.sql actually
 * block what they're meant to block, against a real local Supabase. There
 * is no way to verify this against anything less than a real Postgres +
 * PostgREST (RLS is enforced by Postgres itself, and the service_role vs.
 * authenticated distinction only exists through PostgREST's JWT handling) —
 * so this suite skips, clearly, when one isn't reachable instead of
 * pretending to pass.
 *
 * To actually run it:
 *   1. npx supabase start       (from packages/db — requires Docker)
 *   2. npx supabase db reset    (applies every migration fresh)
 *   3. pnpm --filter @levelup/db test:rls
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function isSupabaseReachable(): Promise<boolean> {
  if (!ANON_KEY || !SERVICE_ROLE_KEY) {
    return false;
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const reachable = await isSupabaseReachable();

if (!reachable) {
  console.warn(
    `[rls.test.ts] Skipping: no local Supabase reachable at ${SUPABASE_URL}. ` +
      "Run `npx supabase start` + `npx supabase db reset` from packages/db, then " +
      "re-run `pnpm --filter @levelup/db test:rls`. See packages/db/README.md.",
  );
}

interface TestUser {
  user: User;
  client: SupabaseClient<Database>;
}

async function createSignedInTestUser(
  admin: SupabaseClient<Database>,
  label: string,
): Promise<TestUser> {
  const email = `rls-test-${label}-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create test user "${label}": ${createError?.message}`);
  }

  const anon = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    throw new Error(`Failed to sign in test user "${label}": ${signInError?.message}`);
  }

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  });

  return { user: created.user, client };
}

describe.skipIf(!reachable)("RLS policies (requires local Supabase)", () => {
  // Created in beforeAll, not at describe-body scope: describe.skipIf still
  // runs this factory function to collect the test tree even when the
  // whole suite is skipped, so anything that touches SERVICE_ROLE_KEY (empty
  // when not reachable) must be deferred into a hook, not evaluated here.
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  async function newUser(label: string): Promise<TestUser> {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  it("blocks a user from reading another user's profile", async () => {
    const a = await newUser("profile-a");
    const b = await newUser("profile-b");

    const { data: ownProfile } = await a.client
      .from("profiles")
      .select("id")
      .eq("id", a.user.id)
      .maybeSingle();
    expect(ownProfile?.id).toBe(a.user.id);

    const { data: othersProfile } = await a.client
      .from("profiles")
      .select("id")
      .eq("id", b.user.id)
      .maybeSingle();
    expect(othersProfile).toBeNull();
  });

  it("blocks a client from writing level/xp/rank on profiles directly", async () => {
    const a = await newUser("profile-write");

    const { error } = await a.client.from("profiles").update({ level: 999 }).eq("id", a.user.id);
    expect(error).not.toBeNull();
  });

  it("blocks a client from writing stats directly", async () => {
    const a = await newUser("stats-write");

    const { error } = await a.client.from("stats").update({ str: 999 }).eq("user_id", a.user.id);
    expect(error).not.toBeNull();
  });

  it("blocks a client from inserting into the xp_events ledger", async () => {
    const a = await newUser("xp-events-write");

    const { error } = await a.client
      .from("xp_events")
      .insert({ user_id: a.user.id, amount: 100, reason: "forged" });
    expect(error).not.toBeNull();
  });

  it("lets a user fully manage their own categories but not read another user's", async () => {
    const a = await newUser("categories-a");
    const b = await newUser("categories-b");

    const { data: created, error: insertError } = await a.client
      .from("categories")
      .insert({
        user_id: a.user.id,
        name: "Strength",
        color: "#7C3AED",
        icon: "dumbbell",
        stat: "STR",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    expect(created?.id).toBeTruthy();

    const { data: asOwner } = await a.client
      .from("categories")
      .select("id")
      .eq("id", created!.id)
      .maybeSingle();
    expect(asOwner?.id).toBe(created!.id);

    const { data: asOther } = await b.client
      .from("categories")
      .select("id")
      .eq("id", created!.id)
      .maybeSingle();
    expect(asOther).toBeNull();
  });

  it("lets a user update a quest's progress but not its status", async () => {
    const a = await newUser("quests-progress");

    const { data: category } = await a.client
      .from("categories")
      .insert({ user_id: a.user.id, name: "Study", color: "#3B82F6", icon: "book", stat: "INT" })
      .select("id")
      .single();

    const { data: activity } = await a.client
      .from("activities")
      .insert({
        category_id: category!.id,
        user_id: a.user.id,
        name: "Read",
        metric_type: "minutes",
        target_value: { type: "minutes", minutes: 30 },
        schedule: { kind: "daily" },
        difficulty: "normal",
      })
      .select("id")
      .single();

    const { data: quest, error: questInsertError } = await a.client
      .from("quests")
      .insert({
        user_id: a.user.id,
        activity_id: activity!.id,
        date: "2026-03-05",
        target: { type: "minutes", minutes: 30 },
      })
      .select("id, status")
      .single();
    expect(questInsertError).toBeNull();
    expect(quest?.status).toBe("pending");

    const { error: progressError } = await a.client
      .from("quests")
      .update({ progress: 15 })
      .eq("id", quest!.id);
    expect(progressError).toBeNull();

    const { error: statusError } = await a.client
      .from("quests")
      .update({ status: "completed" })
      .eq("id", quest!.id);
    expect(statusError).not.toBeNull();
  });

  it("lets any authenticated user read the titles catalog but not write it", async () => {
    const a = await newUser("titles-read");

    const { data: title, error: seedError } = await admin
      .from("titles")
      .insert({ name: `Test Title ${crypto.randomUUID()}` })
      .select("id, name")
      .single();
    expect(seedError).toBeNull();

    const { data: readBack } = await a.client
      .from("titles")
      .select("id")
      .eq("id", title!.id)
      .maybeSingle();
    expect(readBack?.id).toBe(title!.id);

    const { error: writeError } = await a.client
      .from("titles")
      .update({ name: "hacked" })
      .eq("id", title!.id);
    expect(writeError).not.toBeNull();
  });

  it("blocks a client from writing user_challenges at all", async () => {
    const a = await newUser("user-challenges-write");

    const { data: challenge } = await admin
      .from("challenges")
      .insert({
        name: `Test Challenge ${crypto.randomUUID()}`,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
        target_value: 10,
      })
      .select("id")
      .single();

    const { error } = await a.client
      .from("user_challenges")
      .insert({ user_id: a.user.id, challenge_id: challenge!.id });
    expect(error).not.toBeNull();
  });
});
