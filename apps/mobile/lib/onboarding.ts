import type { IconName } from "../components/Icon";
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

export interface StarterTemplateOption {
  id: StarterTemplateId;
  name: string;
  description: string;
  icon: IconName;
}

/** Shared by the onboarding screen and the Quests tab's zero-activities empty state, so the
 * same two templates are offered (and described identically) wherever a template picker
 * shows up. @levelup/engine's STARTER_TEMPLATES is the data; this just adds the icon/copy
 * this app's UI wants, decoupled from the engine's own template.description strings. */
export const STARTER_TEMPLATE_OPTIONS: readonly StarterTemplateOption[] = [
  {
    id: "tmpl-gym-starter",
    name: "Gym Starter",
    description: "Strength, cardio, and recovery quests.",
    icon: "dumbbell",
  },
  {
    id: "tmpl-student",
    name: "Student",
    description: "Study blocks and deep focus quests.",
    icon: "book",
  },
];

/** `templateId: null` means "start from scratch" — a valid, intentional no-op. */
export async function seedStarterTemplate(templateId: StarterTemplateId | null): Promise<void> {
  await apiFetch<{ seeded: boolean; templateId: string | null }>("/api/onboarding/seed", {
    body: { templateId },
  });
}
