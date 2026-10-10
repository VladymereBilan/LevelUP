import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type { Rank } from "@levelup/engine";
import { chunkedSecureStorage } from "./secureStorage";

/**
 * A minimal local view of the `profiles`/`stats`/`streaks` rows — just the
 * columns this app actually reads. Deliberately NOT imported from
 * @levelup/db: that package's own README states it's never imported from
 * apps/mobile (it also carries server-only code gated on the service-role
 * key, which must never ship in this app's bundle). Must stay in sync with
 * packages/db/src/database.types.ts by hand — a read-only, types-only
 * package shared by all three (engine already plays this role for
 * game-rule types) would be a reasonable thing to extract if more tables
 * end up needed here.
 */
export interface MobileDatabase {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          level: number;
          xp: number;
          rank: Rank;
          title_id: string | null;
          timezone: string;
          created_at: string;
        };
      };
      stats: {
        Row: {
          user_id: string;
          str: number;
          agi: number;
          vit: number;
          int: number;
          focus: number;
        };
      };
      streaks: {
        Row: {
          user_id: string;
          current: number;
          longest: number;
          last_completed_date: string | null;
          grace_days_used: number;
        };
      };
    };
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in " +
      "apps/mobile/.env.local (gitignored) — see apps/mobile/README.md.",
  );
}

export const supabase = createClient<MobileDatabase>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chunkedSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No browser URL to parse on native — the OAuth callback is handled
    // explicitly via the deep link in lib/auth.ts instead.
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// supabase-js's autoRefreshToken relies on a running timer; RN doesn't
// pause that automatically the way a browser tab does when backgrounded.
// Stopping/starting it with app foreground state avoids refreshing (and
// draining battery) while the app isn't in use, and resumes immediately
// when it's reopened — the standard pattern for Supabase on React Native.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
