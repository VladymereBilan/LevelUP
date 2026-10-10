import { supabase } from "./supabase";
import { apiFetch } from "./api";

/** First login is detected by the player having zero categories yet — categories are
 * client-readable (RLS-scoped), so this is a direct query, no server route needed. */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) === 0;
}

export async function setUsername(username: string): Promise<void> {
  await apiFetch<{ username: string }>("/api/onboarding/username", { body: { username } });
}

export type StarterTemplateId = "tmpl-gym-starter" | "tmpl-student";

/** `templateId: null` means "start from scratch" — a valid, intentional no-op. */
export async function seedStarterTemplate(templateId: StarterTemplateId | null): Promise<void> {
  await apiFetch<{ seeded: boolean; templateId: string | null }>("/api/onboarding/seed", {
    body: { templateId },
  });
}
