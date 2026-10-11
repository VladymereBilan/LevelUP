import type { Stat } from "@levelup/engine";
import type { IconName } from "../components/Icon";
import { STAT_ICONS } from "../components/StatBar";
import { statLabels } from "../theme/tokens";
import { supabase } from "./supabase";

export interface TitleDisplay {
  id: string;
  name: string;
  description: string | null;
  unlockRule: unknown;
  unlocked: boolean;
  unlockedAt: string | null;
}

/** Merges the titles catalog (readable by any authenticated user) with the signed-in user's
 * own unlocked set, so every title renders with a definite locked/unlocked state. No title
 * is ever actually unlocked yet (see CLAUDE.md's known gaps) — this just displays whatever
 * user_titles rows do exist, correctly, rather than assuming there are none. */
export async function listMyTitles(userId: string): Promise<TitleDisplay[]> {
  const [titlesResult, unlockedResult] = await Promise.all([
    supabase
      .from("titles")
      .select("id, name, description, unlock_rule")
      .order("created_at", { ascending: true }),
    supabase.from("user_titles").select("title_id, unlocked_at").eq("user_id", userId),
  ]);

  if (titlesResult.error) throw new Error(titlesResult.error.message);
  if (unlockedResult.error) throw new Error(unlockedResult.error.message);

  const unlockedAtByTitleId = new Map(
    (unlockedResult.data ?? []).map((row) => [row.title_id, row.unlocked_at]),
  );

  return (titlesResult.data ?? []).map((title) => ({
    id: title.id,
    name: title.name,
    description: title.description,
    unlockRule: title.unlock_rule,
    unlocked: unlockedAtByTitleId.has(title.id),
    unlockedAt: unlockedAtByTitleId.get(title.id) ?? null,
  }));
}

/** `unlock_rule` is freeform jsonb (see packages/db/supabase/migrations/...seed_titles_challenges.sql)
 * — interpreted generically by rule `type`, never by title name, so a new title just needs a
 * rule shape this already understands, not a new branch here. */
export function describeTitleUnlockRule(rule: unknown): string {
  if (typeof rule !== "object" || rule === null) return "Requirement unknown.";
  const r = rule as Record<string, unknown>;

  switch (r.type) {
    case "streak":
      return typeof r.days === "number" ? `Keep a ${r.days}-day streak.` : "Keep a streak alive.";
    case "stat":
      return typeof r.stat === "string" && typeof r.value === "number"
        ? `Raise ${statLabels[r.stat as Stat] ?? r.stat} to ${r.value}.`
        : "Raise a stat.";
    case "rank":
      return typeof r.value === "string" ? `Reach Rank ${r.value}.` : "Reach a higher rank.";
    case "level":
      return typeof r.value === "number" ? `Reach Level ${r.value}.` : "Reach a higher level.";
    case "totalQuestsCompleted":
      return typeof r.value === "number"
        ? `Complete ${r.value} quests, lifetime.`
        : "Complete enough quests.";
    case "totalXp":
      return typeof r.value === "number"
        ? `Earn ${r.value.toLocaleString()} XP, lifetime.`
        : "Earn enough XP.";
    case "statQuestsCompleted":
      return typeof r.stat === "string" && typeof r.value === "number"
        ? `Complete ${r.value} ${statLabels[r.stat as Stat] ?? r.stat} quests.`
        : "Complete enough quests in a stat.";
    default:
      return "Requirement unknown.";
  }
}

export function titleIcon(rule: unknown): IconName {
  if (typeof rule !== "object" || rule === null) return "shield";
  const r = rule as Record<string, unknown>;

  switch (r.type) {
    case "streak":
      return "flame";
    case "rank":
      return "trophy";
    case "level":
    case "totalXp":
      return "sparkles";
    case "totalQuestsCompleted":
      return "quest";
    case "stat":
    case "statQuestsCompleted":
      return typeof r.stat === "string" && r.stat in STAT_ICONS
        ? STAT_ICONS[r.stat as Stat]
        : "shield";
    default:
      return "shield";
  }
}
