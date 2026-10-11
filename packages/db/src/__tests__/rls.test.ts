import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "../testing";
import type { Database } from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Proves the RLS policies in
 * packages/db/supabase/migrations/20260310000007_rls_policies.sql actually
 * block what they're meant to block, against a real Supabase — local
 * (`supabase start`) or a hosted project both work. See ../testing.ts for
 * the skip/fail policy this (and every other real-DB suite) follows.
 *
 * To actually run it:
 *   Local:  npx supabase start (from packages/db — requires Docker), then
 *           npx supabase db reset, then pnpm --filter @levelup/db test:rls
 *   Hosted: set SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY to
 *           the project's values, set RLS_TEST_ALLOW_REMOTE=true, then
 *           pnpm --filter @levelup/db test:rls
 */

const TEST_FILE_LABEL = "rls.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

describe.skipIf(!configured)("RLS policies", () => {
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
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

    await admin.from("titles").delete().eq("id", title!.id);
  });

  it("blocks a client from inserting into user_titles directly", async () => {
    const a = await newUser("user-titles-write");

    const { data: title } = await admin
      .from("titles")
      .insert({ name: `Test Title ${crypto.randomUUID()}` })
      .select("id")
      .single();

    const { error } = await a.client
      .from("user_titles")
      .insert({ user_id: a.user.id, title_id: title!.id });
    expect(error).not.toBeNull();

    await admin.from("titles").delete().eq("id", title!.id);
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
