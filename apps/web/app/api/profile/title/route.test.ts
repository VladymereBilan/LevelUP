import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
} from "@levelup/db/testing";
import type { Database } from "@levelup/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST } from "./route";

/**
 * Integration tests against a real Supabase — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these.
 */

const TEST_FILE_LABEL = "profile/title/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function callEquip(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<CallResult> {
  const request = new Request("http://localhost/api/profile/title", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe.skipIf(!configured)("POST /api/profile/title", () => {
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];
  const createdTitleIds: string[] = [];

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
    for (const id of createdTitleIds) {
      await admin.from("titles").delete().eq("id", id);
    }
  });

  async function newUser(label: string) {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  /** titles.name is unique, and cleanup here is afterAll-only — a random suffix means this
   * never collides with a prior run's own leftover (same reasoning as
   * complete/titles-awarding.test.ts's newTitle). */
  async function newTitle(label: string): Promise<string> {
    const { data, error } = await admin
      .from("titles")
      .insert({ name: `Test ${label} ${crypto.randomUUID()}`, unlock_rule: { type: "level", value: 999 } })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Failed to insert test title: ${error?.message}`);
    createdTitleIds.push(data.id);
    return data.id;
  }

  async function grantTitle(userId: string, titleId: string): Promise<void> {
    const { error } = await admin.from("user_titles").insert({ user_id: userId, title_id: titleId });
    if (error) throw new Error(`Failed to grant test title: ${error.message}`);
  }

  it("equips a title the caller has unlocked", async () => {
    const a = await newUser("title-equip-owned");
    const titleId = await newTitle("Title Equip");
    await grantTitle(a.user.id, titleId);

    const { status, body } = await callEquip(a.accessToken, { titleId });

    expect(status).toBe(200);
    expect(body).toEqual({ titleId });

    const { data: profile } = await admin
      .from("profiles")
      .select("title_id")
      .eq("id", a.user.id)
      .single();
    expect(profile?.title_id).toBe(titleId);
  });

  it("rejects a title the caller hasn't unlocked", async () => {
    const a = await newUser("title-equip-unowned");
    const titleId = await newTitle("Title Unowned");

    const { status, body } = await callEquip(a.accessToken, { titleId });

    expect(status).toBe(403);
    expect(body.error).toBeTypeOf("string");

    const { data: profile } = await admin
      .from("profiles")
      .select("title_id")
      .eq("id", a.user.id)
      .single();
    expect(profile?.title_id).toBeNull();
  });

  it("unequips with titleId: null", async () => {
    const a = await newUser("title-unequip");
    const titleId = await newTitle("Title Unequip");
    await grantTitle(a.user.id, titleId);
    await callEquip(a.accessToken, { titleId });

    const { status, body } = await callEquip(a.accessToken, { titleId: null });

    expect(status).toBe(200);
    expect(body).toEqual({ titleId: null });

    const { data: profile } = await admin
      .from("profiles")
      .select("title_id")
      .eq("id", a.user.id)
      .single();
    expect(profile?.title_id).toBeNull();
  });

  it("rejects a non-string, non-null titleId", async () => {
    const a = await newUser("title-equip-bad-type");

    const { status, body } = await callEquip(a.accessToken, { titleId: 42 });

    expect(status).toBe(400);
    expect(body.error).toBeTypeOf("string");
  });

  it("returns 401 without a bearer token", async () => {
    const request = new Request("http://localhost/api/profile/title", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titleId: null }),
    });
    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBeTypeOf("string");
  });
});
