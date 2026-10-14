import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  SUPABASE_ANON_KEY,
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "@levelup/db/testing";
import type { Database } from "@levelup/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticate, authenticateFresh } from "./auth";

/**
 * Integration tests against a real Supabase — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these.
 *
 * Deliberately not unit tests with a self-signed token: what's worth checking here is
 * that `authenticate` accepts a token this project's own Auth server actually issued
 * and rejects everything else. A token minted from a key pair the test generated would
 * only prove the assertion the test itself set up.
 */

const TEST_FILE_LABEL = "lib/api/auth.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

/** Assembled rather than written out as a literal: a hardcoded `eyJ...` string is exactly
 * what .githooks/pre-commit refuses to let through, whether or not it's a real token. */
function forgedToken(): string {
  const segment = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    segment({ alg: "HS256", typ: "JWT" }),
    segment({ sub: "attacker", role: "authenticated", exp: 9999999999 }),
    Buffer.from("not-a-real-signature").toString("base64url"),
  ].join(".");
}

function requestWith(header?: string): Request {
  return new Request("http://localhost/api/anything", {
    method: "POST",
    headers: header ? { authorization: header } : {},
  });
}

describe.skipIf(!configured)("authenticate", () => {
  let admin: SupabaseClient<Database>;
  let user: TestUser;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
    user = await createSignedInTestUser(admin, "authenticate");
    createdUserIds.push(user.user.id);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("resolves a real access token to its own user id", async () => {
    const result = await authenticate(requestWith(`Bearer ${user.accessToken}`));
    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({ userId: user.user.id });
  });

  it("accepts a lowercase bearer scheme", async () => {
    const result = await authenticate(requestWith(`bearer ${user.accessToken}`));
    expect(result).toMatchObject({ userId: user.user.id });
  });

  it("rejects a request with no Authorization header", async () => {
    const result = await authenticate(requestWith());
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("rejects a token that isn't a JWT at all", async () => {
    const result = await authenticate(requestWith("Bearer not-a-jwt"));
    expect((result as Response).status).toBe(401);
  });

  it("rejects a well-formed token this project didn't sign", async () => {
    // Right shape, right claims, unverifiable signature — the case that matters most,
    // since the fast path's whole job is to not take a token's word for its own claims.
    const result = await authenticate(requestWith(`Bearer ${forgedToken()}`));
    expect((result as Response).status).toBe(401);
  });

  it("rejects the project's own anon key, which is also a token it signed", async () => {
    // The fast path trusts a signature, so it has to be the `role` claim that stops a
    // non-end-user token from standing in for a user id.
    const result = await authenticate(requestWith(`Bearer ${SUPABASE_ANON_KEY}`));
    expect((result as Response).status).toBe(401);
  });

  it("gives the same answer as authenticateFresh for a valid token", async () => {
    const fast = await authenticate(requestWith(`Bearer ${user.accessToken}`));
    const fresh = await authenticateFresh(requestWith(`Bearer ${user.accessToken}`));
    expect(fresh).toMatchObject({ userId: user.user.id });
    expect((fast as { userId: string }).userId).toBe((fresh as { userId: string }).userId);
  });

  it("rejects a bad token on the fresh path too", async () => {
    const result = await authenticateFresh(requestWith("Bearer not-a-jwt"));
    expect((result as Response).status).toBe(401);
  });
});
