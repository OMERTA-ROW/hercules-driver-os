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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_at: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          load_id: string | null
          owner_id: string
          severity: string
          title: string
          vehicle_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          load_id?: string | null
          owner_id: string
          severity?: string
          title: string
          vehicle_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          load_id?: string | null
          owner_id?: string
          severity?: string
          title?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          load_id: string | null
          load_reference: string | null
          owner_id: string
          page_count: number
          sent_to: string | null
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          load_id?: string | null
          load_reference?: string | null
          owner_id: string
          page_count?: number
          sent_to?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          load_id?: string | null
          load_reference?: string | null
          owner_id?: string
          page_count?: number
          sent_to?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          description: string | null
          entry_date: string
          gallons: number | null
          id: string
          load_id: string | null
          odometer: number | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          category: string
          created_at?: string
          description?: string | null
          entry_date?: string
          gallons?: number | null
          id?: string
          load_id?: string | null
          odometer?: number | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          gallons?: number | null
          id?: string
          load_id?: string | null
          odometer?: number | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      loads: {
        Row: {
          assigned_driver_id: string | null
          broker_name: string | null
          commodity: string | null
          company_code: string | null
          created_at: string
          deliver_at: string | null
          dest_city: string | null
          dest_lat: number | null
          dest_lng: number | null
          dest_state: string | null
          equipment_type: string | null
          id: string
          miles: number | null
          notes: string | null
          origin_city: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_state: string | null
          pickup_at: string | null
          posted_by: string | null
          rate_cents: number | null
          reference: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
          weight_lb: number | null
        }
        Insert: {
          assigned_driver_id?: string | null
          broker_name?: string | null
          commodity?: string | null
          company_code?: string | null
          created_at?: string
          deliver_at?: string | null
          dest_city?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          dest_state?: string | null
          equipment_type?: string | null
          id?: string
          miles?: number | null
          notes?: string | null
          origin_city?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_state?: string | null
          pickup_at?: string | null
          posted_by?: string | null
          rate_cents?: number | null
          reference?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          weight_lb?: number | null
        }
        Update: {
          assigned_driver_id?: string | null
          broker_name?: string | null
          commodity?: string | null
          company_code?: string | null
          created_at?: string
          deliver_at?: string | null
          dest_city?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          dest_state?: string | null
          equipment_type?: string | null
          id?: string
          miles?: number | null
          notes?: string | null
          origin_city?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_state?: string | null
          pickup_at?: string | null
          posted_by?: string | null
          rate_cents?: number | null
          reference?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          weight_lb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loads_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_kind: string
          cdl_number: string | null
          company_code: string | null
          company_name: string | null
          created_at: string
          email: string
          fleet_tier: number | null
          full_name: string
          home_base: string | null
          id: string
          plan: string | null
          seats: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          account_kind?: string
          cdl_number?: string | null
          company_code?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          fleet_tier?: number | null
          full_name?: string
          home_base?: string | null
          id: string
          plan?: string | null
          seats?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          account_kind?: string
          cdl_number?: string | null
          company_code?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          fleet_tier?: number | null
          full_name?: string
          home_base?: string | null
          id?: string
          plan?: string | null
          seats?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          drive_minutes: number | null
          driver_id: string
          end_odometer: number | null
          ended_at: string | null
          id: string
          load_id: string | null
          miles: number | null
          on_duty_minutes: number | null
          start_odometer: number | null
          started_at: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          drive_minutes?: number | null
          driver_id: string
          end_odometer?: number | null
          ended_at?: string | null
          id?: string
          load_id?: string | null
          miles?: number | null
          on_duty_minutes?: number | null
          start_odometer?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          drive_minutes?: number | null
          driver_id?: string
          end_odometer?: number | null
          ended_at?: string | null
          id?: string
          load_id?: string | null
          miles?: number | null
          on_duty_minutes?: number | null
          start_odometer?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_health_readings: {
        Row: {
          adapter_kind: string
          created_at: string
          fault_code: string | null
          id: string
          metric: string
          recorded_at: string
          severity: string | null
          unit: string | null
          value_num: number | null
          value_text: string | null
          vehicle_id: string
        }
        Insert: {
          adapter_kind?: string
          created_at?: string
          fault_code?: string | null
          id?: string
          metric: string
          recorded_at?: string
          severity?: string | null
          unit?: string | null
          value_num?: number | null
          value_text?: string | null
          vehicle_id: string
        }
        Update: {
          adapter_kind?: string
          created_at?: string
          fault_code?: string | null
          id?: string
          metric?: string
          recorded_at?: string
          severity?: string | null
          unit?: string | null
          value_num?: number | null
          value_text?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_health_readings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          adapter_kind: string | null
          axles: number | null
          company_code: string | null
          created_at: string
          equipment_type: string
          gross_weight_lb: number | null
          hazmat: boolean
          height_inches: number | null
          id: string
          label: string
          length_inches: number | null
          make: string | null
          model: string | null
          model_year: number | null
          owner_id: string
          unit_number: string | null
          updated_at: string
          vin: string | null
          vocation: string | null
          width_inches: number | null
        }
        Insert: {
          active?: boolean
          adapter_kind?: string | null
          axles?: number | null
          company_code?: string | null
          created_at?: string
          equipment_type?: string
          gross_weight_lb?: number | null
          hazmat?: boolean
          height_inches?: number | null
          id?: string
          label: string
          length_inches?: number | null
          make?: string | null
          model?: string | null
          model_year?: number | null
          owner_id: string
          unit_number?: string | null
          updated_at?: string
          vin?: string | null
          vocation?: string | null
          width_inches?: number | null
        }
        Update: {
          active?: boolean
          adapter_kind?: string | null
          axles?: number | null
          company_code?: string | null
          created_at?: string
          equipment_type?: string
          gross_weight_lb?: number | null
          hazmat?: boolean
          height_inches?: number | null
          id?: string
          label?: string
          length_inches?: number | null
          make?: string | null
          model?: string | null
          model_year?: number | null
          owner_id?: string
          unit_number?: string | null
          updated_at?: string
          vin?: string | null
          vocation?: string | null
          width_inches?: number | null
        }
        Relationships: []
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
