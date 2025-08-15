export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          username: string
          email: string | null
          email_verified: boolean
          avatar_url: string | null
          phone: string | null
          date_of_birth: string | null
          preferred_language: string
          timezone: string
          last_login_at: string | null
          status: string
          metadata: Json
          is_premium: boolean
          purchase_date: string | null
          monthly_game_count: number
          last_reset_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username?: string
          email?: string | null
          email_verified?: boolean
          avatar_url?: string | null
          phone?: string | null
          date_of_birth?: string | null
          preferred_language?: string
          timezone?: string
          last_login_at?: string | null
          status?: string
          metadata?: Json
          is_premium?: boolean
          purchase_date?: string | null
          monthly_game_count?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          email_verified?: boolean
          avatar_url?: string | null
          phone?: string | null
          date_of_birth?: string | null
          preferred_language?: string
          timezone?: string
          last_login_at?: string | null
          status?: string
          metadata?: Json
          is_premium?: boolean
          purchase_date?: string | null
          monthly_game_count?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          account_id: string
          date: string
          location: string | null
          game_type: string
          rules: Json
          memo: string | null
          duration_minutes: number | null
          game_end_condition: string
          final_riichi_sticks: number
          final_honba: number
          photo_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          date: string
          location?: string | null
          game_type: string
          rules?: Json
          memo?: string | null
          duration_minutes?: number | null
          game_end_condition?: string
          final_riichi_sticks?: number
          final_honba?: number
          photo_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          date?: string
          location?: string | null
          game_type?: string
          rules?: Json
          memo?: string | null
          duration_minutes?: number | null
          game_end_condition?: string
          final_riichi_sticks?: number
          final_honba?: number
          photo_path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      player_records: {
        Row: {
          id: string
          game_id: string
          player_name: string
          is_main_account: boolean
          final_score: number
          rank: number
          starting_position: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_name: string
          is_main_account?: boolean
          final_score: number
          rank: number
          starting_position: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_name?: string
          is_main_account?: boolean
          final_score?: number
          rank?: number
          starting_position?: string
          created_at?: string
          updated_at?: string
        }
      }
      round_records: {
        Row: {
          id: string
          game_id: string
          round: string
          honba: number
          riichi_sticks: number
          winner: number | null
          loser: number | null
          hand_type: string
          points: Json
          han: number | null
          fu: number | null
          yakuman: boolean
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          round: string
          honba?: number
          riichi_sticks?: number
          winner?: number | null
          loser?: number | null
          hand_type: string
          points?: Json
          han?: number | null
          fu?: number | null
          yakuman?: boolean
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          round?: string
          honba?: number
          riichi_sticks?: number
          winner?: number | null
          loser?: number | null
          hand_type?: string
          points?: Json
          han?: number | null
          fu?: number | null
          yakuman?: boolean
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          bio: string | null
          location: string | null
          website: string | null
          social_links: Json
          preferences: Json
          privacy_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          social_links?: Json
          preferences?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          social_links?: Json
          preferences?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_player_stats: {
        Args: {
          user_id: string
          period_start?: string
          period_end?: string
        }
        Returns: Json
      }
      get_chart_data: {
        Args: {
          user_id: string
          period_start?: string
          period_end?: string
        }
        Returns: Json
      }
      reset_monthly_game_count: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}