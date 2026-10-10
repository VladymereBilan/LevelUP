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

const TEST_FILE_LABEL = "onboarding/username/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function callUsername(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<CallResult> {
  const request = new Request("http://localhost/api/onboarding/username", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe.skipIf(!configured)("POST /api/onboarding/username", () => {
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

  it("sets a valid username", async () => {
    const a = await newUser("username-valid");
    const name = `Hunter${Date.now()}`;

    const { status, body } = await callUsername(a.accessToken, { username: name });

    expect(status).toBe(200);
    expect(body).toEqual({ username: name });

    const { data: profile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", a.user.id)
      .single();
    expect(profile?.username).toBe(name);
  });

  it("rejects an invalid format", async () => {
    const a = await newUser("username-invalid-format");

    const { status, body } = await callUsername(a.accessToken, { username: "a" });

    expect(status).toBe(400);
    expect(body.error).toBeTypeOf("string");
  });

  it("rejects a username that's already taken, case-insensitively", async () => {
    const a = await newUser("username-taken-a");
    const b = await newUser("username-taken-b");
    const name = `Taken${Date.now()}`;

    const first = await callUsername(a.accessToken, { username: name });
    expect(first.status).toBe(200);

    const second = await callUsername(b.accessToken, { username: name.toUpperCase() });
    expect(second.status).toBe(409);
  });

  it("returns 401 without a bearer token", async () => {
    const request = new Request("http://localhost/api/onboarding/username", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "NoToken" }),
    });
    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBeTypeOf("string");
  });
});
