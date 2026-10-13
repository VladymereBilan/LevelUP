import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createVerifiedServiceRoleClient,
  createSignedInTestUser,
  isSupabaseTestEnvConfigured,
  warnSkippingSupabaseTests,
  type TestUser,
} from "@levelup/db/testing";
import type { Database } from "@levelup/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Difficulty, Stat } from "@levelup/engine";
import { POST } from "./route";

/**
 * Integration tests against a real Supabase (local or hosted) — this route
 * handler's whole job is orchestrating real DB reads/writes through
 * @levelup/engine and complete_quest(), so there's no meaningful way to
 * test it against a mock. Same skip/fail policy as every other real-DB
 * suite — see packages/db/src/testing.ts.
 *
 * To actually run it: npx supabase start (from packages/db — requires Docker), then
 * npx supabase db reset, then pnpm --filter @levelup/web test. There is no hosted
 * option — the hosted project is PRODUCTION (see packages/db/src/testing.ts).
 */

const TEST_FILE_LABEL = "complete/route.test.ts";
const configured = isSupabaseTestEnvConfigured();

if (!configured) {
  warnSkippingSupabaseTests(TEST_FILE_LABEL);
}

interface SeededQuest {
  questId: string;
  categoryId: string;
  activityId: string;
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

  return { questId: quest.id, categoryId: category.id, activityId: activity.id };
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

describe.skipIf(!configured)("POST /api/quests/[id]/complete", () => {
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

  afterEach(() => {
    vi.useRealTimers();
  });

  async function newUser(label: string): Promise<TestUser> {
    const testUser = await createSignedInTestUser(admin, label);
    createdUserIds.push(testUser.user.id);
    return testUser;
  }

  it("completes a quest, awards XP and a stat point, and advances the streak", async () => {
    const a = await newUser("complete-normal");
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "STR",
      difficulty: "normal",
      date: "2026-01-01",
    });

    const { status, body } = await callComplete(questId, a.accessToken);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      xpAwarded: 12, // round(20 base * 1 normal * 0.6 manual * 1.025 (1-day streak))
      level: 1,
      leveledUp: false,
      rankedUp: false,
      stat: "STR",
      statValue: 2, // calcStatGain("normal")
    });
    expect((body.streak as Record<string, unknown>).current).toBe(1);

    const { data: quest } = await admin.from("quests").select("status").eq("id", questId).single();
    expect(quest?.status).toBe("completed");

    const { data: stats } = await admin
      .from("stats")
      .select("str")
      .eq("user_id", a.user.id)
      .single();
    expect(stats?.str).toBe(2);
  });

  it("replays the same result with 200 on a repeat call instead of erroring", async () => {
    const a = await newUser("complete-idempotent");
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "AGI",
      difficulty: "easy",
      date: "2026-01-01",
    });

    const first = await callComplete(questId, a.accessToken);
    expect(first.status).toBe(200);

    const second = await callComplete(questId, a.accessToken);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  it("rejects completing another user's quest", async () => {
    const owner = await newUser("complete-owner");
    const intruder = await newUser("complete-intruder");
    const { questId } = await seedQuest(admin, owner.user.id, {
      stat: "VIT",
      difficulty: "normal",
      date: "2026-01-01",
    });

    const { status } = await callComplete(questId, intruder.accessToken);
    expect(status).toBe(404);

    const { data: quest } = await admin.from("quests").select("status").eq("id", questId).single();
    expect(quest?.status).toBe("pending");
  });

  it("levels up when the award crosses the XP threshold", async () => {
    const a = await newUser("complete-level-up");
    await admin.from("profiles").update({ level: 1, xp: 90 }).eq("id", a.user.id);
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "FOCUS",
      difficulty: "hard",
      date: "2026-01-01",
    });

    const { status, body } = await callComplete(questId, a.accessToken, { source: "health" });

    expect(status).toBe(200);
    // round(20 * 1.5 hard * 1.0 health * 1.025 (1-day streak)) = 31; 90+31=121 crosses 100.
    expect(body.xpAwarded).toBe(31);
    expect(body.leveledUp).toBe(true);
    expect(body.levelsGained).toBe(1);
    expect(body.level).toBe(2);
    expect(body.xp).toBe(21);
  });

  it("caps the XP award once the daily cap is reached, but still completes the quest", async () => {
    const a = await newUser("complete-daily-cap");
    await admin.from("xp_events").insert({ user_id: a.user.id, amount: 490, reason: "test-setup" });
    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "INT",
      difficulty: "hard",
      date: "2026-01-01",
    });

    const { status, body } = await callComplete(questId, a.accessToken, { source: "health" });

    expect(status).toBe(200);
    // Raw award would be 31 (see level-up test), but only 500-490=10 headroom remains.
    expect(body.xpAwarded).toBe(10);

    const { data: quest } = await admin.from("quests").select("status").eq("id", questId).single();
    expect(quest?.status).toBe("completed");
  });

  it("tolerates a local date that moves backwards behind the last recorded completion", async () => {
    // A player who flies west, or whose device clock/timezone is wound back, reports a local
    // date EARLIER than streaks.last_completed_date. recordStreakCompletion rejects that
    // outright with a RangeError, which nothing here catches — so without the route clamping
    // it, every completion 500s until the calendar catches up. The clamp treats it as another
    // completion on the already-recorded day: the same-day no-op.
    const a = await newUser("complete-backwards-date");
    await admin.from("profiles").update({ timezone: "UTC" }).eq("id", a.user.id);
    await admin
      .from("streaks")
      .update({ current: 3, longest: 5, last_completed_date: "2026-03-06", grace_days_used: 0 })
      .eq("user_id", a.user.id);

    const { questId } = await seedQuest(admin, a.user.id, {
      stat: "VIT",
      difficulty: "normal",
      date: "2026-03-05",
    });

    // Only Date is faked. A bare vi.useFakeTimers() also replaces setTimeout/setInterval,
    // which supabase-js's HTTP stack needs real ones of — with the clock frozen and nothing
    // advancing it, a request that happens to wait on a timer never completes. That is fast
    // enough to slip through locally and hangs on a slower CI runner, which is exactly how
    // this surfaced: these were the only two tests here using fake timers, and the only two
    // that timed out in CI.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-05T12:00:00.000Z"));
    const { status, body } = await callComplete(questId, a.accessToken);

    expect(status).toBe(200);
    const streak = body.streak as Record<string, unknown>;
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(5);
    expect(streak.lastCompletedDate).toBe("2026-03-06");

    const { data: quest } = await admin.from("quests").select("status").eq("id", questId).single();
    expect(quest?.status).toBe("completed");
  });

  it("uses the user's local date, not the server's UTC date, for the streak boundary", async () => {
    const a = await newUser("complete-timezone");
    await admin.from("profiles").update({ timezone: "Asia/Manila" }).eq("id", a.user.id);

    const { questId: questId1, activityId } = await seedQuest(admin, a.user.id, {
      stat: "STR",
      difficulty: "normal",
      date: "2026-03-05",
    });

    // 2026-03-05T15:30:00Z = 2026-03-05 23:30 in Asia/Manila (UTC+8).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-05T15:30:00.000Z"));
    const first = await callComplete(questId1, a.accessToken);
    expect(first.status).toBe(200);
    expect((first.body.streak as Record<string, unknown>).current).toBe(1);
    expect((first.body.streak as Record<string, unknown>).lastCompletedDate).toBe("2026-03-05");

    // A second quest (new activity/date to satisfy the unique constraint)
    // completed 1 real hour later — but at 2026-03-05T16:30:00Z, which is
    // 2026-03-06 00:30 in Asia/Manila: the NEXT local calendar day, even
    // though both instants share the same UTC date. A UTC-date bug would
    // see this as the same day and leave the streak at 1.
    const { data: category2 } = await admin
      .from("categories")
      .insert({
        user_id: a.user.id,
        name: "Test Category 2",
        color: "#3B82F6",
        icon: "book",
        stat: "STR",
      })
      .select("id")
      .single();
    const { data: activity2 } = await admin
      .from("activities")
      .insert({
        category_id: category2!.id,
        user_id: a.user.id,
        name: "Test Activity 2",
        metric_type: "checkbox",
        target_value: { type: "checkbox" },
        schedule: { kind: "daily" },
        difficulty: "normal",
      })
      .select("id")
      .single();
    const { data: quest2 } = await admin
      .from("quests")
      .insert({
        user_id: a.user.id,
        activity_id: activity2!.id,
        date: "2026-03-06",
        target: { type: "checkbox" },
      })
      .select("id")
      .single();
    expect(activityId).not.toBe(activity2!.id);

    vi.setSystemTime(new Date("2026-03-05T16:30:00.000Z"));
    const second = await callComplete(quest2!.id, a.accessToken);
    expect(second.status).toBe(200);
    expect((second.body.streak as Record<string, unknown>).current).toBe(2);
    expect((second.body.streak as Record<string, unknown>).lastCompletedDate).toBe("2026-03-06");
  });
});
