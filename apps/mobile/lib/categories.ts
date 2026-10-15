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

export interface UpdateCategoryInput {
  name: string;
  color: string;
  icon: string;
  stat: Stat;
}

/**
 * Renames or restyles a category. RLS's categories_update_own policy scopes this to the
 * caller's own rows, so no ownership check is needed here.
 *
 * Changing `stat` only moves where future completions are credited. Stats already earned live
 * on the `stats` row and in the `xp_events` ledger, and nothing reassigns them.
 */
export async function updateCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<void> {
  const { error } = await supabase.from("categories").update(input).eq("id", categoryId);
  if (error) throw new Error(error.message);
}

/** A name already taken by one of this user's *other* categories, if any. Compared trimmed
 * and case-insensitively, matching the guard on the create form. */
export function conflictingCategoryName(
  categories: CategoryRow[],
  categoryId: string,
  name: string,
): CategoryRow | undefined {
  const wanted = name.trim().toLowerCase();
  return categories.find(
    (category) => category.id !== categoryId && category.name.trim().toLowerCase() === wanted,
  );
}
