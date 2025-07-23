export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          city: string;
          state: string;
          created_at: string;
          address: string | null;
          zip: string | null;
          phone: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          city: string;
          state: string;
          created_at?: string;
          address?: string | null;
          zip?: string | null;
          phone?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string;
          state?: string;
          created_at?: string;
          address?: string | null;
          zip?: string | null;
          phone?: string | null;
        };
      };
      locations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          building_name: string | null;
          address: string;
          city: string;
          state: string;
          zip: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          building_name?: string | null;
          address: string;
          city: string;
          state: string;
          zip: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          building_name?: string | null;
          address?: string;
          city?: string;
          state?: string;
          zip?: string;
          created_at?: string;
        };
      };
      units: {
        Row: {
          id: string;
          location_id: string;
          unit_number: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          unit_number: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          unit_number?: string;
          status?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          username: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          role: string;
          status: string;
          services: string[];
          office_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          username: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          role?: string;
          status?: string;
          services?: string[];
          office_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          username?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          role?: string;
          status?: string;
          services?: string[];
          office_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_lines: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      job_types: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          service_line_id: string;
          is_active: boolean;
          created_at: string;
          service_lines?: {
            name: string;
          };
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          service_line_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          service_line_id?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_part_prices: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          service_line: string;
          unit_cost: number;
          parts_cost: number;
          estimated_hours: number;
          complexity_multiplier: number;
          adjusted_labor_cost: number;
          truck_fee: number;
          roof_access_fee: number;
          total_base_cost: number;
          flat_rate_non_contract: number;
          flat_rate_pm_contract: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          service_line: string;
          unit_cost?: number;
          parts_cost?: number;
          estimated_hours?: number;
          complexity_multiplier?: number;
          adjusted_labor_cost?: number;
          truck_fee?: number;
          roof_access_fee?: number;
          total_base_cost?: number;
          flat_rate_non_contract?: number;
          flat_rate_pm_contract?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          service_line?: string;
          unit_cost?: number;
          parts_cost?: number;
          estimated_hours?: number;
          complexity_multiplier?: number;
          adjusted_labor_cost?: number;
          truck_fee?: number;
          roof_access_fee?: number;
          total_base_cost?: number;
          flat_rate_non_contract?: number;
          flat_rate_pm_contract?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_labor_prices: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          service_line: string;
          unit_cost: number;
          skill_level: string | null;
          is_overtime: boolean | null;
          is_emergency: boolean | null;
          duration_hours: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          service_line: string;
          unit_cost: number;
          skill_level?: string | null;
          is_overtime?: boolean | null;
          is_emergency?: boolean | null;
          duration_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          service_line?: string;
          unit_cost?: number;
          skill_level?: string | null;
          is_overtime?: boolean | null;
          is_emergency?: boolean | null;
          duration_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_item_prices: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          service_line: string;
          unit_cost: number;
          category: string | null;
          is_taxable: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          service_line: string;
          unit_cost: number;
          category?: string | null;
          is_taxable?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          service_line?: string;
          unit_cost?: number;
          category?: string | null;
          is_taxable?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_items: {
        Row: {
          id: string;
          job_id: string;
          code: string;
          name: string;
          service_line: string;
          quantity: number;
          unit_cost: number;
          total_cost: number;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          code: string;
          name: string;
          service_line: string;
          quantity?: number;
          unit_cost: number;
          total_cost: number;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          code?: string;
          name?: string;
          service_line?: string;
          quantity?: number;
          unit_cost?: number;
          total_cost?: number;
          type?: string;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          number: string;
          name: string;
          status: string;
          type: string;
          owner_id: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          location_id: string | null;
          contract_id: string | null;
          contract_name: string | null;
          office: string | null;
          is_training: boolean | null;
          time_period_start: string;
          time_period_due: string;
          schedule_start: string | null;
          schedule_duration: string | null;
          created_at: string;
          updated_at: string;
          contact_email: string | null;
          contact_type: string | null;
          service_line: string | null;
          description: string | null;
          problem_description: string | null;
          customer_po: string | null;
          service_contract: string | null;
          schedule_date: string | null;
          schedule_time: string | null;
          unit_id: string | null;
          quote_sent: boolean | null;
          quote_sent_at: string | null;
          quote_token: string | null;
          quote_confirmed: boolean | null;
          quote_confirmed_at: string | null;
          repair_approved: boolean | null;
        };
        Insert: {
          id?: string;
          number?: string;
          name: string;
          status?: string;
          type: string;
          owner_id?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          location_id?: string | null;
          contract_id?: string | null;
          contract_name?: string | null;
          office?: string | null;
          is_training?: boolean | null;
          time_period_start: string;
          time_period_due: string;
          schedule_start?: string | null;
          schedule_duration?: string | null;
          created_at?: string;
          updated_at?: string;
          contact_email?: string | null;
          contact_type?: string | null;
          service_line?: string | null;
          description?: string | null;
          problem_description?: string | null;
          customer_po?: string | null;
          service_contract?: string | null;
          schedule_date?: string | null;
          schedule_time?: string | null;
          unit_id?: string | null;
          quote_sent?: boolean | null;
          quote_sent_at?: string | null;
          quote_token?: string | null;
          quote_confirmed?: boolean | null;
          quote_confirmed_at?: string | null;
          repair_approved?: boolean | null;
        };
        Update: {
          id?: string;
          number?: string;
          name?: string;
          status?: string;
          type?: string;
          owner_id?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          location_id?: string | null;
          contract_id?: string | null;
          contract_name?: string | null;
          office?: string | null;
          is_training?: boolean | null;
          time_period_start?: string;
          time_period_due?: string;
          schedule_start?: string | null;
          schedule_duration?: string | null;
          created_at?: string;
          updated_at?: string;
          contact_email?: string | null;
          contact_type?: string | null;
          service_line?: string | null;
          description?: string | null;
          problem_description?: string | null;
          customer_po?: string | null;
          service_contract?: string | null;
          schedule_date?: string | null;
          schedule_time?: string | null;
          unit_id?: string | null;
          quote_sent?: boolean | null;
          quote_sent_at?: string | null;
          quote_token?: string | null;
          quote_confirmed?: boolean | null;
          quote_confirmed_at?: string | null;
          repair_approved?: boolean | null;
        };
      };
      job_replacements: {
        Row: {
          id: string;
          job_id: string;
          needs_crane: boolean;
          phase1: Json;
          phase2: Json;
          phase3: Json;
          labor: number;
          refrigeration_recovery: number;
          start_up_costs: number;
          accessories: Json[];
          thermostat_startup: number;
          removal_cost: number;
          warranty: string | null;
          additional_items: Json[];
          permit_cost: number;
          created_at: string;
          updated_at: string;
          selected_phase: string | null;
          total_cost: number | null;
          inspection_id: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          needs_crane?: boolean;
          phase1?: Json;
          phase2?: Json;
          phase3?: Json;
          labor?: number;
          refrigeration_recovery?: number;
          start_up_costs?: number;
          accessories?: Json[];
          thermostat_startup?: number;
          removal_cost?: number;
          warranty?: string | null;
          additional_items?: Json[];
          permit_cost?: number;
          created_at?: string;
          updated_at?: string;
          selected_phase?: string | null;
          total_cost?: number | null;
          inspection_id?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          needs_crane?: boolean;
          phase1?: Json;
          phase2?: Json;
          phase3?: Json;
          labor?: number;
          refrigeration_recovery?: number;
          start_up_costs?: number;
          accessories?: Json[];
          thermostat_startup?: number;
          removal_cost?: number;
          warranty?: string | null;
          additional_items?: Json[];
          permit_cost?: number;
          created_at?: string;
          updated_at?: string;
          selected_phase?: string | null;
          total_cost?: number | null;
          inspection_id?: string | null;
        };
      };
      job_clock_events: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          event_type: string;
          event_time: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          event_type: string;
          event_time: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          user_id?: string;
          event_type?: string;
          event_time?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      job_comments: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      job_maintenance_checklists: {
        Row: {
          id: string;
          job_id: string;
          job_unit_id: string | null;
          task_description: string;
          completed: boolean;
          notes: string | null;
          reading_value: string | null;
          task_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          job_unit_id?: string | null;
          task_description: string;
          completed?: boolean;
          notes?: string | null;
          reading_value?: string | null;
          task_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          job_unit_id?: string | null;
          task_description?: string;
          completed?: boolean;
          notes?: string | null;
          reading_value?: string | null;
          task_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_invoices: {
        Row: {
          id: string;
          job_id: string;
          invoice_number: string;
          amount: number;
          status: string;
          issued_date: string | null;
          due_date: string | null;
          paid_date: string | null;
          created_at: string;
          payment_method: string | null;
          payment_reference: string | null;
          payment_notes: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          invoice_number: string;
          amount: number;
          status: string;
          issued_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          created_at?: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          payment_notes?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          invoice_number?: string;
          amount?: number;
          status?: string;
          issued_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          created_at?: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          payment_notes?: string | null;
        };
      };
      permits: {
        Row: {
          id: string;
          permit_number: string;
          mobile: string | null;
          city: string;
          county: string;
          file_path: string | null;
          file_name: string | null;
          file_size: number | null;
          file_type: string | null;
          created_at: string;
          updated_at: string;
          status: string;
          notes: string | null;
          location_id: string | null;
          company_id: string | null;
        };
        Insert: {
          id?: string;
          permit_number: string;
          mobile?: string | null;
          city: string;
          county: string;
          file_path?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
          notes?: string | null;
          location_id?: string | null;
          company_id?: string | null;
        };
        Update: {
          id?: string;
          permit_number?: string;
          mobile?: string | null;
          city?: string;
          county?: string;
          file_path?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
          notes?: string | null;
          location_id?: string | null;
          company_id?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
