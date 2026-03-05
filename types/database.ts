export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          email_verified: boolean | null
          id: string
          is_premium: boolean | null
          last_login_at: string | null
          last_reset_date: string | null
          metadata: Json | null
          monthly_game_count: number | null
          phone: string | null
          preferred_language: string | null
          purchase_date: string | null
          rating_4p: number
          rating_3p: number
          status: string | null
          timezone: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          is_premium?: boolean | null
          last_login_at?: string | null
          last_reset_date?: string | null
          metadata?: Json | null
          monthly_game_count?: number | null
          phone?: string | null
          preferred_language?: string | null
          purchase_date?: string | null
          rating_4p?: number
          rating_3p?: number
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          is_premium?: boolean | null
          last_login_at?: string | null
          last_reset_date?: string | null
          metadata?: Json | null
          monthly_game_count?: number | null
          phone?: string | null
          preferred_language?: string | null
          purchase_date?: string | null
          rating_4p?: number
          rating_3p?: number
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          account_id: string
          chip_counts: Json | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          final_honba: number | null
          final_riichi_sticks: number | null
          game_end_condition: string | null
          game_type: string
          id: string
          location: string | null
          memo: string | null
          photo_path: string | null
          rules: Json
          updated_at: string | null
        }
        Insert: {
          account_id: string
          chip_counts?: Json | null
          created_at?: string | null
          date: string
          duration_minutes?: number | null
          final_honba?: number | null
          final_riichi_sticks?: number | null
          game_end_condition?: string | null
          game_type: string
          id?: string
          location?: string | null
          memo?: string | null
          photo_path?: string | null
          rules?: Json
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          chip_counts?: Json | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          final_honba?: number | null
          final_riichi_sticks?: number | null
          game_end_condition?: string | null
          game_type?: string
          id?: string
          location?: string | null
          memo?: string | null
          photo_path?: string | null
          rules?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      player_records: {
        Row: {
          account_id: string | null
          created_at: string | null
          final_score: number
          game_id: string
          id: string
          is_main_account: boolean | null
          player_name: string
          rank: number
          starting_position: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          final_score: number
          game_id: string
          id?: string
          is_main_account?: boolean | null
          player_name: string
          rank: number
          starting_position: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          final_score?: number
          game_id?: string
          id?: string
          is_main_account?: boolean | null
          player_name?: string
          rank?: number
          starting_position?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_records_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_history: {
        Row: {
          id: string
          account_id: string
          game_id: string
          player_count: number
          rating_before: number
          rating_after: number
          rating_change: number
          rank: number
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          game_id: string
          player_count: number
          rating_before: number
          rating_after: number
          rating_change: number
          rank: number
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          game_id?: string
          player_count?: number
          rating_before?: number
          rating_after?: number
          rating_change?: number
          rank?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      round_records: {
        Row: {
          created_at: string | null
          fu: number | null
          game_id: string
          han: number | null
          hand_type: string
          honba: number | null
          id: string
          loser: number | null
          memo: string | null
          points: Json
          riichi_sticks: number | null
          round: string
          updated_at: string | null
          winner: number | null
          yakuman: boolean | null
        }
        Insert: {
          created_at?: string | null
          fu?: number | null
          game_id: string
          han?: number | null
          hand_type: string
          honba?: number | null
          id?: string
          loser?: number | null
          memo?: string | null
          points?: Json
          riichi_sticks?: number | null
          round: string
          updated_at?: string | null
          winner?: number | null
          yakuman?: boolean | null
        }
        Update: {
          created_at?: string | null
          fu?: number | null
          game_id?: string
          han?: number | null
          hand_type?: string
          honba?: number | null
          id?: string
          loser?: number | null
          memo?: string | null
          points?: Json
          riichi_sticks?: number | null
          round?: string
          updated_at?: string | null
          winner?: number | null
          yakuman?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "round_records_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          location: string | null
          preferences: Json | null
          privacy_settings: Json | null
          social_links: Json | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          location?: string | null
          preferences?: Json | null
          privacy_settings?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          location?: string | null
          preferences?: Json | null
          privacy_settings?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: { Args: never; Returns: undefined }
      get_chart_data: {
        Args: {
          period_end?: string
          period_start?: string
          player_count?: number
          user_id: string
        }
        Returns: Json
      }
      get_player_stats: {
        Args: {
          period_end?: string
          period_start?: string
          player_count?: number
          user_id: string
        }
        Returns: Json
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      reset_monthly_game_count: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

