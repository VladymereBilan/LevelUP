import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type {
  ActivityTarget,
  Difficulty,
  MetricType,
  QuestSource,
  Rank,
  Schedule,
  Stat,
} from "@levelup/engine";
import { chunkedSecureStorage } from "./secureStorage";

/**
 * A minimal local view of the tables this app reads (and, for `quests`,
 * partially writes). Deliberately NOT imported from @levelup/db: that
 * package's own README states it's never imported from apps/mobile (it
 * also carries server-only code gated on the service-role key, which must
 * never ship in this app's bundle). Must stay in sync with
 * packages/db/src/database.types.ts by hand — a read-only, types-only
 * package shared by all three (engine already plays this role for
 * game-rule types) would be a reasonable thing to extract if more tables
 * end up needed here.
 *
 * Every table needs Row/Insert/Update/Relationships, and `public` needs
 * Tables/Views/Functions — postgrest-js's GenericTable/GenericSchema
 * constraints require all of them to resolve a `.select()`'s result type
 * at all; without them it silently resolves to `never` with no type error
 * at the query site itself (only wherever the result is later used), which
 * is exactly as unpleasant to debug as it sounds. `Insert`/`Update` are
 * never called for profiles/stats/streaks/xp_events/titles/user_titles
 * (all server-written — mobile only ever selects them), so those stay a
 * reasonable Partial<Row>. categories/activities ARE client-inserted
 * (lib/categories.ts, lib/activities.ts — RLS already grants owners full
 * CRUD on both), so their Insert/Update shapes are accurate rather than
 * Partial<Row>.
 */
export interface MobileDatabase {
  // Lets createClient<MobileDatabase>(...) resolve its full generic form
  // without also needing createClient<MobileDatabase, { PostgrestVersion }>
  // — mirrors packages/db/src/database.types.ts's generated shape.
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
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
        Insert: Partial<MobileDatabase["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<MobileDatabase["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
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
        Insert: Partial<MobileDatabase["public"]["Tables"]["stats"]["Row"]>;
        Update: Partial<MobileDatabase["public"]["Tables"]["stats"]["Row"]>;
        Relationships: [];
      };
      streaks: {
        Row: {
          user_id: string;
          current: number;
          longest: number;
          last_completed_date: string | null;
          grace_days_used: number;
        };
        Insert: Partial<MobileDatabase["public"]["Tables"]["streaks"]["Row"]>;
        Update: Partial<MobileDatabase["public"]["Tables"]["streaks"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          stat: Stat;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          color: string;
          icon: string;
          stat: Stat;
        };
        // Category edits aren't part of this app yet — only creation
        // (lib/categories.ts). Kept as a full partial so it's ready when
        // that's needed, rather than an empty type that'd need revisiting.
        Update: Partial<MobileDatabase["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          category_id: string;
          user_id: string;
          name: string;
          metric_type: MetricType;
          target_value: ActivityTarget;
          schedule: Schedule;
          difficulty: Difficulty;
          notes: string | null;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          category_id: string;
          user_id: string;
          name: string;
          metric_type: MetricType;
          target_value: ActivityTarget;
          schedule: Schedule;
          difficulty: Difficulty;
          notes?: string | null;
        };
        // Mirrors what lib/activities.ts's editing/archiving actually
        // updates — never id/user_id/created_at (and category ownership is
        // re-validated by the check_activity_category_owner trigger if
        // category_id does change).
        Update: Partial<{
          category_id: string;
          name: string;
          metric_type: MetricType;
          target_value: ActivityTarget;
          schedule: Schedule;
          difficulty: Difficulty;
          notes: string | null;
          archived: boolean;
        }>;
        Relationships: [];
      };
      quests: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string;
          date: string;
          target: ActivityTarget;
          progress: number;
          status: "pending" | "completed" | "skipped";
          source: QuestSource | null;
          result: unknown | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<MobileDatabase["public"]["Tables"]["quests"]["Row"]>;
        // Mirrors the DB's column-level grant: `authenticated` can only ever
        // write `progress` directly (see the RLS migration's comment on
        // `quests`) — status/result/xp side effects are server-only, via
        // POST /api/quests/[id]/complete.
        Update: {
          progress: number;
        };
        Relationships: [];
      };
      xp_events: {
        Row: {
          id: string;
          user_id: string;
          quest_id: string | null;
          amount: number;
          reason: string;
          created_at: string;
        };
        Insert: Partial<MobileDatabase["public"]["Tables"]["xp_events"]["Row"]>;
        Update: Partial<MobileDatabase["public"]["Tables"]["xp_events"]["Row"]>;
        Relationships: [];
      };
      titles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          unlock_rule: unknown | null;
          created_at: string;
        };
        Insert: Partial<MobileDatabase["public"]["Tables"]["titles"]["Row"]>;
        Update: Partial<MobileDatabase["public"]["Tables"]["titles"]["Row"]>;
        Relationships: [];
      };
      user_titles: {
        Row: {
          user_id: string;
          title_id: string;
          unlocked_at: string;
        };
        Insert: Partial<MobileDatabase["public"]["Tables"]["user_titles"]["Row"]>;
        Update: Partial<MobileDatabase["public"]["Tables"]["user_titles"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in " +
      "apps/mobile/.env.local (gitignored). See apps/mobile/README.md.",
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
