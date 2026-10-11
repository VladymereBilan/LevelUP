import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "@levelup/db/testing";
import type { Database, Json } from "@levelup/db";
import type { Difficulty, Stat } from "@levelup/engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST } from "./route";

/**
 * Integration tests for complete_quest's title-awarding extension
 * (packages/db/supabase/migrations/20260310000015_fn_complete_quest_award_titles.sql) — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these.
 */

const TEST_FILE_LABEL = "complete/titles-awarding.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface SeededQuest {
  questId: string;
}

async function seedQuest(
  admin: SupabaseClient<Database>,
  userId: string,
  opts: { stat: Stat; difficulty: Difficulty; date: string },
): Promise<SeededQuest> {
  const { data: category, error: categoryError } = await admin
    .from("categories")
    .insert({
      user_id: userId,
      name: "Test Category",
      color: "#7C3AED",
      icon: "star",
      stat: opts.stat,
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
      difficulty: opts.difficulty,
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
      date: opts.date,
      target: { type: "checkbox" },
    })
    .select("id")
    .single();
  if (questError || !quest) throw new Error(`seed quest failed: ${questError?.message}`);

  return { questId: quest.id };
}

interface CallResult {
  status: number;
  body: Record<string, unknown>;
}

async function callComplete(
  questId: string,
  accessToken: string,
  body: Record<string, unknown> = {},
): Promise<CallResult> {
  const request = new Request(`http://localhost/api/quests/${questId}/complete`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await POST(request, { params: Promise.resolve({ id: questId }) });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe.skipIf(!configured)("POST /api/quests/[id]/complete — title awarding", () => {
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

  async function newUser(label: string): Promise<TestUser> {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  /** `titles.name` is unique, and this suite's titles outlive any single test (afterAll only,
   * not afterEach) — a random suffix means a prior run's own leftover (e.g. afterAll never
   * ran because the process was killed mid-suite) can never collide with this one. */
  async function newTitle(
    label: string,
    unlockRule: Record<string, unknown>,
  ): Promise<{ id: string; name: string }> {
    const name = `Test ${label} ${crypto.randomUUID()}`;
    const { data, error } = await admin
      .from("titles")
      .insert({ name, unlock_rule: unlockRule as Json })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Failed to insert test title: ${error?.message}`);
    createdTitleIds.push(data.id);
    return { id: data.id, name };
  }

  it("unlocks a title on the first completion that satisfies its rule", async () => {
    const a = await newUser("titles-first-unlock");
    // calcStatGain("normal") === 2, so one normal STR completion raises STR from 0 to 2.
    const title = await newTitle("Two Strength", { type: "stat", stat: "STR", value: 2 });
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "STR",
      difficulty: "normal",
      date: "2026-01-01",
    });

    const { status, body } = await callComplete(questId, a.accessToken);

    expect(status).toBe(200);
    expect(body.titlesUnlocked).toEqual([{ id: title.id, name: title.name, description: null }]);

    const { data: userTitle } = await admin
      .from("user_titles")
      .select("title_id")
      .eq("user_id", a.user.id)
      .eq("title_id", title.id)
      .maybeSingle();
    expect(userTitle?.title_id).toBe(title.id);
  });

  it("does not award a title whose rule isn't met", async () => {
    const a = await newUser("titles-not-met");
    const title = await newTitle("Unreachable Strength", { type: "stat", stat: "STR", value: 50 });
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "STR",
      difficulty: "easy",
      date: "2026-01-01",
    });

    const { status, body } = await callComplete(questId, a.accessToken);

    expect(status).toBe(200);
    expect(body.titlesUnlocked).toEqual([]);

    const { data: userTitle } = await admin
      .from("user_titles")
      .select("title_id")
      .eq("user_id", a.user.id)
      .eq("title_id", title.id)
      .maybeSingle();
    expect(userTitle).toBeNull();
  });

  it("does not double-award on an idempotent replay", async () => {
    // A distinct stat from the other tests in this file: titles are a shared, never-cleaned-
    // up-between-tests catalog, so a fresh user here must not accidentally also satisfy a
    // leftover title from an earlier test that happens to check the same stat/threshold.
    const a = await newUser("titles-no-double-award");
    const title = await newTitle("Replay Agility", { type: "stat", stat: "AGI", value: 2 });
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "AGI",
      difficulty: "normal",
      date: "2026-01-01",
    });

    const first = await callComplete(questId, a.accessToken);
    expect(first.status).toBe(200);
    expect(first.body.titlesUnlocked).toEqual([
      { id: title.id, name: title.name, description: null },
    ]);

    const second = await callComplete(questId, a.accessToken);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);

    const { data: userTitles } = await admin
      .from("user_titles")
      .select("title_id")
      .eq("user_id", a.user.id)
      .eq("title_id", title.id);
    expect(userTitles).toHaveLength(1);
  });

  it("never re-returns a title the player already owns from an earlier completion", async () => {
    const a = await newUser("titles-already-owned");
    const title = await newTitle("Already Owned Vitality", { type: "stat", stat: "VIT", value: 2 });

    const first = await seedQuest(admin, a.user.id, {
      stat: "VIT",
      difficulty: "normal",
      date: "2026-01-01",
    });
    const firstResult = await callComplete(first.questId, a.accessToken);
    expect(firstResult.body.titlesUnlocked).toEqual([
      { id: title.id, name: title.name, description: null },
    ]);

    const second = await seedQuest(admin, a.user.id, {
      stat: "VIT",
      difficulty: "normal",
      date: "2026-01-02",
    });
    const secondResult = await callComplete(second.questId, a.accessToken);
    expect(secondResult.status).toBe(200);
    expect(secondResult.body.titlesUnlocked).toEqual([]);

    const { data: userTitles } = await admin
      .from("user_titles")
      .select("title_id")
      .eq("user_id", a.user.id)
      .eq("title_id", title.id);
    expect(userTitles).toHaveLength(1);
  });
});
