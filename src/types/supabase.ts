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
      companies: {
        Row: {
          id: string
          name: string
          city: string
          state: string
          status: string
          created_at: string
          address: string | null
          zip: string | null
          phone: string | null
        }
        Insert: {
          id?: string
          name: string
          city: string
          state: string
          status?: string
          created_at?: string
          address?: string | null
          zip?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          name?: string
          city?: string
          state?: string
          status?: string
          created_at?: string
          address?: string | null
          zip?: string | null
          phone?: string | null
        }
      }
      locations: {
        Row: {
          id: string
          company_id: string
          name: string
          building_name: string | null
          address: string
          city: string
          state: string
          zip: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          building_name?: string | null
          address: string
          city: string
          state: string
          zip: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          building_name?: string | null
          address?: string
          city?: string
          state?: string
          zip?: string
          status?: string
          created_at?: string
        }
      }
      units: {
        Row: {
          id: string
          location_id: string
          unit_number: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          location_id: string
          unit_number: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          unit_number?: string
          status?: string
          created_at?: string
        }
      }
      configuration: {
        Row: {
          id: string
          key: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
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