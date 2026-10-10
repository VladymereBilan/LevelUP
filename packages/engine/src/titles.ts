import { STATS, type Rank, type Stat, type StatBlock } from "./types";

/**
 * The titles catalog's `unlock_rule` column is freeform jsonb (see
 * packages/db/supabase/migrations/20260310000014_seed_titles_challenges.sql)
 * — admin-edited data, not code. This is the one and only vocabulary this
 * game understands for it; every seeded title's rule must parse as one of
 * these seven shapes, and a new title can only ever use one of them too.
 *
 * - `rank`: current rank is at least `value` (rank order E < D < C < B < A < S
 *   — "at least", so reaching S also satisfies a "reach C" title).
 * - `level`: current level is at least `value`.
 * - `streak`: the player's longest-ever streak is at least `days` — checked
 *   against the all-time high, not the current streak, so a title earned
 *   once can never be "un-earned" by later breaking the streak.
 * - `totalQuestsCompleted`: lifetime completed-quest count is at least
 *   `value`.
 * - `totalXp`: lifetime XP (the sum of every xp_events row, win or loss) is
 *   at least `value`.
 * - `stat`: the named stat's current value is at least `value`.
 * - `statQuestsCompleted`: lifetime completed-quest count whose activity's
 *   category stat is `stat` is at least `value`.
 */
export type TitleRule =
  | { type: "rank"; value: Rank }
  | { type: "level"; value: number }
  | { type: "streak"; days: number }
  | { type: "totalQuestsCompleted"; value: number }
  | { type: "totalXp"; value: number }
  | { type: "stat"; stat: Stat; value: number }
  | { type: "statQuestsCompleted"; stat: Stat; value: number };

/** Everything a rule might need to check against — the caller (apps/web's completion route)
 * assembles this from already-computed, post-completion values, the same way it assembles
 * the values it passes to complete_quest. */
export interface TitleEvaluationState {
  level: number;
  rank: Rank;
  longestStreak: number;
  totalXp: number;
  totalQuestsCompleted: number;
  stats: StatBlock;
  questsCompletedByStat: StatBlock;
}

export interface TitleCatalogEntry {
  id: string;
  /** Raw, unvalidated jsonb from the titles table. */
  unlockRule: unknown;
  /** Whether the player already has this title — evaluateTitleRules never returns these. */
  alreadyUnlocked: boolean;
}

const RANK_ORDER: readonly Rank[] = ["E", "D", "C", "B", "A", "S"];
const STAT_SET: ReadonlySet<string> = new Set(STATS);

function isRank(value: unknown): value is Rank {
  return typeof value === "string" && (RANK_ORDER as readonly string[]).includes(value);
}

function isStat(value: unknown): value is Stat {
  return typeof value === "string" && STAT_SET.has(value);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Parses `raw` into a known TitleRule, or null for anything malformed or unrecognized —
 * never throws. A locked-category/typo'd rule in the catalog must never break quest
 * completion; it should just never be satisfiable. */
export function parseTitleRule(raw: unknown): TitleRule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  switch (r.type) {
    case "rank":
      return isRank(r.value) ? { type: "rank", value: r.value } : null;
    case "level":
      return isPositiveNumber(r.value) ? { type: "level", value: r.value } : null;
    case "streak":
      return isPositiveNumber(r.days) ? { type: "streak", days: r.days } : null;
    case "totalQuestsCompleted":
      return isPositiveNumber(r.value) ? { type: "totalQuestsCompleted", value: r.value } : null;
    case "totalXp":
      return isPositiveNumber(r.value) ? { type: "totalXp", value: r.value } : null;
    case "stat":
      return isStat(r.stat) && isPositiveNumber(r.value)
        ? { type: "stat", stat: r.stat, value: r.value }
        : null;
    case "statQuestsCompleted":
      return isStat(r.stat) && isPositiveNumber(r.value)
        ? { type: "statQuestsCompleted", stat: r.stat, value: r.value }
        : null;
    default:
      return null;
  }
}

function isRuleSatisfied(rule: TitleRule, state: TitleEvaluationState): boolean {
  switch (rule.type) {
    case "rank":
      return RANK_ORDER.indexOf(state.rank) >= RANK_ORDER.indexOf(rule.value);
    case "level":
      return state.level >= rule.value;
    case "streak":
      return state.longestStreak >= rule.days;
    case "totalQuestsCompleted":
      return state.totalQuestsCompleted >= rule.value;
    case "totalXp":
      return state.totalXp >= rule.value;
    case "stat":
      return state.stats[rule.stat] >= rule.value;
    case "statQuestsCompleted":
      return state.questsCompletedByStat[rule.stat] >= rule.value;
  }
}

/**
 * Pure, deterministic title-unlock evaluation — no I/O, no clock reads. Returns the ids of
 * titles in `titles` that are newly satisfied by `state`: not already unlocked, and whose
 * `unlockRule` parses and is met. Order of the input is preserved in the output; order among
 * `titles` has no bearing on which are satisfied (each is evaluated independently).
 */
export function evaluateTitleRules(
  state: TitleEvaluationState,
  titles: readonly TitleCatalogEntry[],
): string[] {
  const newlyEarned: string[] = [];
  for (const title of titles) {
    if (title.alreadyUnlocked) continue;
    const rule = parseTitleRule(title.unlockRule);
    if (rule && isRuleSatisfied(rule, state)) {
      newlyEarned.push(title.id);
    }
  }
  return newlyEarned;
}
