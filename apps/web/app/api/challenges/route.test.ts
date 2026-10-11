import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "@levelup/db/testing";
import type { Database } from "@levelup/db";
import type { Stat } from "@levelup/engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GET, type ChallengeResponseRow } from "./route";

/**
 * Integration tests against a real Supabase — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these.
 */

const TEST_FILE_LABEL = "challenges/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface CallResult {
  status: number;
  body: { challenges: ChallengeResponseRow[] } | { error: string };
}

async function callGet(accessToken: string): Promise<CallResult> {
  const request = new Request("http://localhost/api/challenges", {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const response = await GET(request);
  return { status: response.status, body: await response.json() };
}

describe.skipIf(!configured)("GET /api/challenges", () => {
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];
  const createdChallengeIds: string[] = [];
  // userNearNow is shared by the tests whose windows sit at/around "now" or in the past
  // (their completions and windows never overlap each other's query window) or whose own
  // completion predates its window on purpose; userAllStats is kept isolated because its test
  // counts completions across every stat in an overlapping window, so any leftover row from a
  // shared user would inflate its count. This cuts the suite from 4 sign-ins to 2.
  let userNearNow: TestUser;
  let userAllStats: TestUser;

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
    userNearNow = await newUser("challenge-near-now");
    userAllStats = await newUser("challenge-all-stats");
  });

  afterAll(async () => {
    for (const id of createdChallengeIds) {
      await admin.from("challenges").delete().eq("id", id);
    }
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  async function newUser(label: string) {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  async function insertChallenge(input: {
    name: string;
    stat: Stat | null;
    startsAt: Date;
    endsAt: Date;
    targetValue: number;
  }) {
    const { data, error } = await admin
      .from("challenges")
      .insert({
        name: input.name,
        stat: input.stat,
        starts_at: input.startsAt.toISOString(),
        ends_at: input.endsAt.toISOString(),
        target_value: input.targetValue,
        reward_xp: 100,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Failed to insert test challenge: ${error?.message}`);
    createdChallengeIds.push(data.id);
    return data.id;
  }

  async function insertActivity(userId: string, stat: Stat) {
    const { data: category, error: categoryError } = await admin
      .from("categories")
      .insert({ user_id: userId, name: `Test ${stat}`, color: "#7C3AED", icon: "sparkles", stat })
      .select("id")
      .single();
    if (categoryError || !category) {
      throw new Error(`Failed to insert test category: ${categoryError?.message}`);
    }

    const { data: activity, error: activityError } = await admin
      .from("activities")
      .insert({
        user_id: userId,
        category_id: category.id,
        name: "Test Activity",
        metric_type: "checkbox",
        target_value: { type: "checkbox" },
        schedule: { kind: "daily" },
        difficulty: "easy",
      })
      .select("id")
      .single();
    if (activityError || !activity) {
      throw new Error(`Failed to insert test activity: ${activityError?.message}`);
    }
    return activity.id;
  }

  /** `date` only has to be unique per (user, activity) — it isn't read by the progress
   * calculation (that uses `completed_at`) — so callers inserting more than one completed
   * quest for the same activity in a test must pass distinct `dateOverride`s to avoid
   * colliding with the quests_user_activity_date_unique constraint. */
  async function insertCompletedQuest(
    userId: string,
    activityId: string,
    completedAt: Date,
    dateOverride?: string,
  ) {
    const { error } = await admin.from("quests").insert({
      user_id: userId,
      activity_id: activityId,
      date: dateOverride ?? completedAt.toISOString().slice(0, 10),
      target: { type: "checkbox" },
      progress: 1,
      status: "completed",
      completed_at: completedAt.toISOString(),
    });
    if (error) throw new Error(`Failed to insert test quest: ${error.message}`);
  }

  const DAY_MS = 86_400_000;

  it("counts only completed quests matching the challenge's stat, inside the active window", async () => {
    const user = userNearNow;
    const focusActivity = await insertActivity(user.user.id, "FOCUS");
    const strActivity = await insertActivity(user.user.id, "STR");
    const now = new Date();

    await insertCompletedQuest(user.user.id, focusActivity, now, "2026-01-01");
    await insertCompletedQuest(user.user.id, focusActivity, now, "2026-01-02");
    await insertCompletedQuest(user.user.id, strActivity, now);

    const challengeId = await insertChallenge({
      name: "Focus Test Challenge",
      stat: "FOCUS",
      startsAt: new Date(now.getTime() - DAY_MS),
      endsAt: new Date(now.getTime() + DAY_MS),
      targetValue: 5,
    });

    const { status, body } = await callGet(user.accessToken);
    expect(status).toBe(200);
    const challenges = (body as { challenges: ChallengeResponseRow[] }).challenges;
    const found = challenges.find((c) => c.id === challengeId);
    expect(found).toBeDefined();
    expect(found?.progress).toBe(2);
    expect(found?.status).toBe("active");
  });

  it("counts completed quests of any stat when the challenge's stat is null", async () => {
    const user = userAllStats;
    const focusActivity = await insertActivity(user.user.id, "FOCUS");
    const strActivity = await insertActivity(user.user.id, "STR");
    const now = new Date();

    await insertCompletedQuest(user.user.id, focusActivity, now);
    await insertCompletedQuest(user.user.id, strActivity, now);

    const challengeId = await insertChallenge({
      name: "Any Stat Test Challenge",
      stat: null,
      startsAt: new Date(now.getTime() - DAY_MS),
      endsAt: new Date(now.getTime() + DAY_MS),
      targetValue: 10,
    });

    const { body } = await callGet(user.accessToken);
    const challenges = (body as { challenges: ChallengeResponseRow[] }).challenges;
    const found = challenges.find((c) => c.id === challengeId);
    expect(found?.progress).toBe(2);
    expect(found?.status).toBe("active");
  });

  it("is upcoming with zero progress before the window starts, even with matching completions", async () => {
    const user = userNearNow;
    const activityId = await insertActivity(user.user.id, "VIT");
    const now = new Date();

    await insertCompletedQuest(user.user.id, activityId, now);

    const challengeId = await insertChallenge({
      name: "Upcoming Test Challenge",
      stat: "VIT",
      startsAt: new Date(now.getTime() + DAY_MS),
      endsAt: new Date(now.getTime() + 8 * DAY_MS),
      targetValue: 3,
    });

    const { body } = await callGet(user.accessToken);
    const challenges = (body as { challenges: ChallengeResponseRow[] }).challenges;
    const found = challenges.find((c) => c.id === challengeId);
    expect(found?.progress).toBe(0);
    expect(found?.status).toBe("upcoming");
  });

  it("is completed once the window ends with enough progress, failed otherwise", async () => {
    const user = userNearNow;
    const activityId = await insertActivity(user.user.id, "AGI");
    const windowStart = new Date(Date.now() - 10 * DAY_MS);
    const windowEnd = new Date(Date.now() - 3 * DAY_MS);

    await insertCompletedQuest(user.user.id, activityId, new Date(windowStart.getTime() + DAY_MS));
    await insertCompletedQuest(
      user.user.id,
      activityId,
      new Date(windowStart.getTime() + 2 * DAY_MS),
    );

    const metChallengeId = await insertChallenge({
      name: "Ended Met Test Challenge",
      stat: "AGI",
      startsAt: windowStart,
      endsAt: windowEnd,
      targetValue: 2,
    });
    const unmetChallengeId = await insertChallenge({
      name: "Ended Unmet Test Challenge",
      stat: "AGI",
      startsAt: windowStart,
      endsAt: windowEnd,
      targetValue: 3,
    });

    const { body } = await callGet(user.accessToken);
    const challenges = (body as { challenges: ChallengeResponseRow[] }).challenges;

    const met = challenges.find((c) => c.id === metChallengeId);
    expect(met?.progress).toBe(2);
    expect(met?.status).toBe("completed");

    const unmet = challenges.find((c) => c.id === unmetChallengeId);
    expect(unmet?.progress).toBe(2);
    expect(unmet?.status).toBe("failed");
  });

  it("returns 401 without a bearer token", async () => {
    const request = new Request("http://localhost/api/challenges", { method: "GET" });
    const response = await GET(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBeTypeOf("string");
  });
});
