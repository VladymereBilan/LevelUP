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
 * Proves the server-only Postgres functions actually can't be called by an
 * authenticated client — their EXECUTE grant is service_role-only (revoked
 * from anon/authenticated in each function's own migration). This matters
 * because these functions are the only path that writes level/xp/rank/stats
 * or generates quests server-side: if a client could call them directly over
 * RPC, the route handlers' own checks (JWT ownership, status validation, rate
 * limiting) would be bypassable entirely.
 *
 * get_home_state writes nothing, so it's here for a different reason: it reads
 * another user's whole profile, stats, streak, board and titles when handed
 * their id. It's `security definer`, so RLS does not constrain it — the
 * service_role-only grant is the entire boundary.
 *
 * Same skip/fail policy as every other real-DB suite — see
 * packages/db/src/testing.ts.
 *
 * To actually run it: npx supabase start (from packages/db — requires Docker), then
 * npx supabase db reset, then pnpm --filter @levelup/db test:rpc-privileges. There is no
 * hosted option — the hosted project is PRODUCTION (see testing.ts).
 */

const TEST_FILE_LABEL = "rpc-privileges.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

describe.skipIf(!configured)("server-only RPC privileges", () => {
  let admin: SupabaseClient<Database>;
  let a: TestUser;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
    a = await createSignedInTestUser(admin, "rpc-privileges");
    createdUserIds.push(a.user.id);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("blocks an authenticated client from calling complete_quest directly", async () => {
    const { error } = await a.client.rpc("complete_quest", {
      p_quest_id: "00000000-0000-0000-0000-000000000000",
      p_user_id: a.user.id,
      p_progress: 1,
      p_source: "manual",
      p_xp_awarded: 1_000_000,
      p_reason: "forged",
      p_new_level: 999,
      p_new_xp: 0,
      p_new_rank: "S",
      p_leveled_up: true,
      p_levels_gained: 999,
      p_ranked_up: true,
      p_stat: "STR",
      p_new_stat_value: 999,
      p_new_streak_current: 999,
      p_new_streak_longest: 999,
      p_new_streak_last_date: "2026-01-01",
      p_new_streak_grace_used: 0,
    });
    expect(error).not.toBeNull();
  });

  it("blocks an authenticated client from calling generate_daily_quests directly", async () => {
    const { error } = await a.client.rpc("generate_daily_quests", {
      p_user_id: a.user.id,
      p_date: "2026-01-01",
    });
    expect(error).not.toBeNull();
  });

  it("blocks an authenticated client from calling get_home_state directly", async () => {
    // Asking for their own id, which RLS would have allowed through the
    // underlying tables — the point is that the function itself is unreachable.
    const { error } = await a.client.rpc("get_home_state", {
      p_user_id: a.user.id,
      p_date: "2026-01-01",
    });
    expect(error).not.toBeNull();
  });

  it("blocks an authenticated client from calling check_rate_limit directly", async () => {
    const { error } = await a.client.rpc("check_rate_limit", {
      p_user_id: a.user.id,
      p_endpoint: "anything",
      p_max_requests: 1_000_000,
      p_window_seconds: 1,
    });
    expect(error).not.toBeNull();
  });
});
