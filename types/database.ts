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
          created_at: string
          is_premium: boolean
          purchase_date: string | null
          monthly_game_count: number
          last_reset_date: string
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
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          created_at?: string
          is_premium?: boolean
          purchase_date?: string | null
          monthly_game_count?: number
          last_reset_date?: string
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
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string
          is_premium?: boolean
          purchase_date?: string | null
          monthly_game_count?: number
          last_reset_date?: string
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
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          date: string
          location?: string | null
          game_type: string
          rules: Json
          memo?: string | null
          duration_minutes?: number | null
          game_end_condition?: string
          final_riichi_sticks?: number
          final_honba?: number
          created_at?: string
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
          created_at?: string
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
          points: Json
          han?: number | null
          fu?: number | null
          yakuman?: boolean
          memo?: string | null
          created_at?: string
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
        }
      }
      game_photos: {
        Row: {
          id: string
          game_id: string
          photo_uri: string
          description: string | null
          taken_at: string
        }
        Insert: {
          id?: string
          game_id: string
          photo_uri: string
          description?: string | null
          taken_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          photo_uri?: string
          description?: string | null
          taken_at?: string
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
      user_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: string[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          permissions?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          permissions?: string[]
          created_at?: string
        }
      }
      user_role_assignments: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_by: string | null
          assigned_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          assigned_by?: string | null
          assigned_at?: string
          expires_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_permissions: {
        Args: {
          user_id: string
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}