/**
 * Generated from the dev project's live schema:
 *
 *   npx supabase gen types typescript --project-id vxtxwqdsickveyjvgcyu > src/database.types.ts
 *
 * Do not hand-edit. Regenerate after any migration change (and keep this
 * comment — the command overwrites everything below it anyway).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activities: {
        Row: {
          archived: boolean;
          category_id: string;
          created_at: string;
          difficulty: string;
          id: string;
          metric_type: string;
          name: string;
          schedule: Json;
          target_value: Json;
          user_id: string;
        };
        Insert: {
          archived?: boolean;
          category_id: string;
          created_at?: string;
          difficulty: string;
          id?: string;
          metric_type: string;
          name: string;
          schedule: Json;
          target_value: Json;
          user_id: string;
        };
        Update: {
          archived?: boolean;
          category_id?: string;
          created_at?: string;
          difficulty?: string;
          id?: string;
          metric_type?: string;
          name?: string;
          schedule?: Json;
          target_value?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          icon: string;
          id: string;
          name: string;
          stat: string;
          user_id: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          icon: string;
          id?: string;
          name: string;
          stat: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          name?: string;
          stat?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          created_at: string;
          description: string | null;
          ends_at: string;
          id: string;
          name: string;
          reward_xp: number;
          starts_at: string;
          stat: string | null;
          target_value: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          ends_at: string;
          id?: string;
          name: string;
          reward_xp?: number;
          starts_at: string;
          stat?: string | null;
          target_value: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          ends_at?: string;
          id?: string;
          name?: string;
          reward_xp?: number;
          starts_at?: string;
          stat?: string | null;
          target_value?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          level: number;
          rank: string;
          timezone: string;
          title_id: string | null;
          username: string;
          xp: number;
        };
        Insert: {
          created_at?: string;
          id: string;
          level?: number;
          rank?: string;
          timezone?: string;
          title_id?: string | null;
          username: string;
          xp?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          level?: number;
          rank?: string;
          timezone?: string;
          title_id?: string | null;
          username?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
        ];
      };
      quests: {
        Row: {
          activity_id: string;
          completed_at: string | null;
          created_at: string;
          date: string;
          id: string;
          progress: number;
          result: Json | null;
          source: string | null;
          status: string;
          target: Json;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          completed_at?: string | null;
          created_at?: string;
          date: string;
          id?: string;
          progress?: number;
          result?: Json | null;
          source?: string | null;
          status?: string;
          target: Json;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          completed_at?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          progress?: number;
          result?: Json | null;
          source?: string | null;
          status?: string;
          target?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quests_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_hits: {
        Row: {
          created_at: string;
          endpoint: string;
          id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          id?: never;
          user_id: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_limit_hits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stats: {
        Row: {
          agi: number;
          focus: number;
          int: number;
          str: number;
          user_id: string;
          vit: number;
        };
        Insert: {
          agi?: number;
          focus?: number;
          int?: number;
          str?: number;
          user_id: string;
          vit?: number;
        };
        Update: {
          agi?: number;
          focus?: number;
          int?: number;
          str?: number;
          user_id?: string;
          vit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      streaks: {
        Row: {
          current: number;
          grace_days_used: number;
          last_completed_date: string | null;
          longest: number;
          user_id: string;
        };
        Insert: {
          current?: number;
          grace_days_used?: number;
          last_completed_date?: string | null;
          longest?: number;
          user_id: string;
        };
        Update: {
          current?: number;
          grace_days_used?: number;
          last_completed_date?: string | null;
          longest?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      titles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          unlock_rule: Json | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          unlock_rule?: Json | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          unlock_rule?: Json | null;
        };
        Relationships: [];
      };
      user_challenges: {
        Row: {
          challenge_id: string;
          completed_at: string | null;
          joined_at: string;
          progress: number;
          status: string;
          user_id: string;
        };
        Insert: {
          challenge_id: string;
          completed_at?: string | null;
          joined_at?: string;
          progress?: number;
          status?: string;
          user_id: string;
        };
        Update: {
          challenge_id?: string;
          completed_at?: string | null;
          joined_at?: string;
          progress?: number;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_challenges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_titles: {
        Row: {
          title_id: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          title_id: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          title_id?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_titles_title_id_fkey";
            columns: ["title_id"];
            isOneToOne: false;
            referencedRelation: "titles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_titles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      xp_events: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          quest_id: string | null;
          reason: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          quest_id?: string | null;
          reason: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          quest_id?: string | null;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "xp_events_quest_id_fkey";
            columns: ["quest_id"];
            isOneToOne: false;
            referencedRelation: "quests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string;
          p_max_requests: number;
          p_user_id: string;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      complete_quest: {
        Args: {
          p_leveled_up: boolean;
          p_levels_gained: number;
          p_new_level: number;
          p_new_rank: string;
          p_new_stat_value: number;
          p_new_streak_current: number;
          p_new_streak_grace_used: number;
          p_new_streak_last_date: string;
          p_new_streak_longest: number;
          p_new_xp: number;
          p_progress: number;
          p_quest_id: string;
          p_ranked_up: boolean;
          p_reason: string;
          p_source: string;
          p_stat: string;
          p_user_id: string;
          p_xp_awarded: number;
        };
        Returns: Json;
      };
      generate_daily_quests: {
        Args: { p_date: string; p_user_id: string };
        Returns: {
          activity_id: string;
          completed_at: string | null;
          created_at: string;
          date: string;
          id: string;
          progress: number;
          result: Json | null;
          source: string | null;
          status: string;
          target: Json;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "quests";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      is_valid_activity_target: { Args: { target: Json }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
