/**
 * Hand-authored to match the shape `supabase gen types typescript` produces,
 * because generating it for real needs either a running local Supabase
 * (`supabase start`, which needs Docker — not available when this was
 * written) or a linked hosted project. Regenerate for real once you have
 * either, from packages/db:
 *
 *   npx supabase start
 *   npx supabase gen types typescript --local > src/database.types.ts
 *
 * or, against a linked hosted project:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/database.types.ts
 *
 * `Relationships` arrays are simplified to `[]` here (the real generator
 * fills these in with FK metadata used by supabase-js's nested-select
 * typing) — everything else follows the standard generated shape.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          level: number;
          xp: number;
          rank: string;
          title_id: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          level?: number;
          xp?: number;
          rank?: string;
          title_id?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          level?: number;
          xp?: number;
          rank?: string;
          title_id?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stats: {
        Row: { user_id: string; str: number; agi: number; vit: number; int: number; focus: number };
        Insert: {
          user_id: string;
          str?: number;
          agi?: number;
          vit?: number;
          int?: number;
          focus?: number;
        };
        Update: {
          user_id?: string;
          str?: number;
          agi?: number;
          vit?: number;
          int?: number;
          focus?: number;
        };
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
        Insert: {
          user_id: string;
          current?: number;
          longest?: number;
          last_completed_date?: string | null;
          grace_days_used?: number;
        };
        Update: {
          user_id?: string;
          current?: number;
          longest?: number;
          last_completed_date?: string | null;
          grace_days_used?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          stat: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          stat: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string;
          stat?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          category_id: string;
          user_id: string;
          name: string;
          metric_type: string;
          target_value: Json;
          schedule: Json;
          difficulty: string;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          user_id: string;
          name: string;
          metric_type: string;
          target_value: Json;
          schedule: Json;
          difficulty: string;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          user_id?: string;
          name?: string;
          metric_type?: string;
          target_value?: Json;
          schedule?: Json;
          difficulty?: string;
          archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      quests: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string;
          date: string;
          target: Json;
          progress: number;
          status: string;
          source: string | null;
          result: Json | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_id: string;
          date: string;
          target: Json;
          progress?: number;
          status?: string;
          source?: string | null;
          result?: Json | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_id?: string;
          date?: string;
          target?: Json;
          progress?: number;
          status?: string;
          source?: string | null;
          result?: Json | null;
          completed_at?: string | null;
          created_at?: string;
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
        Insert: {
          id?: string;
          user_id: string;
          quest_id?: string | null;
          amount: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quest_id?: string | null;
          amount?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      titles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          unlock_rule: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          unlock_rule?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          unlock_rule?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          stat: string | null;
          starts_at: string;
          ends_at: string;
          target_value: number;
          reward_xp: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          stat?: string | null;
          starts_at: string;
          ends_at: string;
          target_value: number;
          reward_xp?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          stat?: string | null;
          starts_at?: string;
          ends_at?: string;
          target_value?: number;
          reward_xp?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_titles: {
        Row: { user_id: string; title_id: string; unlocked_at: string };
        Insert: { user_id: string; title_id: string; unlocked_at?: string };
        Update: { user_id?: string; title_id?: string; unlocked_at?: string };
        Relationships: [];
      };
      user_challenges: {
        Row: {
          user_id: string;
          challenge_id: string;
          progress: number;
          status: string;
          joined_at: string;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          challenge_id: string;
          progress?: number;
          status?: string;
          joined_at?: string;
          completed_at?: string | null;
        };
        Update: {
          user_id?: string;
          challenge_id?: string;
          progress?: number;
          status?: string;
          joined_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      rate_limit_hits: {
        Row: { id: number; user_id: string; endpoint: string; created_at: string };
        Insert: { id?: number; user_id: string; endpoint: string; created_at?: string };
        Update: { id?: number; user_id?: string; endpoint?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_quest: {
        Args: {
          p_quest_id: string;
          p_user_id: string;
          p_progress: number;
          p_source: string;
          p_xp_awarded: number;
          p_reason: string;
          p_new_level: number;
          p_new_xp: number;
          p_new_rank: string;
          p_leveled_up: boolean;
          p_levels_gained: number;
          p_ranked_up: boolean;
          p_stat: string;
          p_new_stat_value: number;
          p_new_streak_current: number;
          p_new_streak_longest: number;
          p_new_streak_last_date: string;
          p_new_streak_grace_used: number;
        };
        Returns: Json;
      };
      generate_daily_quests: {
        Args: { p_user_id: string; p_date: string };
        Returns: Database["public"]["Tables"]["quests"]["Row"][];
      };
      check_rate_limit: {
        Args: {
          p_user_id: string;
          p_endpoint: string;
          p_max_requests: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
