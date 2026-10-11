import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "@levelup/db/testing";
import type { Database } from "@levelup/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST } from "./route";

/**
 * Integration tests against a real Supabase (local only — see
 * packages/db/src/testing.ts). To run: npx supabase start (from packages/db — requires
 * Docker), then npx supabase db reset, then pnpm --filter @levelup/web test.
 */

const TEST_FILE_LABEL = "account/delete/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

/** Every table with a user_id (or, for profiles, id) column — see
 * packages/db/supabase/migrations' on-delete-cascade chain back to auth.users via
 * profiles.id. This list is the actual proof the cascade covers everything, not just a
 * reading of the schema. */
const USER_SCOPED_TABLES = [
  "profiles",
  "stats",
  "streaks",
  "categories",
  "activities",
  "quests",
  "xp_events",
  "user_titles",
  "user_challenges",
  "rate_limit_hits",
] as const;

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function callDelete(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<CallResult> {
  const request = new Request("http://localhost/api/account/delete", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function countRowsFor(
  admin: SupabaseClient<Database>,
  table: (typeof USER_SCOPED_TABLES)[number],
  userId: string,
): Promise<number> {
  // A literal column name (not a variable holding a union type) is required for postgrest-js
  // to resolve .eq()'s type against each table in the union — see the two branches below.
  const { count, error } =
    table === "profiles"
      ? await admin.from("profiles").select("*", { count: "exact", head: true }).eq("id", userId)
      : await admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw new Error(`count failed for ${table}: ${error.message}`);
  return count ?? 0;
}

describe.skipIf(!configured)("POST /api/account/delete", () => {
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
  });

  afterAll(async () => {
    // The "success" and "idempotent" tests remove their own user as part of the
    // assertion and un-track it below — this only cleans up a failed assertion's leftovers.
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  async function newUser(label: string): Promise<TestUser> {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  /** Populates one row in every user-scoped table so deletion has something real to remove. */
  async function seedFullAccount(userId: string): Promise<void> {
    const { data: category, error: categoryError } = await admin
      .from("categories")
      .insert({
        user_id: userId,
        name: "Test Category",
        color: "#7C3AED",
        icon: "star",
        stat: "STR",
      })
      .select("id")
      .single();
    if (categoryError || !category)
      throw new Error(`seed category failed: ${categoryError?.message}`);

    const { data: activity, error: activityError } = await admin
      .from("activities")
      .insert({
        category_id: category.id,
        user_id: userId,
        name: "Test Activity",
        metric_type: "checkbox",
        target_value: { type: "checkbox" },
        schedule: { kind: "daily" },
        difficulty: "easy",
      })
      .select("id")
      .single();
    if (activityError || !activity)
      throw new Error(`seed activity failed: ${activityError?.message}`);

    const { data: quest, error: questError } = await admin
      .from("quests")
      .insert({
        user_id: userId,
        activity_id: activity.id,
        date: "2026-01-01",
        target: { type: "checkbox" },
      })
      .select("id")
      .single();
    if (questError || !quest) throw new Error(`seed quest failed: ${questError?.message}`);

    const { error: xpError } = await admin
      .from("xp_events")
      .insert({ user_id: userId, quest_id: quest.id, amount: 50, reason: "test:seed" });
    if (xpError) throw new Error(`seed xp_events failed: ${xpError.message}`);

    const { data: title, error: titleLookupError } = await admin
      .from("titles")
      .select("id")
      .limit(1)
      .single();
    if (titleLookupError || !title)
      throw new Error(`no title to grant: ${titleLookupError?.message}`);
    const { error: titleGrantError } = await admin
      .from("user_titles")
      .insert({ user_id: userId, title_id: title.id });
    if (titleGrantError) throw new Error(`seed user_titles failed: ${titleGrantError.message}`);

    const { data: challenge, error: challengeLookupError } = await admin
      .from("challenges")
      .select("id")
      .limit(1)
      .single();
    if (challengeLookupError || !challenge)
      throw new Error(`no challenge to join: ${challengeLookupError?.message}`);
    const { error: challengeJoinError } = await admin
      .from("user_challenges")
      .insert({ user_id: userId, challenge_id: challenge.id });
    if (challengeJoinError)
      throw new Error(`seed user_challenges failed: ${challengeJoinError.message}`);
  }

  it("returns 401 without a bearer token", async () => {
    const request = new Request("http://localhost/api/account/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBeTypeOf("string");
  });

  it("rejects a missing or wrong confirmation, leaving the account intact", async () => {
    const a = await newUser("account-delete-wrong-confirmation");

    const wrong = await callDelete(a.accessToken, { confirmation: "delete" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toBeTypeOf("string");

    const missing = await callDelete(a.accessToken, {});
    expect(missing.status).toBe(400);

    const { data: stillThere } = await admin.auth.admin.getUserById(a.user.id);
    expect(stillThere.user).not.toBeNull();
  });

  it("deletes the account and removes every user-scoped row", async () => {
    const a = await newUser("account-delete-success");
    await seedFullAccount(a.user.id);

    const { status, body } = await callDelete(a.accessToken, { confirmation: "DELETE" });

    expect(status).toBe(200);
    expect(body).toEqual({ deleted: true });

    const { data: deletedUser } = await admin.auth.admin.getUserById(a.user.id);
    expect(deletedUser.user).toBeNull();

    for (const table of USER_SCOPED_TABLES) {
      const count = await countRowsFor(admin, table, a.user.id);
      expect(count, `${table} should have 0 rows left for the deleted user`).toBe(0);
    }

    // Already deleted above by the route itself — don't double-delete in afterAll.
    createdUserIds.splice(createdUserIds.indexOf(a.user.id), 1);
  });

  it("is idempotent: a second call with the same (now-invalid) token fails cleanly", async () => {
    const a = await newUser("account-delete-idempotent");

    const first = await callDelete(a.accessToken, { confirmation: "DELETE" });
    expect(first.status).toBe(200);

    const second = await callDelete(a.accessToken, { confirmation: "DELETE" });
    // The account (and its token) are already gone — this must fail cleanly at
    // authentication, never 500, and never attempt a second deletion.
    expect(second.status).toBe(401);
    expect(second.body.error).toBeTypeOf("string");

    createdUserIds.splice(createdUserIds.indexOf(a.user.id), 1);
  });
});
