import { beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
} from "@levelup/db/testing";
import { GET } from "./route";

/**
 * Integration test against a real Supabase (local only — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these). Doesn't need a
 * signed-in user — this route is intentionally public.
 *
 * createVerifiedServiceRoleClient() is called here purely as a safety gate, even though its
 * result is unused: the route handler itself calls @levelup/db's createServiceRoleClient()
 * directly (the same ungated factory every live route uses — it can't be gated, since it also
 * serves real production traffic), so without this beforeAll running first, this test would
 * have no local-host check at all before GET() actually hits the database.
 */

const TEST_FILE_LABEL = "health/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

describe.skipIf(!configured)("GET /api/health", () => {
  beforeAll(async () => {
    await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
  });

  it("returns ok with no authentication required", async () => {
    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});
