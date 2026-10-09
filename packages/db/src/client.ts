import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * A client authenticated as `service_role` — bypasses RLS entirely. Only
 * ever construct this in server-only code (Next.js route handlers, server
 * scripts). Never import this module from code that ships to the mobile app
 * or a browser bundle: that would ship the service-role key to the client.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "createServiceRoleClient requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.",
    );
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
