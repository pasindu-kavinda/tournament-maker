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
      tournaments: {
        Row: {
          id: string
          name: string
          status: 'pending' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
          created_by: string
          type: string
          structure: 'round-robin' | 'knockout' | 'groups'
        }
        Insert: {
          id?: string
          name?: string
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
          created_by: string
          type?: string
          structure?: 'round-robin' | 'knockout' | 'groups'
        }
        Update: {
          id?: string
          name?: string
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
          created_by?: string
          type?: string
          structure?: 'round-robin' | 'knockout' | 'groups'
        }
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          name: string
          members: string[]
          points: number
          wins: number
          matches_played: number
          lead_points: number
          group_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          members: string[]
          points?: number
          wins?: number
          matches_played?: number
          lead_points?: number
          group_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          members?: string[]
          points?: number
          wins?: number
          matches_played?: number
          lead_points?: number
          group_id?: string | null
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          team1_id: string
          team2_id: string
          team1_score: number | null
          team2_score: number | null
          winner_id: string | null
          match_number: number
          round: 'regular' | 'final'
          is_completed: boolean
          point_difference: number
          group_id: string | null
          next_match_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          team1_id: string
          team2_id: string
          team1_score?: number | null
          team2_score?: number | null
          winner_id?: string | null
          match_number: number
          round: 'regular' | 'final'
          is_completed?: boolean
          point_difference?: number
          group_id?: string | null
          next_match_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          team1_id?: string
          team2_id?: string
          team1_score?: number | null
          team2_score?: number | null
          winner_id?: string | null
          match_number?: number
          round?: 'regular' | 'final'
          group_id?: string | null
          next_match_id?: string | null
          is_completed?: boolean
          point_difference?: number
          created_at?: string
        }
      }
    }
  }
}