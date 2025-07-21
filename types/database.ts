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
        }
        Insert: {
          id?: string
          username: string
          created_at?: string
          is_premium?: boolean
          purchase_date?: string | null
          monthly_game_count?: number
          last_reset_date?: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string
          is_premium?: boolean
          purchase_date?: string | null
          monthly_game_count?: number
          last_reset_date?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}