import type { Stat } from "@levelup/engine";
import { supabase, type MobileDatabase } from "./supabase";

export type CategoryRow = MobileDatabase["public"]["Tables"]["categories"]["Row"];

/** Fetches the signed-in user's own categories (RLS scopes this to their rows only). */
export async function listMyCategories(userId: string): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id, name, color, icon, stat, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface CreateCategoryInput {
  name: string;
  color: string;
  icon: string;
  stat: Stat;
}

/** Inserts a new category owned by the signed-in user (RLS's categories_insert_own policy
 * requires user_id = auth.uid(), so the caller's own id is always the one written). */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, ...input })
    .select("id, user_id, name, color, icon, stat, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create category.");
  }
  return data;
}
