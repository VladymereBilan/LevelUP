import type { Stat } from "@levelup/engine";
import { apiFetch } from "./api";

export type ChallengeStatus = "upcoming" | "active" | "completed" | "failed";

export interface ChallengeRow {
  id: string;
  name: string;
  description: string | null;
  stat: Stat | null;
  targetValue: number;
  rewardXp: number;
  startsAt: string;
  endsAt: string;
  progress: number;
  status: ChallengeStatus;
}

interface ListChallengesResponse {
  challenges: ChallengeRow[];
}

/** Progress is computed server-side, fresh on every call — see apps/web's
 * GET /api/challenges for the exact rule (there's no persisted/joined progress to read
 * yet; user_challenges is server-only to write and nothing writes it). */
export function listChallenges(): Promise<ListChallengesResponse> {
  return apiFetch<ListChallengesResponse>("/api/challenges", { method: "GET" });
}
