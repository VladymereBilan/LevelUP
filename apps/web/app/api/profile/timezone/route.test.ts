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
 * Integration tests against a real Supabase — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these.
 */

const TEST_FILE_LABEL = "profile/timezone/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function callTimezone(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<CallResult> {
  const request = new Request("http://localhost/api/profile/timezone", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe.skipIf(!configured)("POST /api/profile/timezone", () => {
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];
  // Shared by both tests below: a rejected update never writes, so the invalid-zone test
  // doesn't disturb the valid-zone test's assertion, and it doesn't read the timezone value
  // itself — safe to reuse one sign-in instead of two.
  let user: TestUser;

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
    user = await newUser("timezone-valid-and-invalid");
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

  it("sets a valid IANA timezone", async () => {
    const { status, body } = await callTimezone(user.accessToken, { timezone: "Asia/Manila" });

    expect(status).toBe(200);
    expect(body).toEqual({ timezone: "Asia/Manila" });

    const { data: profile } = await admin
      .from("profiles")
      .select("timezone")
      .eq("id", user.user.id)
      .single();
    expect(profile?.timezone).toBe("Asia/Manila");
  });

  it("rejects a string that isn't a real IANA zone", async () => {
    const { status, body } = await callTimezone(user.accessToken, { timezone: "Not/AZone" });

    expect(status).toBe(400);
    expect(body.error).toBeTypeOf("string");
  });

  it("returns 401 without a bearer token", async () => {
    const request = new Request("http://localhost/api/profile/timezone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone: "Asia/Manila" }),
    });
    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBeTypeOf("string");
  });
});
