import { apiFetch } from "./api";
import { signOut } from "./auth";
import { clearAllNotificationData } from "./notifications";

export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE";

/**
 * Permanently deletes the caller's account (POST /api/account/delete), then cleans up
 * everything local: scheduled notifications, the saved notification preferences, and the
 * signed-in session itself (which clears the chunked SecureStore entries it's stored under —
 * see lib/secureStorage.ts). Cleanup only runs once the server has actually confirmed
 * deletion; if the API call fails, nothing local is touched and the caller can retry.
 */
export async function deleteAccount(confirmation: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>("/api/account/delete", { body: { confirmation } });
  await clearAllNotificationData();
  await signOut();
}
