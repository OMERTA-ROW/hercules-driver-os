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
    PostgrestVersion: "14.17"
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
      broker_delivery_outbox: {
        Row: {
          approved_at: string
          approved_by: string
          attempts: number
          carrier_id: string
          company_id: string
          created_at: string
          draft_id: string
          id: string
          last_error: string | null
          locked_until: string | null
          next_attempt_at: string
          packet: Json
          provider_message_id: string | null
          recipient_email: string
          status: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          attempts?: number
          carrier_id: string
          company_id: string
          created_at?: string
          draft_id: string
          id?: string
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          packet: Json
          provider_message_id?: string | null
          recipient_email: string
          status?: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          attempts?: number
          carrier_id?: string
          company_id?: string
          created_at?: string
          draft_id?: string
          id?: string
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          packet?: Json
          provider_message_id?: string | null
          recipient_email?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_delivery_outbox_company_id_carrier_id_fkey"
            columns: ["company_id", "carrier_id"]
            isOneToOne: false
            referencedRelation: "freight_carriers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "broker_delivery_outbox_company_id_draft_id_fkey"
            columns: ["company_id", "draft_id"]
            isOneToOne: false
            referencedRelation: "broker_intake_drafts"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      broker_inbox_events: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          external_id: string
          id: string
          last_error: string | null
          locked_until: string | null
          next_attempt_at: string
          payload: Json
          provider: string
          status: string
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          external_id: string
          id?: string
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          payload?: Json
          provider: string
          status?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          external_id?: string
          id?: string
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          payload?: Json
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_inbox_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_intake_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string
          destination: string
          email_subject: string
          event_id: string | null
          id: string
          notes: string
          origin: string
          reference: string
          selected_carrier_id: string | null
          status: string
          urgent: boolean
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          company_id: string
          created_at?: string
          created_by: string
          destination?: string
          email_subject?: string
          event_id?: string | null
          id?: string
          notes?: string
          origin?: string
          reference: string
          selected_carrier_id?: string | null
          status?: string
          urgent?: boolean
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          destination?: string
          email_subject?: string
          event_id?: string | null
          id?: string
          notes?: string
          origin?: string
          reference?: string
          selected_carrier_id?: string | null
          status?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "broker_intake_drafts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_intake_drafts_company_id_selected_carrier_id_fkey"
            columns: ["company_id", "selected_carrier_id"]
            isOneToOne: false
            referencedRelation: "freight_carriers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "broker_intake_drafts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "broker_inbox_events"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_review_history: {
        Row: {
          action: string
          actor_id: string
          company_id: string
          created_at: string
          detail: Json
          draft_id: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          company_id: string
          created_at?: string
          detail?: Json
          draft_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          company_id?: string
          created_at?: string
          detail?: Json
          draft_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_review_history_company_id_draft_id_fkey"
            columns: ["company_id", "draft_id"]
            isOneToOne: false
            referencedRelation: "broker_intake_drafts"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      companies: {
        Row: {
          business_type: string
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
          business_type?: string
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
          business_type?: string
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
          bol_data: Json | null
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
          bol_data?: Json | null
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
          bol_data?: Json | null
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
      freight_approvals: {
        Row: {
          action: string
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          error: string | null
          executed_at: string | null
          id: string
          load_id: string | null
          payload: Json
          payload_hash: string
          reason: string | null
          requested_by: string
          status: string
          target_version: number | null
          why: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          load_id?: string | null
          payload: Json
          payload_hash: string
          reason?: string | null
          requested_by: string
          status?: string
          target_version?: number | null
          why?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          load_id?: string | null
          payload?: Json
          payload_hash?: string
          reason?: string | null
          requested_by?: string
          status?: string
          target_version?: number | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_approvals_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_audit_log: {
        Row: {
          action: string
          actor: string | null
          company_id: string
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          company_id: string
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor?: string | null
          company_id?: string
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "freight_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_automation_rules: {
        Row: {
          approval_required: boolean
          company_id: string
          conditions: Json
          created_at: string
          enabled: boolean
          id: string
          kind: string
          name: string
          owner_id: string
        }
        Insert: {
          approval_required?: boolean
          company_id: string
          conditions?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind: string
          name: string
          owner_id: string
        }
        Update: {
          approval_required?: boolean
          company_id?: string
          conditions?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_automation_runs: {
        Row: {
          company_id: string
          created_at: string
          dedupe_key: string
          error: string | null
          id: string
          load_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string | null
          status: string
          title: string
          why: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dedupe_key: string
          error?: string | null
          id?: string
          load_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          status?: string
          title: string
          why: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dedupe_key?: string
          error?: string | null
          id?: string
          load_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          status?: string
          title?: string
          why?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_automation_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "freight_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_carriers: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          dot_number: string | null
          id: string
          insurance_expires: string | null
          mc_number: string | null
          name: string
          notes: string | null
          recipient_verified_at: string | null
          recipient_verified_email: string | null
          verification_status: string
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dot_number?: string | null
          id?: string
          insurance_expires?: string | null
          mc_number?: string | null
          name: string
          notes?: string | null
          recipient_verified_at?: string | null
          recipient_verified_email?: string | null
          verification_status?: string
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dot_number?: string | null
          id?: string
          insurance_expires?: string | null
          mc_number?: string | null
          name?: string
          notes?: string | null
          recipient_verified_at?: string | null
          recipient_verified_email?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_carriers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_conversations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          driver_user_id: string | null
          id: string
          load_id: string | null
          shipper_visible: boolean
          subject: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string
          driver_user_id?: string | null
          id?: string
          load_id?: string | null
          shipper_visible?: boolean
          subject: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          driver_user_id?: string | null
          id?: string
          load_id?: string | null
          shipper_visible?: boolean
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_conversations_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_customers: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          kind: string
          linked_company_id: string | null
          name: string
          notes: string | null
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          kind?: string
          linked_company_id?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          kind?: string
          linked_company_id?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_customers_linked_company_id_fkey"
            columns: ["linked_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_document_reviews: {
        Row: {
          company_id: string
          created_at: string
          decision: string
          document_id: string
          id: string
          note: string | null
          reviewer: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decision: string
          document_id: string
          id?: string
          note?: string | null
          reviewer: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decision?: string
          document_id?: string
          id?: string
          note?: string | null
          reviewer?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_document_reviews_company_id_document_id_fkey"
            columns: ["company_id", "document_id"]
            isOneToOne: false
            referencedRelation: "freight_documents"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_documents: {
        Row: {
          company_id: string
          created_at: string
          driver_user_id: string | null
          equipment_id: string | null
          expires_on: string | null
          file_name: string
          id: string
          kind: string
          load_id: string | null
          mime_type: string
          size_bytes: number
          status: string
          storage_path: string
          uploaded_by: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          driver_user_id?: string | null
          equipment_id?: string | null
          expires_on?: string | null
          file_name: string
          id?: string
          kind: string
          load_id?: string | null
          mime_type: string
          size_bytes: number
          status?: string
          storage_path: string
          uploaded_by: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          driver_user_id?: string | null
          equipment_id?: string | null
          expires_on?: string | null
          file_name?: string
          id?: string
          kind?: string
          load_id?: string | null
          mime_type?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "freight_documents_company_id_equipment_id_fkey"
            columns: ["company_id", "equipment_id"]
            isOneToOne: false
            referencedRelation: "freight_equipment"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_documents_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_driver_profiles: {
        Row: {
          available: boolean
          cdl_expires: string | null
          cdl_number: string | null
          cdl_state: string | null
          company_id: string
          display_name: string | null
          medical_expires: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean
          cdl_expires?: string | null
          cdl_number?: string | null
          cdl_state?: string | null
          company_id: string
          display_name?: string | null
          medical_expires?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: boolean
          cdl_expires?: string | null
          cdl_number?: string | null
          cdl_state?: string | null
          company_id?: string
          display_name?: string | null
          medical_expires?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_driver_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_equipment: {
        Row: {
          company_id: string
          created_at: string
          equipment_type: string | null
          id: string
          inspection_expires: string | null
          insurance_expires: string | null
          kind: string
          permit_expires: string | null
          plate: string | null
          registration_expires: string | null
          status: string
          unit_number: string
          vin: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          equipment_type?: string | null
          id?: string
          inspection_expires?: string | null
          insurance_expires?: string | null
          kind: string
          permit_expires?: string | null
          plate?: string | null
          registration_expires?: string | null
          status?: string
          unit_number: string
          vin?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          equipment_type?: string | null
          id?: string
          inspection_expires?: string | null
          insurance_expires?: string | null
          kind?: string
          permit_expires?: string | null
          plate?: string | null
          registration_expires?: string | null
          status?: string
          unit_number?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_exceptions: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          load_id: string
          raised_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          load_id: string
          raised_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          load_id?: string
          raised_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_exceptions_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_integration_logs: {
        Row: {
          company_id: string
          created_at: string
          detail: string | null
          event: string
          id: number
          provider: string
        }
        Insert: {
          company_id: string
          created_at?: string
          detail?: string | null
          event: string
          id?: number
          provider: string
        }
        Update: {
          company_id?: string
          created_at?: string
          detail?: string | null
          event?: string
          id?: number
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_integration_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_integrations: {
        Row: {
          category: string
          company_id: string
          id: string
          last_error: string | null
          provider: string
          status: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
        }
        Insert: {
          category: string
          company_id: string
          id?: string
          last_error?: string | null
          provider: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          id?: string
          last_error?: string | null
          provider?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_invites: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          revoked: boolean
          role: string
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          revoked?: boolean
          role: string
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          role?: string
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_invoices: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          created_by: string
          customer_id: string | null
          due_on: string | null
          id: string
          load_id: string | null
          number: string
          status: string
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          created_by: string
          customer_id?: string | null
          due_on?: string | null
          id?: string
          load_id?: string | null
          number: string
          status?: string
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          due_on?: string | null
          id?: string
          load_id?: string | null
          number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_invoices_company_id_customer_id_fkey"
            columns: ["company_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "freight_customers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_invoices_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_load_events: {
        Row: {
          actor: string | null
          company_id: string
          created_at: string
          from_value: string | null
          id: number
          kind: string
          load_id: string
          reason: string | null
          snapshot: Json | null
          to_value: string | null
          version: number
        }
        Insert: {
          actor?: string | null
          company_id: string
          created_at?: string
          from_value?: string | null
          id?: number
          kind: string
          load_id: string
          reason?: string | null
          snapshot?: Json | null
          to_value?: string | null
          version: number
        }
        Update: {
          actor?: string | null
          company_id?: string
          created_at?: string
          from_value?: string | null
          id?: number
          kind?: string
          load_id?: string
          reason?: string | null
          snapshot?: Json | null
          to_value?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "freight_load_events_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_load_financials: {
        Row: {
          carrier_pay_cents: number | null
          company_id: string
          customer_rate_cents: number | null
          driver_pay_cents: number | null
          load_id: string
          rate_confirmed: boolean
          updated_at: string
        }
        Insert: {
          carrier_pay_cents?: number | null
          company_id: string
          customer_rate_cents?: number | null
          driver_pay_cents?: number | null
          load_id: string
          rate_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          carrier_pay_cents?: number | null
          company_id?: string
          customer_rate_cents?: number | null
          driver_pay_cents?: number | null
          load_id?: string
          rate_confirmed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_load_financials_company_id_load_id_fkey"
            columns: ["company_id", "load_id"]
            isOneToOne: false
            referencedRelation: "freight_loads"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_loads: {
        Row: {
          commodity: string | null
          company_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          delivered_override_reason: string | null
          delivery_at: string | null
          destination: string | null
          driver_id: string | null
          driver_response: string | null
          driver_response_reason: string | null
          equipment_type: string | null
          id: string
          notes: string | null
          op_status: string | null
          origin: string | null
          pickup_at: string | null
          pod_document_id: string | null
          reference: string
          shipper_company_id: string | null
          status: string
          trailer_id: string | null
          truck_id: string | null
          updated_at: string
          version: number
          weight_lb: number | null
        }
        Insert: {
          commodity?: string | null
          company_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          delivered_override_reason?: string | null
          delivery_at?: string | null
          destination?: string | null
          driver_id?: string | null
          driver_response?: string | null
          driver_response_reason?: string | null
          equipment_type?: string | null
          id?: string
          notes?: string | null
          op_status?: string | null
          origin?: string | null
          pickup_at?: string | null
          pod_document_id?: string | null
          reference: string
          shipper_company_id?: string | null
          status?: string
          trailer_id?: string | null
          truck_id?: string | null
          updated_at?: string
          version?: number
          weight_lb?: number | null
        }
        Update: {
          commodity?: string | null
          company_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          delivered_override_reason?: string | null
          delivery_at?: string | null
          destination?: string | null
          driver_id?: string | null
          driver_response?: string | null
          driver_response_reason?: string | null
          equipment_type?: string | null
          id?: string
          notes?: string | null
          op_status?: string | null
          origin?: string | null
          pickup_at?: string | null
          pod_document_id?: string | null
          reference?: string
          shipper_company_id?: string | null
          status?: string
          trailer_id?: string | null
          truck_id?: string | null
          updated_at?: string
          version?: number
          weight_lb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_loads_company_id_customer_id_fkey"
            columns: ["company_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "freight_customers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_loads_company_id_driver_id_fkey"
            columns: ["company_id", "driver_id"]
            isOneToOne: false
            referencedRelation: "freight_driver_profiles"
            referencedColumns: ["company_id", "user_id"]
          },
          {
            foreignKeyName: "freight_loads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_loads_company_id_pod_document_id_fkey"
            columns: ["company_id", "pod_document_id"]
            isOneToOne: false
            referencedRelation: "freight_documents"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_loads_company_id_trailer_id_fkey"
            columns: ["company_id", "trailer_id"]
            isOneToOne: false
            referencedRelation: "freight_equipment"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_loads_company_id_truck_id_fkey"
            columns: ["company_id", "truck_id"]
            isOneToOne: false
            referencedRelation: "freight_equipment"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_loads_shipper_company_id_fkey"
            columns: ["shipper_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_maintenance: {
        Row: {
          company_id: string
          completed_at: string | null
          cost_cents: number | null
          created_at: string
          created_by: string | null
          description: string
          equipment_id: string
          id: string
          scheduled_for: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          equipment_id: string
          id?: string
          scheduled_for?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          cost_cents?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          equipment_id?: string
          id?: string
          scheduled_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_maintenance_company_id_equipment_id_fkey"
            columns: ["company_id", "equipment_id"]
            isOneToOne: false
            referencedRelation: "freight_equipment"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_member_roles: {
        Row: {
          company_id: string
          created_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_member_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_messages: {
        Row: {
          author: string
          body: string
          company_id: string
          conversation_id: string
          created_at: string
          id: string
        }
        Insert: {
          author?: string
          body: string
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author?: string
          body?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_messages_company_id_conversation_id_fkey"
            columns: ["company_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "freight_conversations"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_payment_records: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          method: string
          recorded_by: string
          reference: string | null
          settlement_id: string | null
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          method: string
          recorded_by: string
          reference?: string | null
          settlement_id?: string | null
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          recorded_by?: string
          reference?: string | null
          settlement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_payment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_payment_records_company_id_invoice_id_fkey"
            columns: ["company_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "freight_invoices"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_payment_records_company_id_settlement_id_fkey"
            columns: ["company_id", "settlement_id"]
            isOneToOne: false
            referencedRelation: "freight_settlements"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      freight_settlements: {
        Row: {
          amount_cents: number
          carrier_id: string | null
          company_id: string
          created_at: string
          created_by: string
          driver_user_id: string | null
          id: string
          period_end: string | null
          period_start: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          carrier_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          driver_user_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          carrier_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          driver_user_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_settlements_company_id_carrier_id_fkey"
            columns: ["company_id", "carrier_id"]
            isOneToOne: false
            referencedRelation: "freight_carriers"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "freight_settlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hercules_access_audit: {
        Row: {
          created_at: string
          detail: Json
          event: string
          id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          event: string
          id?: never
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          event?: string
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      hercules_active_role: {
        Row: {
          role: Database["public"]["Enums"]["hercules_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["hercules_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["hercules_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hercules_role_requests: {
        Row: {
          company_id: string
          id: string
          reason: string
          required_documents: string[]
          review_reason: string | null
          reviewer_id: string | null
          role: Database["public"]["Enums"]["hercules_role"]
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          reason: string
          required_documents?: string[]
          review_reason?: string | null
          reviewer_id?: string | null
          role: Database["public"]["Enums"]["hercules_role"]
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          reason?: string
          required_documents?: string[]
          review_reason?: string | null
          reviewer_id?: string | null
          role?: Database["public"]["Enums"]["hercules_role"]
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hercules_role_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hercules_user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["hercules_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["hercules_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["hercules_role"]
          user_id?: string
        }
        Relationships: []
      }
      hercules_verification_documents: {
        Row: {
          company_id: string
          created_at: string
          doc_type: string
          expires_on: string | null
          file_name: string
          id: string
          mime_type: string
          request_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_type: string
          expires_on?: string | null
          file_name: string
          id?: string
          mime_type: string
          request_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes: number
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_type?: string
          expires_on?: string | null
          file_name?: string
          id?: string
          mime_type?: string
          request_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hercules_verification_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hercules_verification_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hercules_role_requests"
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
          dimensions_confirmed: boolean
          equipment_type: string
          gross_weight_lb: number | null
          hazmat: boolean
          hazmat_class: string | null
          height_inches: number | null
          id: string
          label: string
          length_inches: number | null
          make: string | null
          model: string | null
          model_year: number | null
          owner_id: string
          trailer_type: string | null
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
          dimensions_confirmed?: boolean
          equipment_type?: string
          gross_weight_lb?: number | null
          hazmat?: boolean
          hazmat_class?: string | null
          height_inches?: number | null
          id?: string
          label: string
          length_inches?: number | null
          make?: string | null
          model?: string | null
          model_year?: number | null
          owner_id: string
          trailer_type?: string | null
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
          dimensions_confirmed?: boolean
          equipment_type?: string
          gross_weight_lb?: number | null
          hazmat?: boolean
          hazmat_class?: string | null
          height_inches?: number | null
          id?: string
          label?: string
          length_inches?: number | null
          make?: string | null
          model?: string | null
          model_year?: number | null
          owner_id?: string
          trailer_type?: string | null
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
      broker_can_review: { Args: { _company: string }; Returns: boolean }
      broker_intake_approve: {
        Args: {
          _carrier: string
          _confirmed: boolean
          _document: string
          _draft: string
        }
        Returns: string
      }
      broker_intake_create: {
        Args: {
          _category: string
          _company: string
          _destination: string
          _notes: string
          _origin: string
          _reference: string
          _subject: string
          _urgent: boolean
        }
        Returns: string
      }
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
      freight_approval_decide: {
        Args: { _approval: string; _approve: boolean; _note: string }
        Returns: Json
      }
      freight_approval_request: {
        Args: {
          _action: string
          _company: string
          _load: string
          _payload: Json
          _reason: string
          _why: string
        }
        Returns: Json
      }
      freight_automation_scan: { Args: { _company: string }; Returns: Json }
      freight_commercial_status: {
        Args: {
          _expected_version: number
          _load: string
          _reason: string
          _to: string
        }
        Returns: Json
      }
      freight_company_create: {
        Args: { _business_type: string; _name: string }
        Returns: Json
      }
      freight_doc_abort: { Args: { _doc: string }; Returns: Json }
      freight_doc_finalize: { Args: { _doc: string }; Returns: Json }
      freight_doc_register: {
        Args: {
          _company: string
          _driver: string
          _equipment: string
          _file_name: string
          _kind: string
          _load: string
          _mime: string
          _size: number
        }
        Returns: Json
      }
      freight_doc_review: {
        Args: { _approve: boolean; _doc: string; _note: string }
        Returns: Json
      }
      freight_driver_profile_upsert: {
        Args: { _company: string; _user: string }
        Returns: Json
      }
      freight_driver_respond: {
        Args: { _accept: boolean; _load: string; _reason: string }
        Returns: Json
      }
      freight_exception_resolve: {
        Args: { _exception: string; _resolution: string }
        Returns: Json
      }
      freight_invite_accept: { Args: { _token: string }; Returns: Json }
      freight_invite_create: {
        Args: {
          _company: string
          _email: string
          _hours: number
          _role: string
        }
        Returns: Json
      }
      freight_invite_revoke: { Args: { _invite: string }; Returns: Json }
      freight_invoice_draft: { Args: { _load: string }; Returns: Json }
      freight_load_assign: {
        Args: {
          _driver: string
          _expected_version: number
          _load: string
          _trailer: string
          _truck: string
        }
        Returns: Json
      }
      freight_load_save: {
        Args: {
          _company: string
          _expected_version: number
          _f: Json
          _load: string
        }
        Returns: Json
      }
      freight_load_status: {
        Args: {
          _expected_version: number
          _load: string
          _reason: string
          _to: string
        }
        Returns: Json
      }
      freight_my_context: { Args: never; Returns: Json }
      freight_role_revoke: {
        Args: { _company: string; _role: string; _user: string }
        Returns: Json
      }
      freight_rule_set: {
        Args: { _company: string; _enabled: boolean; _kind: string }
        Returns: Json
      }
      freight_run_review: {
        Args: { _run: string; _status: string }
        Returns: Json
      }
      freight_settlement_draft: {
        Args: {
          _amount_cents: number
          _company: string
          _driver: string
          _end: string
          _start: string
        }
        Returns: Json
      }
      freight_team: { Args: { _company: string }; Returns: Json }
      hercules_audit: {
        Args: { _detail: Json; _event: string }
        Returns: undefined
      }
      hercules_has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["hercules_role"][]
          _user: string
        }
        Returns: boolean
      }
      hercules_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["hercules_role"]
          _user: string
        }
        Returns: boolean
      }
      hercules_is_company_admin: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      hercules_role_request_decide: {
        Args: { _reason: string; _request: string; _status: string }
        Returns: Json
      }
      hercules_role_request_submit: {
        Args: {
          _company: string
          _docs: string[]
          _reason: string
          _role: Database["public"]["Enums"]["hercules_role"]
        }
        Returns: Json
      }
      hercules_role_set: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["hercules_role"]
          _target: string
        }
        Returns: Json
      }
      hercules_switch_role: {
        Args: { _role: Database["public"]["Enums"]["hercules_role"] }
        Returns: Json
      }
      hercules_vault_review: {
        Args: { _accept: boolean; _doc: string; _note: string }
        Returns: Json
      }
      load_book: { Args: { _load: string; _vehicle?: string }; Returns: Json }
    }
    Enums: {
      hercules_role:
        | "driver"
        | "dispatcher"
        | "broker"
        | "shipper"
        | "fleet_manager"
        | "finance"
        | "company_admin"
        | "platform_admin"
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
    Enums: {
      hercules_role: [
        "driver",
        "dispatcher",
        "broker",
        "shipper",
        "fleet_manager",
        "finance",
        "company_admin",
        "platform_admin",
      ],
    },
  },
} as const
