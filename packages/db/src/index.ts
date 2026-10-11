export type { Database, Json } from "./database.types";
export { createServiceRoleClient } from "./client";
export { seedStarterTemplate } from "./seed";
export {
  computeNewlyUnlockedTitles,
  getQuestStatBreakdown,
  type QuestStatBreakdown,
  type TitleUnlockSnapshot,
  type UnlockedTitle,
} from "./titleAwarding";
export { backfillTitlesForUser, type BackfillResult } from "./backfillTitles";
