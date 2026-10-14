import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "@levelup/db/testing";
import type { Database } from "@levelup/db";
import { getLocalDateString } from "@levelup/engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST, type BootstrapResponse } from "./route";

/**
 * Integration tests against a real Supabase — see
 * apps/web/app/api/quests/[id]/complete/route.test.ts for how to run these.
 */

const TEST_FILE_LABEL = "bootstrap/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface CallResult {
  status: number;
  body: BootstrapResponse | { error: string };
}

async function callBootstrap(accessToken?: string): Promise<CallResult> {
  const request = new Request("http://localhost/api/bootstrap", {
    method: "POST",
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
  const response = await POST(request);
  return { status: response.status, body: await response.json() };
}

function asState(body: CallResult["body"]): BootstrapResponse {
  if ("error" in body) throw new Error(`expected state, got error: ${body.error}`);
  return body;
}

async function seedDailyActivity(
  admin: SupabaseClient<Database>,
  userId: string,
  opts: { categoryName: string; activityName: string },
): Promise<void> {
  const { data: category, error: categoryError } = await admin
    .from("categories")
    .insert({
      user_id: userId,
      name: opts.categoryName,
      color: "#7C3AED",
      icon: "star",
      stat: "STR",
    })
    .select("id")
    .single();
  if (categoryError || !category) {
    throw new Error(`seed category failed: ${categoryError?.message}`);
  }

  const { error: activityError } = await admin.from("activities").insert({
    category_id: category.id,
    user_id: userId,
    name: opts.activityName,
    metric_type: "checkbox",
    target_value: { type: "checkbox" },
    schedule: { kind: "daily" },
    difficulty: "normal",
  });
  if (activityError) {
    throw new Error(`seed activity failed: ${activityError.message}`);
  }
}

describe.skipIf(!configured)("POST /api/bootstrap", () => {
  let admin: SupabaseClient<Database>;
  const createdUserIds: string[] = [];
  // One user carries the board/idempotency/titles assertions — they all read the
  // same state and none of them mutate it. The timezone test gets its own, since
  // it rewrites profiles.timezone.
  let user: TestUser;
  let tzUser: TestUser;

  beforeAll(async () => {
    admin = await createVerifiedServiceRoleClient(TEST_FILE_LABEL);
    user = await newUser("bootstrap-main");
    tzUser = await newUser("bootstrap-timezone");
    await seedDailyActivity(admin, user.user.id, {
      categoryName: "Strength",
      activityName: "Push-ups",
    });
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

  it("returns profile, stats, streak, board and titles in one response", async () => {
    const { status, body } = await callBootstrap(user.accessToken);
    expect(status).toBe(200);
    const state = asState(body);

    expect(state.profile?.id).toBe(user.user.id);
    // The signup trigger commits these alongside the profile, so a fresh account
    // still has every member populated rather than some of them null.
    expect(state.stats).toMatchObject({ str: 0, agi: 0, vit: 0, int: 0, focus: 0 });
    expect(state.streak).toMatchObject({ current: 0, longest: 0 });
    expect(Array.isArray(state.quests)).toBe(true);
    expect(Array.isArray(state.titles)).toBe(true);
    expect(state.activityCount).toBe(1);
  });

  it("generates today's quests and returns them already joined", async () => {
    const state = asState((await callBootstrap(user.accessToken)).body);

    const quest = state.quests.find((q) => q.title === "Push-ups");
    expect(quest).toBeDefined();
    // The whole point of the join: no follow-up request is needed to render a card.
    expect(quest).toMatchObject({
      categoryName: "Strength",
      categoryIcon: "star",
      categoryColor: "#7C3AED",
      stat: "STR",
      metricType: "checkbox",
      difficulty: "normal",
      progress: 0,
      status: "pending",
    });
  });

  it("is idempotent: a second call returns the same board, not a duplicated one", async () => {
    const first = asState((await callBootstrap(user.accessToken)).body);
    const second = asState((await callBootstrap(user.accessToken)).body);

    expect(second.quests.map((q) => q.questId)).toEqual(first.quests.map((q) => q.questId));
    expect(second.quests.filter((q) => q.title === "Push-ups")).toHaveLength(1);
  });

  it("returns the titles catalog with this caller's unlocked state", async () => {
    const state = asState((await callBootstrap(user.accessToken)).body);

    expect(state.titles.length).toBeGreaterThan(0);
    // A locked title still comes back, carrying the rule that describes how to
    // earn it — the Stats tab renders those, so omitting them wouldn't do.
    const locked = state.titles.find((t) => !t.unlocked);
    expect(locked).toBeDefined();
    expect(locked?.unlockRule).not.toBeNull();
    expect(locked?.unlockedAt).toBeNull();
    expect(state.titles.every((t) => typeof t.name === "string")).toBe(true);
  });

  it("scopes the board to the caller", async () => {
    // tzUser has no activities, so a board leaking across users would show up here.
    const state = asState((await callBootstrap(tzUser.accessToken)).body);
    expect(state.quests).toHaveLength(0);
    expect(state.activityCount).toBe(0);
    expect(state.profile?.id).toBe(tzUser.user.id);
  });

  it("counts an archived activity, so archiving the last one isn't read as never having one", async () => {
    const archiver = await newUser("bootstrap-archived");
    await seedDailyActivity(admin, archiver.user.id, {
      categoryName: "Cardio",
      activityName: "Jogging",
    });
    const { error } = await admin
      .from("activities")
      .update({ archived: true })
      .eq("user_id", archiver.user.id);
    expect(error).toBeNull();

    const state = asState((await callBootstrap(archiver.accessToken)).body);
    // No quest today (generation skips archived) but the count still says they
    // have one — otherwise the Quests tab would offer the starter templates to
    // someone who already built their own activities and archived them.
    expect(state.quests).toHaveLength(0);
    expect(state.activityCount).toBe(1);
  });

  it("uses the profile's timezone, not the server's UTC day, to pick the date", async () => {
    // UTC+14: for part of every UTC day this is already tomorrow, which is
    // exactly the misclassification a naive server-side date would produce.
    const timezone = "Pacific/Kiritimati";
    const { error } = await admin.from("profiles").update({ timezone }).eq("id", tzUser.user.id);
    expect(error).toBeNull();

    const state = asState((await callBootstrap(tzUser.accessToken)).body);
    expect(state.date).toBe(getLocalDateString(new Date(), timezone));
    expect(state.profile?.timezone).toBe(timezone);
  });

  it("rejects a request with no token", async () => {
    const { status } = await callBootstrap();
    expect(status).toBe(401);
  });
});
