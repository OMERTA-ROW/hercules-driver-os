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
      ai_billing_customers: {
        Row: {
          created_at: string
          customer_id: string
          provider: string
          subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          provider?: string
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          provider?: string
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_checkout_intents: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          item_id: string
          kind: string
          price_id: string | null
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          item_id: string
          kind: string
          price_id?: string | null
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          item_id?: string
          kind?: string
          price_id?: string | null
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_ledger: {
        Row: {
          created_at: string
          id: string
          kind: string
          monthly_delta: number
          purchased_delta: number
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          monthly_delta?: number
          purchased_delta?: number
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          monthly_delta?: number
          purchased_delta?: number
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_reservations: {
        Row: {
          action: string
          amount: number
          created_at: string
          id: string
          idem_key: string | null
          monthly_amount: number
          period_expires_at: string | null
          purchased_amount: number
          settled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string
          id?: string
          idem_key?: string | null
          monthly_amount?: number
          period_expires_at?: string | null
          purchased_amount?: number
          settled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string
          id?: string
          idem_key?: string | null
          monthly_amount?: number
          period_expires_at?: string | null
          purchased_amount?: number
          settled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_wallets: {
        Row: {
          ai_plan_id: string | null
          ai_plan_renews_at: string | null
          created_at: string
          monthly_balance: number
          monthly_expires_at: string | null
          paid_through_at: string | null
          pending_purchased_balance: number
          purchased_balance: number
          quality_pref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_plan_id?: string | null
          ai_plan_renews_at?: string | null
          created_at?: string
          monthly_balance?: number
          monthly_expires_at?: string | null
          paid_through_at?: string | null
          pending_purchased_balance?: number
          purchased_balance?: number
          quality_pref?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_plan_id?: string | null
          ai_plan_renews_at?: string | null
          created_at?: string
          monthly_balance?: number
          monthly_expires_at?: string | null
          paid_through_at?: string | null
          pending_purchased_balance?: number
          purchased_balance?: number
          quality_pref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_exec_claims: {
        Row: {
          action: string
          attempts: number
          charged: number
          created_at: string
          idem_key: string
          last_error: string | null
          lease_expires_at: string
          reservation_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          attempts?: number
          charged?: number
          created_at?: string
          idem_key: string
          last_error?: string | null
          lease_expires_at?: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          attempts?: number
          charged?: number
          created_at?: string
          idem_key?: string
          last_error?: string | null
          lease_expires_at?: string
          reservation_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_pending_reversals: {
        Row: {
          created_at: string
          id: string
          payment_ref: string
          provider: string
          reason: string | null
          refunded_cents: number
          resolved: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          payment_ref: string
          provider?: string
          reason?: string | null
          refunded_cents?: number
          resolved?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          payment_ref?: string
          provider?: string
          reason?: string | null
          refunded_cents?: number
          resolved?: boolean
        }
        Relationships: []
      }
      ai_plan_allowances: {
        Row: {
          daily_credits: number
          plan_id: string
          updated_at: string
          weekly_credits: number
        }
        Insert: {
          daily_credits: number
          plan_id: string
          updated_at?: string
          weekly_credits: number
        }
        Update: {
          daily_credits?: number
          plan_id?: string
          updated_at?: string
          weekly_credits?: number
        }
        Relationships: []
      }
      ai_purchases: {
        Row: {
          amount_paid_cents: number | null
          bucket: string
          charge_id: string | null
          created_at: string
          credits: number
          credits_owed: number
          credits_reversed: number
          currency: string | null
          id: string
          invoice_id: string | null
          item_id: string
          kind: string
          payment_intent_id: string | null
          payment_ref: string
          period_end: string | null
          period_start: string | null
          provider: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid_cents?: number | null
          bucket: string
          charge_id?: string | null
          created_at?: string
          credits: number
          credits_owed?: number
          credits_reversed?: number
          currency?: string | null
          id?: string
          invoice_id?: string | null
          item_id: string
          kind: string
          payment_intent_id?: string | null
          payment_ref: string
          period_end?: string | null
          period_start?: string | null
          provider?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid_cents?: number | null
          bucket?: string
          charge_id?: string | null
          created_at?: string
          credits?: number
          credits_owed?: number
          credits_reversed?: number
          currency?: string | null
          id?: string
          invoice_id?: string | null
          item_id?: string
          kind?: string
          payment_intent_id?: string | null
          payment_ref?: string
          period_end?: string | null
          period_start?: string | null
          provider?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          action: string
          cost_basis: string
          created_at: string
          credits_charged: number
          credits_saved: number
          id: string
          model: string | null
          provider_cost_usd: number | null
          served_from_cache: boolean
          user_id: string
        }
        Insert: {
          action: string
          cost_basis?: string
          created_at?: string
          credits_charged?: number
          credits_saved?: number
          id?: string
          model?: string | null
          provider_cost_usd?: number | null
          served_from_cache?: boolean
          user_id: string
        }
        Update: {
          action?: string
          cost_basis?: string
          created_at?: string
          credits_charged?: number
          credits_saved?: number
          id?: string
          model?: string | null
          provider_cost_usd?: number | null
          served_from_cache?: boolean
          user_id?: string
        }
        Relationships: []
      }
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
      billing_events: {
        Row: {
          attempts: number
          event_id: string
          event_type: string
          id: string
          last_error: string | null
          lease_expires_at: string | null
          payload: Json | null
          processed_at: string | null
          provider: string
          received_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider: string
          received_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          code: string
          created_at: string
          created_by: string
          dot_number: string | null
          home_base: string | null
          id: string
          load_board_connected: boolean
          load_board_provider: string | null
          mc_number: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          dot_number?: string | null
          home_base?: string | null
          id?: string
          load_board_connected?: boolean
          load_board_provider?: string | null
          mc_number?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          dot_number?: string | null
          home_base?: string | null
          id?: string
          load_board_connected?: boolean
          load_board_provider?: string | null
          mc_number?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          max_uses: number
          requires_approval: boolean
          revoked: boolean
          role: string
          used_count: number
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at: string
          id?: string
          max_uses?: number
          requires_approval?: boolean
          revoked?: boolean
          role: string
          used_count?: number
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          requires_approval?: boolean
          revoked?: boolean
          role?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invite_id: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invite_id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invite_id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      enterprise_inquiries: {
        Row: {
          company: string
          contact_name: string
          created_at: string
          email: string
          expected_usage: string
          fleet_size: number
          id: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          contact_name: string
          created_at?: string
          email: string
          expected_usage: string
          fleet_size: number
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          contact_name?: string
          created_at?: string
          email?: string
          expected_usage?: string
          fleet_size?: number
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          stripe_customer_id: string | null
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
          stripe_customer_id?: string | null
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
          stripe_customer_id?: string | null
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
      ai_allowance_status: { Args: { _user: string }; Returns: Json }
      ai_billing_claim_event: {
        Args: {
          _event_id: string
          _payload: Json
          _provider: string
          _type: string
        }
        Returns: string
      }
      ai_billing_finish_event: {
        Args: {
          _error: string
          _event_id: string
          _ok: boolean
          _provider: string
        }
        Returns: undefined
      }
      ai_billing_fulfill:
        | {
            Args: {
              _amount_cents?: number
              _bucket: string
              _credits: number
              _currency?: string
              _invoice?: string
              _item_id: string
              _kind: string
              _payment_ref: string
              _period_end?: string
              _period_start?: string
              _subscription?: string
              _user: string
            }
            Returns: string
          }
        | {
            Args: {
              _amount_cents?: number
              _bucket: string
              _charge?: string
              _credits: number
              _currency?: string
              _invoice?: string
              _item_id: string
              _kind: string
              _payment_intent?: string
              _payment_ref: string
              _period_end?: string
              _period_start?: string
              _subscription?: string
              _user: string
            }
            Returns: string
          }
      ai_billing_link_customer: {
        Args: {
          _customer: string
          _status?: string
          _subscription?: string
          _user: string
        }
        Returns: boolean
      }
      ai_billing_map_payment: {
        Args: { _charge: string; _payment_intent: string; _payment_ref: string }
        Returns: boolean
      }
      ai_billing_owner_of_customer: {
        Args: { _customer: string }
        Returns: string
      }
      ai_billing_reverse: {
        Args: { _payment_ref: string; _reason: string; _refunded_cents: number }
        Returns: string
      }
      ai_billing_stop_monthly: {
        Args: {
          _period_end: string
          _reason: string
          _ref: string
          _user: string
        }
        Returns: string
      }
      ai_checkout_attach: {
        Args: { _intent: string; _session: string }
        Returns: boolean
      }
      ai_checkout_begin: {
        Args: {
          _item_id: string
          _kind: string
          _price_id: string
          _user: string
        }
        Returns: Json
      }
      ai_checkout_settle: {
        Args: { _session: string; _status: string; _user: string }
        Returns: boolean
      }
      ai_credits_commit: {
        Args: {
          _cached?: boolean
          _charge: number
          _cost_basis?: string
          _model?: string
          _provider_cost?: number
          _reservation: string
          _saved?: number
          _user: string
        }
        Returns: number
      }
      ai_credits_grant: {
        Args: {
          _amount: number
          _bucket: string
          _expires?: string
          _plan_id?: string
          _reason: string
          _ref: string
          _renews_at?: string
          _user: string
        }
        Returns: boolean
      }
      ai_credits_refund: {
        Args: { _reason: string; _reservation: string; _user: string }
        Returns: boolean
      }
      ai_credits_reserve: {
        Args: {
          _action: string
          _amount: number
          _idem?: string
          _user: string
        }
        Returns: {
          action: string
          amount: number
          created_at: string
          id: string
          idem_key: string | null
          monthly_amount: number
          period_expires_at: string | null
          purchased_amount: number
          settled_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_credits_revoke: {
        Args: {
          _amount: number
          _bucket: string
          _reason: string
          _ref: string
          _user: string
        }
        Returns: boolean
      }
      ai_credits_touch: {
        Args: { _user: string }
        Returns: {
          ai_plan_id: string | null
          ai_plan_renews_at: string | null
          created_at: string
          monthly_balance: number
          monthly_expires_at: string | null
          paid_through_at: string | null
          pending_purchased_balance: number
          purchased_balance: number
          quality_pref: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_exec_claim: {
        Args: {
          _action: string
          _amount: number
          _idem: string
          _lease_seconds?: number
          _user: string
        }
        Returns: Json
      }
      ai_exec_finish: {
        Args: {
          _charge?: number
          _cost_basis?: string
          _error?: string
          _idem: string
          _model?: string
          _ok: boolean
          _provider_cost?: number
          _user: string
        }
        Returns: Json
      }
      ai_gate_check: {
        Args: { _amount: number; _new_hold: boolean; _user: string }
        Returns: Json
      }
      ai_set_quality_pref: { Args: { _pref: string }; Returns: string }
      company_code_gen: { Args: { _len?: number }; Returns: string }
      company_create: {
        Args: {
          _dot?: string
          _home_base?: string
          _mc?: string
          _name: string
        }
        Returns: Json
      }
      company_invite_create: {
        Args: {
          _company: string
          _email?: string
          _expires_hours?: number
          _max_uses?: number
          _requires_approval?: boolean
          _role: string
        }
        Returns: Json
      }
      company_invite_revoke: { Args: { _invite: string }; Returns: Json }
      company_join: { Args: { _code: string }; Returns: Json }
      company_member_decide: {
        Args: { _approve: boolean; _member: string }
        Returns: Json
      }
      company_member_remove: { Args: { _member: string }; Returns: Json }
      company_my_memberships: { Args: never; Returns: Json }
      company_roster: { Args: { _company: string }; Returns: Json }
      load_book: { Args: { _load: string; _vehicle?: string }; Returns: Json }
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
