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

const TEST_FILE_LABEL = "onboarding/seed/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function callSeed(accessToken: string, body: Record<string, unknown>): Promise<CallResult> {
  const request = new Request("http://localhost/api/onboarding/seed", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe.skipIf(!configured)("POST /api/onboarding/seed", () => {
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

  async function newUser(label: string) {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  it("seeds the Gym Starter template's categories and activities", async () => {
    const a = await newUser("seed-gym");

    const { status, body } = await callSeed(a.accessToken, { templateId: "tmpl-gym-starter" });

    expect(status).toBe(200);
    expect(body).toEqual({ seeded: true, templateId: "tmpl-gym-starter" });

    const { data: categories } = await admin
      .from("categories")
      .select("name")
      .eq("user_id", a.user.id);
    expect(categories).toHaveLength(3);

    const { data: activities } = await admin
      .from("activities")
      .select("name")
      .eq("user_id", a.user.id);
    expect(activities).toHaveLength(4);
  });

  it("does nothing for a null templateId (start from scratch)", async () => {
    const a = await newUser("seed-scratch");

    const { status, body } = await callSeed(a.accessToken, { templateId: null });

    expect(status).toBe(200);
    expect(body).toEqual({ seeded: false, templateId: null });

    const { data: categories } = await admin
      .from("categories")
      .select("id")
      .eq("user_id", a.user.id);
    expect(categories).toHaveLength(0);
  });

  it("rejects an unknown templateId", async () => {
    const a = await newUser("seed-unknown");

    const { status, body } = await callSeed(a.accessToken, { templateId: "tmpl-does-not-exist" });

    expect(status).toBe(400);
    expect(body.error).toBeTypeOf("string");
  });

  it("is idempotent: a second call doesn't duplicate categories/activities", async () => {
    const a = await newUser("seed-idempotent");

    const first = await callSeed(a.accessToken, { templateId: "tmpl-gym-starter" });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ seeded: true, templateId: "tmpl-gym-starter" });

    const second = await callSeed(a.accessToken, { templateId: "tmpl-gym-starter" });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ seeded: false, templateId: "tmpl-gym-starter" });

    const { data: categories } = await admin
      .from("categories")
      .select("id")
      .eq("user_id", a.user.id);
    expect(categories).toHaveLength(3);

    const { data: activities } = await admin
      .from("activities")
      .select("id")
      .eq("user_id", a.user.id);
    expect(activities).toHaveLength(4);
  });

  it("returns 401 without a bearer token", async () => {
    const request = new Request("http://localhost/api/onboarding/seed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateId: null }),
    });
    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBeTypeOf("string");
  });
});
