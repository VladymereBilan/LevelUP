import type { ActivityTarget, Difficulty, MetricType, Schedule } from "@levelup/engine";
import { supabase, type MobileDatabase } from "./supabase";

export type ActivityRow = MobileDatabase["public"]["Tables"]["activities"]["Row"];

const ACTIVITY_COLUMNS =
  "id, category_id, user_id, name, metric_type, target_value, schedule, difficulty, archived, created_at";

/** Fetches the signed-in user's own activities (RLS scopes this to their rows only). */
export async function listMyActivities(
  userId: string,
  options: { archived?: boolean } = {},
): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activities")
    .select(ACTIVITY_COLUMNS)
    .eq("user_id", userId)
    .eq("archived", options.archived ?? false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Fetches a single activity by id (RLS still scopes this to rows the signed-in user owns —
 * a stranger's id just resolves to no row, not an error). */
export async function getActivity(activityId: string): Promise<ActivityRow | null> {
  const { data, error } = await supabase
    .from("activities")
    .select(ACTIVITY_COLUMNS)
    .eq("id", activityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export interface CreateActivityInput {
  categoryId: string;
  name: string;
  metricType: MetricType;
  target: ActivityTarget;
  schedule: Schedule;
  difficulty: Difficulty;
}

/** Inserts a new activity owned by the signed-in user (RLS's activities_insert_own policy
 * requires user_id = auth.uid()). The DB independently re-validates the target against the
 * same safe ceilings as @levelup/engine's isSafeActivityTarget (is_valid_activity_target) and
 * that category_id's owner matches user_id (check_activity_category_owner trigger). */
export async function createActivity(
  userId: string,
  input: CreateActivityInput,
): Promise<ActivityRow> {
  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: userId,
      category_id: input.categoryId,
      name: input.name,
      metric_type: input.metricType,
      target_value: input.target,
      schedule: input.schedule,
      difficulty: input.difficulty,
    })
    .select(ACTIVITY_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create activity.");
  }
  return data;
}

export interface UpdateActivityInput {
  categoryId?: string;
  name?: string;
  metricType?: MetricType;
  target?: ActivityTarget;
  schedule?: Schedule;
  difficulty?: Difficulty;
}

export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput,
): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .update({
      ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.metricType !== undefined ? { metric_type: input.metricType } : {}),
      ...(input.target !== undefined ? { target_value: input.target } : {}),
      ...(input.schedule !== undefined ? { schedule: input.schedule } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
    })
    .eq("id", activityId);

  if (error) throw new Error(error.message);
}

export async function setActivityArchived(activityId: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from("activities").update({ archived }).eq("id", activityId);
  if (error) throw new Error(error.message);
}
