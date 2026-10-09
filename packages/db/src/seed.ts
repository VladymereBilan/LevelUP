import { STARTER_TEMPLATES } from "@levelup/engine";
import { createServiceRoleClient } from "./client";
import type { Json } from "./database.types";

// @levelup/engine's ActivityTarget/Schedule are plain JSON-serializable
// object literals, but as named interfaces (not index-signature types) they
// aren't structurally assignable to Json. This cast documents that gap
// without reaching for `any`.
function toJson(value: unknown): Json {
  return value as Json;
}

/**
 * Copies a starter template's categories and activities into a specific
 * user's own rows. Templates are in-code data (@levelup/engine's
 * STARTER_TEMPLATES) — there's no ownerless "template" row in the database,
 * since every categories/activities row has a required user_id (that's what
 * lets RLS scope them to their owner). Adopting a template means inserting
 * a copy, not referencing a shared one.
 */
export async function seedStarterTemplate(userId: string, templateId: string): Promise<void> {
  const template = STARTER_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    const known = STARTER_TEMPLATES.map((t) => t.id).join(", ");
    throw new Error(`Unknown starter template "${templateId}". Known templates: ${known}`);
  }

  const supabase = createServiceRoleClient();

  // Template category ids are static (shared across every user who adopts
  // this template); the categories this creates get their own fresh ids.
  // This map lets activities below point at the right new id.
  const categoryIdByTemplateId = new Map<string, string>();

  for (const category of template.categories) {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: category.name,
        color: category.color,
        icon: category.icon,
        stat: category.stat,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to seed category "${category.name}": ${error?.message}`);
    }
    categoryIdByTemplateId.set(category.id, data.id);
  }

  for (const activity of template.activities) {
    const categoryId = categoryIdByTemplateId.get(activity.categoryId);
    if (!categoryId) {
      throw new Error(
        `Activity "${activity.name}" references unknown category "${activity.categoryId}"`,
      );
    }

    const { error } = await supabase.from("activities").insert({
      category_id: categoryId,
      user_id: userId,
      name: activity.name,
      metric_type: activity.metricType,
      target_value: toJson(activity.target),
      schedule: toJson(activity.schedule),
      difficulty: activity.difficulty,
    });

    if (error) {
      throw new Error(`Failed to seed activity "${activity.name}": ${error.message}`);
    }
  }
}
