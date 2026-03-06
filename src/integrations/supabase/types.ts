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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_account_balance_settings: {
        Row: {
          ad_account_id: string
          agency_id: string
          created_at: string
          id: string
          min_threshold: number
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          agency_id: string
          created_at?: string
          id?: string
          min_threshold?: number
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          agency_id?: string
          created_at?: string
          id?: string
          min_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_account_metrics: {
        Row: {
          account_balance: number | null
          ad_account_id: string
          agency_id: string
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date_end: string
          date_start: string
          id: string
          impressions: number | null
          raw_data: Json | null
          spend: number | null
          updated_at: string
        }
        Insert: {
          account_balance?: number | null
          ad_account_id: string
          agency_id: string
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_end: string
          date_start: string
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          spend?: number | null
          updated_at?: string
        }
        Update: {
          account_balance?: number | null
          ad_account_id?: string
          agency_id?: string
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_end?: string
          date_start?: string
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          spend?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          agency_id: string | null
          content: string | null
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "admin_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "admin_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agencies: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          crm_ad_account_id: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          max_clients: number
          max_leads: number
          max_tasks: number
          max_users: number
          name: string
          slug: string
          subscription_expires_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          crm_ad_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_clients?: number
          max_leads?: number
          max_tasks?: number
          max_users?: number
          name: string
          slug: string
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          crm_ad_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_clients?: number
          max_leads?: number
          max_tasks?: number
          max_users?: number
          name?: string
          slug?: string
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_crm_ad_account_id_fkey"
            columns: ["crm_ad_account_id"]
            isOneToOne: false
            referencedRelation: "selected_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_ai_prompts: {
        Row: {
          agency_id: string
          created_at: string
          custom_prompt: string
          id: string
          prompt_type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          custom_prompt: string
          id?: string
          prompt_type: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          custom_prompt?: string
          id?: string
          prompt_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_ai_prompts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_ai_prompts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_ai_prompts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      agency_notification_rules: {
        Row: {
          agency_id: string
          conditions: Json | null
          created_at: string
          created_by: string | null
          enabled: boolean
          event_key: string
          id: string
          recipients_strategy: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          event_key: string
          id?: string
          recipients_strategy: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          event_key?: string
          id?: string
          recipients_strategy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_notification_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_notification_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_notification_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      agency_onboarding: {
        Row: {
          agency_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          setup_data: Json | null
          status: string
          step_current: number
          step_total: number
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          setup_data?: Json | null
          status?: string
          step_current?: number
          step_total?: number
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          setup_data?: Json | null
          status?: string
          step_current?: number
          step_total?: number
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_onboarding_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_onboarding_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_onboarding_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          agency_id: string
          auto_renew: boolean
          billing_cycle: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_date: string | null
          next_payment_date: string | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          auto_renew?: boolean
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_date?: string | null
          next_payment_date?: string | null
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          auto_renew?: boolean
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_date?: string | null
          next_payment_date?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "public_pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_users: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "agency_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agency_webhooks: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string
          error_count: number | null
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered: string | null
          name: string
          secret_token: string | null
          success_count: number | null
          updated_at: string
          url: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by: string
          error_count?: number | null
          events: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          name: string
          secret_token?: string | null
          success_count?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string
          error_count?: number | null
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered?: string | null
          name?: string
          secret_token?: string | null
          success_count?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      billing_history: {
        Row: {
          agency_id: string
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_url: string | null
          paid_date: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          paid_date?: string | null
          status: string
          stripe_invoice_id?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          paid_date?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "billing_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "agency_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_periods: {
        Row: {
          agency_id: string
          bonus_pool_amount: number
          bonus_pool_percent: number
          created_at: string
          end_date: string
          id: string
          label: string
          net_profit: number
          nps_actual: number
          nps_target: number
          program_id: string
          revenue_actual: number
          revenue_target: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          bonus_pool_amount?: number
          bonus_pool_percent?: number
          created_at?: string
          end_date: string
          id?: string
          label: string
          net_profit?: number
          nps_actual?: number
          nps_target?: number
          program_id: string
          revenue_actual?: number
          revenue_target?: number
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          bonus_pool_amount?: number
          bonus_pool_percent?: number
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          net_profit?: number
          nps_actual?: number
          nps_target?: number
          program_id?: string
          revenue_actual?: number
          revenue_target?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_periods_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_periods_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "bonus_periods_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "bonus_periods_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "bonus_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_programs: {
        Row: {
          agency_id: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          program_type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          program_type?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          program_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_programs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_programs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "bonus_programs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agency_id: string
          budget: number | null
          client_id: string | null
          created_at: string | null
          end_date: string
          goal: string | null
          id: string
          name: string
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          budget?: number | null
          client_id?: string | null
          created_at?: string | null
          end_date: string
          goal?: string | null
          id?: string
          name: string
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          budget?: number | null
          client_id?: string | null
          created_at?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "campaigns_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credential_history: {
        Row: {
          action: string
          agency_id: string
          changed_by: string
          changed_fields: Json | null
          client_id: string
          created_at: string
          credential_id: string
          id: string
        }
        Insert: {
          action: string
          agency_id: string
          changed_by: string
          changed_fields?: Json | null
          client_id: string
          created_at?: string
          credential_id: string
          id?: string
        }
        Update: {
          action?: string
          agency_id?: string
          changed_by?: string
          changed_fields?: Json | null
          client_id?: string
          created_at?: string
          credential_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credential_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credential_history_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "client_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credentials: {
        Row: {
          agency_id: string
          category: string | null
          client_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          password: string | null
          platform: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          agency_id: string
          category?: string | null
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          password?: string | null
          platform: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          agency_id?: string
          category?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          password?: string | null
          platform?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_credentials_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_files: {
        Row: {
          agency_id: string
          category: string | null
          client_id: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          agency_id: string
          category?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          agency_id?: string
          category?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_files_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_notes: {
        Row: {
          agency_id: string
          client_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_payments: {
        Row: {
          agency_id: string | null
          amount: number
          client_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          paid_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          client_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_payments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          agency_id: string | null
          cancelled_at: string | null
          contact: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          due_date: number | null
          has_loyalty: boolean
          id: string
          monthly_value: number | null
          name: string
          observations: string | null
          service: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agency_id?: string | null
          cancelled_at?: string | null
          contact?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          due_date?: number | null
          has_loyalty?: boolean
          id?: string
          monthly_value?: number | null
          name: string
          observations?: string | null
          service?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agency_id?: string | null
          cancelled_at?: string | null
          contact?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          due_date?: number | null
          has_loyalty?: boolean
          id?: string
          monthly_value?: number | null
          name?: string
          observations?: string | null
          service?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      content_library: {
        Row: {
          agency_id: string
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_favorite: boolean | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          agency_id: string
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          agency_id?: string
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_library_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_library_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "content_library_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "content_library_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_library_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_items: {
        Row: {
          content_type: string | null
          created_at: string
          creative_instructions: string | null
          day_number: number | null
          description: string | null
          format: string | null
          hashtags: string | null
          id: string
          objective: string | null
          plan_id: string
          platform: string | null
          post_date: string | null
          status: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          creative_instructions?: string | null
          day_number?: number | null
          description?: string | null
          format?: string | null
          hashtags?: string | null
          id?: string
          objective?: string | null
          plan_id: string
          platform?: string | null
          post_date?: string | null
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          creative_instructions?: string | null
          day_number?: number | null
          description?: string | null
          format?: string | null
          hashtags?: string | null
          id?: string
          objective?: string | null
          plan_id?: string
          platform?: string | null
          post_date?: string | null
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plan_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plans: {
        Row: {
          agency_id: string
          ai_response: Json | null
          client_id: string
          created_at: string
          created_by: string
          depth_level: string
          id: string
          month_year: string
          status: string
          strategy_context: Json
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          ai_response?: Json | null
          client_id: string
          created_at?: string
          created_by: string
          depth_level?: string
          id?: string
          month_year: string
          status?: string
          strategy_context?: Json
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          ai_response?: Json | null
          client_id?: string
          created_at?: string
          created_by?: string
          depth_level?: string
          id?: string
          month_year?: string
          status?: string
          strategy_context?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plans_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plans_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "content_plans_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "content_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contract_services_templates: {
        Row: {
          agency_id: string
          created_at: string | null
          default_value: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          default_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_services_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_services_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "contract_services_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      contracts: {
        Row: {
          agency_address: string | null
          agency_cnpj: string | null
          agency_id: string
          agency_name: string
          agency_representative: string | null
          client_address: string | null
          client_city: string | null
          client_cpf_cnpj: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          client_state: string | null
          contract_date: string
          created_at: string | null
          created_by: string | null
          custom_clauses: string | null
          end_date: string | null
          id: string
          payment_terms: string | null
          services: Json
          start_date: string
          status: string | null
          total_value: number
          updated_at: string | null
          witness1_cpf: string | null
          witness1_name: string | null
          witness2_cpf: string | null
          witness2_name: string | null
        }
        Insert: {
          agency_address?: string | null
          agency_cnpj?: string | null
          agency_id: string
          agency_name: string
          agency_representative?: string | null
          client_address?: string | null
          client_city?: string | null
          client_cpf_cnpj?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          client_state?: string | null
          contract_date: string
          created_at?: string | null
          created_by?: string | null
          custom_clauses?: string | null
          end_date?: string | null
          id?: string
          payment_terms?: string | null
          services?: Json
          start_date: string
          status?: string | null
          total_value?: number
          updated_at?: string | null
          witness1_cpf?: string | null
          witness1_name?: string | null
          witness2_cpf?: string | null
          witness2_name?: string | null
        }
        Update: {
          agency_address?: string | null
          agency_cnpj?: string | null
          agency_id?: string
          agency_name?: string
          agency_representative?: string | null
          client_address?: string | null
          client_city?: string | null
          client_cpf_cnpj?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          client_state?: string | null
          contract_date?: string
          created_at?: string | null
          created_by?: string | null
          custom_clauses?: string | null
          end_date?: string | null
          id?: string
          payment_terms?: string | null
          services?: Json
          start_date?: string
          status?: string | null
          total_value?: number
          updated_at?: string | null
          witness1_cpf?: string | null
          witness1_name?: string | null
          witness2_cpf?: string | null
          witness2_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crm_investments: {
        Row: {
          agency_id: string
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          reference_month: string
          source: string
          source_name: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_month: string
          source: string
          source_name?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_month?: string
          source?: string
          source_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_investments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_investments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "crm_investments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      employee_scorecards: {
        Row: {
          agency_id: string
          created_at: string
          employee_id: string
          final_bonus: number
          id: string
          max_share: number
          nps_retention_score: number
          period_id: string
          process_innovation_score: number
          technical_delivery_score: number
          updated_at: string
          user_id: string | null
          weighted_average: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          employee_id: string
          final_bonus?: number
          id?: string
          max_share?: number
          nps_retention_score?: number
          period_id: string
          process_innovation_score?: number
          technical_delivery_score?: number
          updated_at?: string
          user_id?: string | null
          weighted_average?: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          employee_id?: string
          final_bonus?: number
          id?: string
          max_share?: number
          nps_retention_score?: number
          period_id?: string
          process_innovation_score?: number
          technical_delivery_score?: number
          updated_at?: string
          user_id?: string | null
          weighted_average?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_scorecards_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scorecards_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "employee_scorecards_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "employee_scorecards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_scorecards_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "bonus_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          agency_id: string
          base_salary: number
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          payment_day: number
          role: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          base_salary?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_day?: number
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          base_salary?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_day?: number
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "employees_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          agency_id: string
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          agency_id: string | null
          amount: number
          category: string | null
          created_at: string
          description: string | null
          due_date: string
          expense_type: Database["public"]["Enums"]["expense_type"] | null
          id: string
          installment_current: number | null
          installment_total: number | null
          is_active: boolean | null
          is_fixed: boolean
          name: string
          notification_sent_at: string | null
          paid_date: string | null
          parent_expense_id: string | null
          recurrence_day: number | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          expense_type?: Database["public"]["Enums"]["expense_type"] | null
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          is_active?: boolean | null
          is_fixed?: boolean
          name: string
          notification_sent_at?: string | null
          paid_date?: string | null
          parent_expense_id?: string | null
          recurrence_day?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          expense_type?: Database["public"]["Enums"]["expense_type"] | null
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          is_active?: boolean | null
          is_fixed?: boolean
          name?: string
          notification_sent_at?: string | null
          paid_date?: string | null
          parent_expense_id?: string | null
          recurrence_day?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_api_audit: {
        Row: {
          ad_account_id: string
          agency_id: string
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          method: string | null
          response_data: Json | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          ad_account_id: string
          agency_id: string
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          method?: string | null
          response_data?: Json | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          ad_account_id?: string
          agency_id?: string
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string | null
          response_data?: Json | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      facebook_connections: {
        Row: {
          access_token: string
          agency_id: string
          business_id: string | null
          business_name: string | null
          created_at: string
          facebook_user_id: string
          id: string
          is_active: boolean
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          agency_id: string
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          facebook_user_id: string
          id?: string
          is_active?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          agency_id?: string
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          facebook_user_id?: string
          id?: string
          is_active?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facebook_lead_integrations: {
        Row: {
          agency_id: string
          connection_id: string
          created_at: string
          created_by: string
          default_priority: string
          default_source: string
          default_status: string
          field_mapping: Json | null
          form_id: string
          form_name: string
          form_questions: Json | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          page_id: string
          page_name: string
          pixel_id: string | null
          sync_method: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          agency_id: string
          connection_id: string
          created_at?: string
          created_by: string
          default_priority?: string
          default_source?: string
          default_status?: string
          field_mapping?: Json | null
          form_id: string
          form_name: string
          form_questions?: Json | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          page_id: string
          page_name: string
          pixel_id?: string | null
          sync_method?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          agency_id?: string
          connection_id?: string
          created_at?: string
          created_by?: string
          default_priority?: string
          default_source?: string
          default_status?: string
          field_mapping?: Json | null
          form_id?: string
          form_name?: string
          form_questions?: Json | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          page_id?: string
          page_name?: string
          pixel_id?: string | null
          sync_method?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_lead_integrations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "facebook_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_lead_sync_log: {
        Row: {
          agency_id: string
          facebook_lead_id: string
          id: string
          integration_id: string
          lead_data: Json | null
          lead_id: string | null
          synced_at: string
        }
        Insert: {
          agency_id: string
          facebook_lead_id: string
          id?: string
          integration_id: string
          lead_data?: Json | null
          lead_id?: string | null
          synced_at?: string
        }
        Update: {
          agency_id?: string
          facebook_lead_id?: string
          id?: string
          integration_id?: string
          lead_data?: Json | null
          lead_id?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_lead_sync_log_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "facebook_lead_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_lead_sync_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_pixels: {
        Row: {
          ad_account_id: string
          agency_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_selected: boolean | null
          pixel_id: string
          pixel_name: string
          test_event_code: string | null
          updated_at: string | null
        }
        Insert: {
          ad_account_id: string
          agency_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_selected?: boolean | null
          pixel_id: string
          pixel_name: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_account_id?: string
          agency_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_selected?: boolean | null
          pixel_id?: string
          pixel_name?: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_pixels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_pixels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "facebook_pixels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          agency_id: string
          calendar_id: string | null
          connected_email: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          refresh_token: string
          sync_enabled: boolean | null
          token_expiry: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          agency_id: string
          calendar_id?: string | null
          connected_email?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token: string
          sync_enabled?: boolean | null
          token_expiry: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          agency_id?: string
          calendar_id?: string | null
          connected_email?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string
          sync_enabled?: boolean | null
          token_expiry?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          agency_id: string
          created_at: string
          error_count: number | null
          errors: Json | null
          file_name: string | null
          id: string
          import_type: string
          success_count: number | null
          total_rows: number | null
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          success_count?: number | null
          total_rows?: number | null
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          success_count?: number | null
          total_rows?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "import_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          agency_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          lead_id: string
          scheduled_at: string | null
          title: string
          type: string
        }
        Insert: {
          agency_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          lead_id: string
          scheduled_at?: string | null
          title: string
          type: string
        }
        Update: {
          agency_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          lead_id?: string
          scheduled_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      lead_history: {
        Row: {
          action_type: string
          agency_id: string
          created_at: string
          description: string | null
          field_name: string | null
          id: string
          lead_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          agency_id: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          lead_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          agency_id?: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          lead_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_results: {
        Row: {
          agency_id: string
          answers_detail: Json | null
          id: string
          lead_id: string
          qualification: string
          score_total: number
          scored_at: string
        }
        Insert: {
          agency_id: string
          answers_detail?: Json | null
          id?: string
          lead_id: string
          qualification?: string
          score_total?: number
          scored_at?: string
        }
        Update: {
          agency_id?: string
          answers_detail?: Json | null
          id?: string
          lead_id?: string
          qualification?: string
          score_total?: number
          scored_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_results_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scoring_results_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "lead_scoring_results_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "lead_scoring_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          agency_id: string
          answer: string
          created_at: string
          form_id: string
          form_name: string | null
          id: string
          is_blocker: boolean
          question: string
          score: number
        }
        Insert: {
          agency_id: string
          answer: string
          created_at?: string
          form_id: string
          form_name?: string | null
          id?: string
          is_blocker?: boolean
          question: string
          score?: number
        }
        Update: {
          agency_id?: string
          answer?: string
          created_at?: string
          form_id?: string
          form_name?: string | null
          id?: string
          is_blocker?: boolean
          question?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scoring_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "lead_scoring_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      lead_statuses: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          is_system: boolean
          name: string
          order_position: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          name: string
          order_position?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          name?: string
          order_position?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          agency_id: string
          assigned_to: string | null
          company: string | null
          created_at: string
          created_by: string
          custom_fields: Json | null
          email: string | null
          follow_up_notification_sent_at: string | null
          id: string
          last_contact: string | null
          loss_reason: string | null
          name: string
          next_contact: string | null
          notes: string | null
          phone: string | null
          position: string | null
          qualification_score: number | null
          qualification_source: string | null
          source: string | null
          status: string
          status_changed_at: string | null
          tags: string[] | null
          temperature: string
          updated_at: string
          value: number | null
          won_at: string | null
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          email?: string | null
          follow_up_notification_sent_at?: string | null
          id?: string
          last_contact?: string | null
          loss_reason?: string | null
          name: string
          next_contact?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          qualification_score?: number | null
          qualification_source?: string | null
          source?: string | null
          status?: string
          status_changed_at?: string | null
          tags?: string[] | null
          temperature?: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          email?: string | null
          follow_up_notification_sent_at?: string | null
          id?: string
          last_contact?: string | null
          loss_reason?: string | null
          name?: string
          next_contact?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          qualification_score?: number | null
          qualification_source?: string | null
          source?: string | null
          status?: string
          status_changed_at?: string | null
          tags?: string[] | null
          temperature?: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Relationships: []
      }
      meeting_calendar_events: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          google_calendar_event_id: string
          id: string
          meeting_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          google_calendar_event_id: string
          id?: string
          meeting_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          google_calendar_event_id?: string
          id?: string
          meeting_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_calendar_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          meeting_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          meeting_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_clients_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_items: Json | null
          agency_id: string
          cancelled_reason: string | null
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          external_participants: Json | null
          follow_up_date: string | null
          google_calendar_event_id: string | null
          google_meet_link: string | null
          id: string
          is_internal: boolean
          lead_id: string | null
          location: string | null
          meeting_notes: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          next_steps: string | null
          organizer_id: string
          outcome: Database["public"]["Enums"]["meeting_outcome"] | null
          participants: Json | null
          start_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          sync_to_google_calendar: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          agency_id: string
          cancelled_reason?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          external_participants?: Json | null
          follow_up_date?: string | null
          google_calendar_event_id?: string | null
          google_meet_link?: string | null
          id?: string
          is_internal?: boolean
          lead_id?: string | null
          location?: string | null
          meeting_notes?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          next_steps?: string | null
          organizer_id: string
          outcome?: Database["public"]["Enums"]["meeting_outcome"] | null
          participants?: Json | null
          start_time: string
          status?: Database["public"]["Enums"]["meeting_status"]
          sync_to_google_calendar?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          agency_id?: string
          cancelled_reason?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          external_participants?: Json | null
          follow_up_date?: string | null
          google_calendar_event_id?: string | null
          google_meet_link?: string | null
          id?: string
          is_internal?: boolean
          lead_id?: string | null
          location?: string | null
          meeting_notes?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          next_steps?: string | null
          organizer_id?: string
          outcome?: Database["public"]["Enums"]["meeting_outcome"] | null
          participants?: Json | null
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          sync_to_google_calendar?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "meetings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      meta_conversion_events: {
        Row: {
          agency_id: string
          event_id: string | null
          event_name: string
          id: string
          lead_id: string
          pixel_id: string
          response_data: Json | null
          sent_at: string
          status: string
        }
        Insert: {
          agency_id: string
          event_id?: string | null
          event_name: string
          id?: string
          lead_id: string
          pixel_id: string
          response_data?: Json | null
          sent_at?: string
          status?: string
        }
        Update: {
          agency_id?: string
          event_id?: string | null
          event_name?: string
          id?: string
          lead_id?: string
          pixel_id?: string
          response_data?: Json | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_conversion_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversion_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "meta_conversion_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "meta_conversion_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closures: {
        Row: {
          agency_id: string
          closure_month: string
          executed_at: string | null
          execution_details: Json | null
          id: string
          installments_generated: number | null
          payments_generated: number | null
          recurring_expenses_generated: number | null
          salaries_generated: number | null
        }
        Insert: {
          agency_id: string
          closure_month: string
          executed_at?: string | null
          execution_details?: Json | null
          id?: string
          installments_generated?: number | null
          payments_generated?: number | null
          recurring_expenses_generated?: number | null
          salaries_generated?: number | null
        }
        Update: {
          agency_id?: string
          closure_month?: string
          executed_at?: string | null
          execution_details?: Json | null
          id?: string
          installments_generated?: number | null
          payments_generated?: number | null
          recurring_expenses_generated?: number | null
          salaries_generated?: number | null
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          active_clients_count: number | null
          agency_id: string
          created_at: string | null
          id: string
          net_profit: number | null
          overdue_payments_count: number | null
          paid_expenses_count: number | null
          paid_payments_count: number | null
          paid_salaries_count: number | null
          pending_expenses_count: number | null
          pending_payments_count: number | null
          pending_salaries_count: number | null
          snapshot_month: string
          total_expenses: number | null
          total_revenue: number | null
          total_salaries: number | null
        }
        Insert: {
          active_clients_count?: number | null
          agency_id: string
          created_at?: string | null
          id?: string
          net_profit?: number | null
          overdue_payments_count?: number | null
          paid_expenses_count?: number | null
          paid_payments_count?: number | null
          paid_salaries_count?: number | null
          pending_expenses_count?: number | null
          pending_payments_count?: number | null
          pending_salaries_count?: number | null
          snapshot_month: string
          total_expenses?: number | null
          total_revenue?: number | null
          total_salaries?: number | null
        }
        Update: {
          active_clients_count?: number | null
          agency_id?: string
          created_at?: string | null
          id?: string
          net_profit?: number | null
          overdue_payments_count?: number | null
          paid_expenses_count?: number | null
          paid_payments_count?: number | null
          paid_salaries_count?: number | null
          pending_expenses_count?: number | null
          pending_payments_count?: number | null
          pending_salaries_count?: number | null
          snapshot_month?: string
          total_expenses?: number | null
          total_revenue?: number | null
          total_salaries?: number | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          agency_id: string | null
          color: string | null
          content: string | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          is_pinned: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          color?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          color?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          agency_id: string
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          agency_id: string
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          agency_id?: string
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_event_preferences: {
        Row: {
          agency_id: string
          created_at: string
          enabled: boolean
          event_key: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          enabled?: boolean
          event_key: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          enabled?: boolean
          event_key?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_event_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_event_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notification_event_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      notification_integrations: {
        Row: {
          agency_id: string
          created_at: string | null
          custom_webhook_auth_type: string | null
          custom_webhook_auth_value: string | null
          custom_webhook_enabled: boolean | null
          custom_webhook_headers: Json | null
          custom_webhook_method: string | null
          custom_webhook_template: Json | null
          custom_webhook_url: string | null
          discord_enabled: boolean | null
          discord_webhook_url: string | null
          email_enabled: boolean | null
          email_from_address: string | null
          email_from_name: string | null
          email_provider: string | null
          id: string
          slack_channel: string | null
          slack_enabled: boolean | null
          slack_webhook_url: string | null
          updated_at: string | null
          whatsapp_provider: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          custom_webhook_auth_type?: string | null
          custom_webhook_auth_value?: string | null
          custom_webhook_enabled?: boolean | null
          custom_webhook_headers?: Json | null
          custom_webhook_method?: string | null
          custom_webhook_template?: Json | null
          custom_webhook_url?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_provider?: string | null
          id?: string
          slack_channel?: string | null
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          updated_at?: string | null
          whatsapp_provider?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          custom_webhook_auth_type?: string | null
          custom_webhook_auth_value?: string | null
          custom_webhook_enabled?: boolean | null
          custom_webhook_headers?: Json | null
          custom_webhook_method?: string | null
          custom_webhook_template?: Json | null
          custom_webhook_url?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_provider?: string | null
          id?: string
          slack_channel?: string | null
          slack_enabled?: boolean | null
          slack_webhook_url?: string | null
          updated_at?: string | null
          whatsapp_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notification_integrations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          agency_id: string
          browser_notifications: boolean
          created_at: string
          dnd_end_time: string | null
          dnd_holidays: boolean | null
          dnd_start_time: string | null
          dnd_weekends: boolean | null
          do_not_disturb_end: string | null
          do_not_disturb_start: string | null
          do_not_disturb_until: string | null
          email_digest: boolean
          expense_advance_days: number | null
          expenses_enabled: boolean | null
          id: string
          lead_inactive_days: number | null
          leads_enabled: boolean
          meeting_advance_minutes: number | null
          meetings_enabled: boolean
          payment_advance_days: number | null
          payment_repeat_days: number | null
          payment_repeat_enabled: boolean | null
          payments_enabled: boolean
          post_advance_hours: number | null
          posts_enabled: boolean
          reminder_advance_minutes: number | null
          reminders_enabled: boolean
          sound_enabled: boolean | null
          system_enabled: boolean
          task_advance_hours: number | null
          tasks_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          browser_notifications?: boolean
          created_at?: string
          dnd_end_time?: string | null
          dnd_holidays?: boolean | null
          dnd_start_time?: string | null
          dnd_weekends?: boolean | null
          do_not_disturb_end?: string | null
          do_not_disturb_start?: string | null
          do_not_disturb_until?: string | null
          email_digest?: boolean
          expense_advance_days?: number | null
          expenses_enabled?: boolean | null
          id?: string
          lead_inactive_days?: number | null
          leads_enabled?: boolean
          meeting_advance_minutes?: number | null
          meetings_enabled?: boolean
          payment_advance_days?: number | null
          payment_repeat_days?: number | null
          payment_repeat_enabled?: boolean | null
          payments_enabled?: boolean
          post_advance_hours?: number | null
          posts_enabled?: boolean
          reminder_advance_minutes?: number | null
          reminders_enabled?: boolean
          sound_enabled?: boolean | null
          system_enabled?: boolean
          task_advance_hours?: number | null
          tasks_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          browser_notifications?: boolean
          created_at?: string
          dnd_end_time?: string | null
          dnd_holidays?: boolean | null
          dnd_start_time?: string | null
          dnd_weekends?: boolean | null
          do_not_disturb_end?: string | null
          do_not_disturb_start?: string | null
          do_not_disturb_until?: string | null
          email_digest?: boolean
          expense_advance_days?: number | null
          expenses_enabled?: boolean | null
          id?: string
          lead_inactive_days?: number | null
          leads_enabled?: boolean
          meeting_advance_minutes?: number | null
          meetings_enabled?: boolean
          payment_advance_days?: number | null
          payment_repeat_days?: number | null
          payment_repeat_enabled?: boolean | null
          payments_enabled?: boolean
          post_advance_hours?: number | null
          posts_enabled?: boolean
          reminder_advance_minutes?: number | null
          reminders_enabled?: boolean
          sound_enabled?: boolean | null
          system_enabled?: boolean
          task_advance_hours?: number | null
          tasks_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notification_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      notification_tracking: {
        Row: {
          agency_id: string
          created_at: string
          entity_id: string
          id: string
          last_sent_at: string
          notification_type: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          entity_id: string
          id?: string
          last_sent_at?: string
          notification_type: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          entity_id?: string
          id?: string
          last_sent_at?: string
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          agency_id: string
          created_at: string
          id: string
          is_archived: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          scheduled_for: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          agency_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          scheduled_for?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          agency_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          scheduled_for?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          agency_id: string
          category: string
          client_name: string
          comment: string | null
          created_at: string
          id: string
          period_id: string
          response_date: string
          score: number
        }
        Insert: {
          agency_id: string
          category: string
          client_name: string
          comment?: string | null
          created_at?: string
          id?: string
          period_id: string
          response_date?: string
          score: number
        }
        Update: {
          agency_id?: string
          category?: string
          client_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          period_id?: string
          response_date?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "nps_responses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "nps_responses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "bonus_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      post_assignments_deprecated: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_assignments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts_deprecated"
            referencedColumns: ["id"]
          },
        ]
      }
      post_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_clients_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts_deprecated"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          onboarding_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          tour_completed: boolean | null
          updated_at: string
          user_id: string
          welcome_seen: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          onboarding_completed?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          tour_completed?: boolean | null
          updated_at?: string
          user_id: string
          welcome_seen?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          onboarding_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          tour_completed?: boolean | null
          updated_at?: string
          user_id?: string
          welcome_seen?: boolean | null
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          agency_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          sort_order: number
          title: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          sort_order?: number
          title: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          agency_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
        }
        Insert: {
          agency_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
        }
        Update: {
          agency_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_payments: {
        Row: {
          agency_id: string
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          paid_at: string | null
          project_id: string
          status: string
        }
        Insert: {
          agency_id: string
          amount: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          project_id: string
          status?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          agency_id: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          sort_order: number
          status: string
          subtasks: Json
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          sort_order?: number
          status?: string
          subtasks?: Json
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          sort_order?: number
          status?: string
          subtasks?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          agency_id: string
          archived: boolean
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_recurring: boolean
          name: string
          project_type: string
          recurrence_interval: string | null
          responsible_id: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          archived?: boolean
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_recurring?: boolean
          name: string
          project_type?: string
          recurrence_interval?: string | null
          responsible_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          archived?: boolean
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          project_type?: string
          recurrence_interval?: string | null
          responsible_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          agency_id: string | null
          created_at: string | null
          device_info: Json | null
          fcm_token: string
          id: string
          is_active: boolean | null
          platform: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          device_info?: Json | null
          fcm_token: string
          id?: string
          is_active?: boolean | null
          platform?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          device_info?: Json | null
          fcm_token?: string
          id?: string
          is_active?: boolean | null
          platform?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "push_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      reminder_lists: {
        Row: {
          agency_id: string | null
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          order_position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          order_position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          order_position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_lists_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_lists_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reminder_lists_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      reminders: {
        Row: {
          agency_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          is_flagged: boolean
          last_notification_sent: string | null
          list_id: string | null
          notes: string | null
          notification_enabled: boolean
          notification_minutes_before: number | null
          notification_sound: string | null
          parent_reminder_id: string | null
          priority: Database["public"]["Enums"]["reminder_priority"]
          recurrence_count: number | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: Database["public"]["Enums"]["recurrence_type"]
          reminder_time: string | null
          subtasks: Json | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          last_notification_sent?: string | null
          list_id?: string | null
          notes?: string | null
          notification_enabled?: boolean
          notification_minutes_before?: number | null
          notification_sound?: string | null
          parent_reminder_id?: string | null
          priority?: Database["public"]["Enums"]["reminder_priority"]
          recurrence_count?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          reminder_time?: string | null
          subtasks?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          last_notification_sent?: string | null
          list_id?: string | null
          notes?: string | null
          notification_enabled?: boolean
          notification_minutes_before?: number | null
          notification_sound?: string | null
          parent_reminder_id?: string | null
          priority?: Database["public"]["Enums"]["reminder_priority"]
          recurrence_count?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: Database["public"]["Enums"]["recurrence_type"]
          reminder_time?: string | null
          subtasks?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reminders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "reminders_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reminder_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_parent_reminder_id_fkey"
            columns: ["parent_reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_completions: {
        Row: {
          completed_at: string | null
          day_of_week: number | null
          id: string
          month_number: number | null
          routine_id: string
          user_id: string
          week_number: number | null
          year: number | null
        }
        Insert: {
          completed_at?: string | null
          day_of_week?: number | null
          id?: string
          month_number?: number | null
          routine_id: string
          user_id: string
          week_number?: number | null
          year?: number | null
        }
        Update: {
          completed_at?: string | null
          day_of_week?: number | null
          id?: string
          month_number?: number | null
          routine_id?: string
          user_id?: string
          week_number?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_completions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          agency_id: string | null
          created_at: string | null
          day_of_month: number | null
          id: string
          is_active: boolean | null
          order_position: number | null
          scheduled_time: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
          week_days: number[] | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          id?: string
          is_active?: boolean | null
          order_position?: number | null
          scheduled_time?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          week_days?: number[] | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          id?: string
          is_active?: boolean | null
          order_position?: number | null
          scheduled_time?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          week_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "routines_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      salaries: {
        Row: {
          agency_id: string | null
          amount: number
          created_at: string
          due_date: string
          employee_id: string | null
          employee_name: string
          id: string
          paid_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          created_at?: string
          due_date: string
          employee_id?: string | null
          employee_name: string
          id?: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          created_at?: string
          due_date?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "salaries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      selected_ad_accounts: {
        Row: {
          active_campaigns_count: number | null
          ad_account_id: string
          ad_account_name: string
          agency_id: string
          amount_spent: number | null
          balance: number | null
          cached_at: string | null
          connection_id: string
          created_at: string
          currency: string
          current_month_spend: number | null
          id: string
          is_active: boolean
          is_prepaid: boolean | null
          last_7d_spend: number | null
          last_campaign_update: string | null
          last_sync: string | null
          min_threshold: number | null
          spend_cap: number | null
          timezone: string | null
          total_daily_budget: number | null
          updated_at: string
        }
        Insert: {
          active_campaigns_count?: number | null
          ad_account_id: string
          ad_account_name: string
          agency_id: string
          amount_spent?: number | null
          balance?: number | null
          cached_at?: string | null
          connection_id: string
          created_at?: string
          currency?: string
          current_month_spend?: number | null
          id?: string
          is_active?: boolean
          is_prepaid?: boolean | null
          last_7d_spend?: number | null
          last_campaign_update?: string | null
          last_sync?: string | null
          min_threshold?: number | null
          spend_cap?: number | null
          timezone?: string | null
          total_daily_budget?: number | null
          updated_at?: string
        }
        Update: {
          active_campaigns_count?: number | null
          ad_account_id?: string
          ad_account_name?: string
          agency_id?: string
          amount_spent?: number | null
          balance?: number | null
          cached_at?: string | null
          connection_id?: string
          created_at?: string
          currency?: string
          current_month_spend?: number | null
          id?: string
          is_active?: boolean
          is_prepaid?: boolean | null
          last_7d_spend?: number | null
          last_campaign_update?: string | null
          last_sync?: string | null
          min_threshold?: number | null
          spend_cap?: number | null
          timezone?: string | null
          total_daily_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selected_ad_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "facebook_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_approval_rules: {
        Row: {
          agency_id: string
          approvers: Json | null
          created_at: string
          from_status: string
          id: string
          is_active: boolean
          name: string
          requires_approval: boolean
          to_status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          approvers?: Json | null
          created_at?: string
          from_status: string
          id?: string
          is_active?: boolean
          name: string
          requires_approval?: boolean
          to_status: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          approvers?: Json | null
          created_at?: string
          from_status?: string
          id?: string
          is_active?: boolean
          name?: string
          requires_approval?: boolean
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_approval_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_approval_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_approval_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      social_media_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          post_id: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_assignments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts_deprecated"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_content_types: {
        Row: {
          agency_id: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_content_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_content_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_content_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      social_media_custom_statuses: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          order_position: number
          slug: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          order_position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          order_position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_custom_statuses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_custom_statuses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_custom_statuses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      social_media_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          post_id: string | null
          read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          post_id?: string | null
          read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          post_id?: string | null
          read?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts_deprecated"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_platforms: {
        Row: {
          agency_id: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_platforms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_platforms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_platforms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      social_media_post_templates: {
        Row: {
          agency_id: string
          content_template: string | null
          created_at: string
          description: string | null
          hashtags: string[] | null
          id: string
          is_active: boolean
          mentions: string[] | null
          name: string
          platform: string
          post_type: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          content_template?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          is_active?: boolean
          mentions?: string[] | null
          name: string
          platform: string
          post_type: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          content_template?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          is_active?: boolean
          mentions?: string[] | null
          name?: string
          platform?: string
          post_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_post_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_post_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_post_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      social_media_posts_deprecated: {
        Row: {
          agency_id: string
          approval_history: Json | null
          archived: boolean | null
          archived_at: string | null
          attachments: Json | null
          campaign_id: string | null
          client_id: string | null
          created_at: string | null
          created_by: string
          creative_instructions: string | null
          description: string | null
          due_date: string | null
          hashtags: string[] | null
          id: string
          mentions: string[] | null
          notes: string | null
          notification_sent_at: string | null
          platform: string
          post_date: string | null
          post_type: string
          priority: string
          scheduled_date: string
          status: string
          subtasks: Json | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          agency_id: string
          approval_history?: Json | null
          archived?: boolean | null
          archived_at?: string | null
          attachments?: Json | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by: string
          creative_instructions?: string | null
          description?: string | null
          due_date?: string | null
          hashtags?: string[] | null
          id?: string
          mentions?: string[] | null
          notes?: string | null
          notification_sent_at?: string | null
          platform: string
          post_date?: string | null
          post_type: string
          priority?: string
          scheduled_date: string
          status?: string
          subtasks?: Json | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          agency_id?: string
          approval_history?: Json | null
          archived?: boolean | null
          archived_at?: string | null
          attachments?: Json | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          creative_instructions?: string | null
          description?: string | null
          due_date?: string | null
          hashtags?: string[] | null
          id?: string
          mentions?: string[] | null
          notes?: string | null
          notification_sent_at?: string | null
          platform?: string
          post_date?: string | null
          post_type?: string
          priority?: string
          scheduled_date?: string
          status?: string
          subtasks?: Json | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_posts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_schedule_preferences: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          id: string
          is_active: boolean
          platform: string
          preferred_times: Json
          timezone: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          platform: string
          preferred_times?: Json
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          preferred_times?: Json
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_schedule_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_schedule_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_schedule_preferences_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_schedule_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_settings: {
        Row: {
          agency_id: string
          created_at: string
          default_due_date_days_before: number
          id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          default_due_date_days_before?: number
          id?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          default_due_date_days_before?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "social_media_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          has_advanced_reports: boolean
          has_api_access: boolean
          has_crm: boolean
          has_priority_support: boolean
          has_white_label: boolean
          id: string
          is_active: boolean
          max_campaigns: number | null
          max_clients: number
          max_content_storage_gb: number | null
          max_contracts: number
          max_facebook_ad_accounts: number
          max_leads: number
          max_social_media_posts: number | null
          max_storage_gb: number
          max_tasks: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_advanced_reports?: boolean
          has_api_access?: boolean
          has_crm?: boolean
          has_priority_support?: boolean
          has_white_label?: boolean
          id?: string
          is_active?: boolean
          max_campaigns?: number | null
          max_clients?: number
          max_content_storage_gb?: number | null
          max_contracts?: number
          max_facebook_ad_accounts?: number
          max_leads?: number
          max_social_media_posts?: number | null
          max_storage_gb?: number
          max_tasks?: number
          max_users?: number
          name: string
          price_monthly: number
          price_yearly?: number | null
          slug: string
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          has_advanced_reports?: boolean
          has_api_access?: boolean
          has_crm?: boolean
          has_priority_support?: boolean
          has_white_label?: boolean
          id?: string
          is_active?: boolean
          max_campaigns?: number | null
          max_clients?: number
          max_content_storage_gb?: number | null
          max_contracts?: number
          max_facebook_ad_accounts?: number
          max_leads?: number
          max_social_media_posts?: number | null
          max_storage_gb?: number
          max_tasks?: number
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_clients_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_statuses: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          order_position: number
          slug: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          order_position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          order_position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          agency_id: string
          auto_assign_creator: boolean | null
          category: string | null
          created_at: string | null
          created_by: string | null
          default_client_id: string | null
          default_description: string | null
          default_priority: string | null
          default_status: string | null
          default_task_type: string | null
          default_title: string | null
          description: string | null
          due_date_offset_days: number | null
          estimated_duration_hours: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          subtasks: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          agency_id: string
          auto_assign_creator?: boolean | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_client_id?: string | null
          default_description?: string | null
          default_priority?: string | null
          default_status?: string | null
          default_task_type?: string | null
          default_title?: string | null
          description?: string | null
          due_date_offset_days?: number | null
          estimated_duration_hours?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subtasks?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          agency_id?: string
          auto_assign_creator?: boolean | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_client_id?: string | null
          default_description?: string | null
          default_priority?: string | null
          default_status?: string | null
          default_task_type?: string | null
          default_title?: string | null
          description?: string | null
          due_date_offset_days?: number | null
          estimated_duration_hours?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subtasks?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "task_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_templates_default_client_id_fkey"
            columns: ["default_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          agency_id: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          slug: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          slug: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "task_types_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      tasks: {
        Row: {
          agency_id: string | null
          archived: boolean
          assigned_to: string | null
          attachments: Json | null
          client_id: string | null
          created_at: string
          created_by: string
          creative_instructions: string | null
          description: string | null
          due_date: string | null
          hashtags: string[] | null
          history: Json | null
          id: string
          is_internal: boolean
          notification_sent_at: string | null
          platform: string | null
          post_date: string | null
          post_type: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: string
          subtasks: Json | null
          task_type: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id?: string | null
          archived?: boolean
          assigned_to?: string | null
          attachments?: Json | null
          client_id?: string | null
          created_at?: string
          created_by: string
          creative_instructions?: string | null
          description?: string | null
          due_date?: string | null
          hashtags?: string[] | null
          history?: Json | null
          id?: string
          is_internal?: boolean
          notification_sent_at?: string | null
          platform?: string | null
          post_date?: string | null
          post_type?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: string
          subtasks?: Json | null
          task_type?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string | null
          archived?: boolean
          assigned_to?: string | null
          attachments?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          creative_instructions?: string | null
          description?: string | null
          due_date?: string | null
          hashtags?: string[] | null
          history?: Json | null
          id?: string
          is_internal?: boolean
          notification_sent_at?: string | null
          platform?: string | null
          post_date?: string | null
          post_type?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: string
          subtasks?: Json | null
          task_type?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      traffic_control_comments: {
        Row: {
          ad_account_id: string
          agency_id: string
          author_user_id: string
          comment: string
          created_at: string
          id: string
        }
        Insert: {
          ad_account_id: string
          agency_id: string
          author_user_id: string
          comment: string
          created_at?: string
          id?: string
        }
        Update: {
          ad_account_id?: string
          agency_id?: string
          author_user_id?: string
          comment?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_control_comments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_control_comments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "traffic_control_comments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "traffic_control_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "traffic_control_comments_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      traffic_controls: {
        Row: {
          ad_account_id: string | null
          agency_id: string | null
          created_at: string
          daily_budget: number | null
          id: string
          last_optimization: string | null
          observations: string | null
          platform_data: Json | null
          platforms: string[] | null
          responsible_user_id: string | null
          results: Database["public"]["Enums"]["traffic_result"] | null
          situation: Database["public"]["Enums"]["traffic_situation"] | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          agency_id?: string | null
          created_at?: string
          daily_budget?: number | null
          id?: string
          last_optimization?: string | null
          observations?: string | null
          platform_data?: Json | null
          platforms?: string[] | null
          responsible_user_id?: string | null
          results?: Database["public"]["Enums"]["traffic_result"] | null
          situation?: Database["public"]["Enums"]["traffic_situation"] | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          agency_id?: string | null
          created_at?: string
          daily_budget?: number | null
          id?: string
          last_optimization?: string | null
          observations?: string | null
          platform_data?: Json | null
          platforms?: string[] | null
          responsible_user_id?: string | null
          results?: Database["public"]["Enums"]["traffic_result"] | null
          situation?: Database["public"]["Enums"]["traffic_situation"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_controls_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_controls_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "traffic_controls_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "traffic_controls_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "master_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "traffic_controls_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          agency_id: string
          api_calls_count: number
          clients_count: number
          created_at: string
          id: string
          leads_count: number
          period_end: string
          period_start: string
          storage_used_gb: number
          tasks_count: number
          users_count: number
        }
        Insert: {
          agency_id: string
          api_calls_count?: number
          clients_count?: number
          created_at?: string
          id?: string
          leads_count?: number
          period_end: string
          period_start: string
          storage_used_gb?: number
          tasks_count?: number
          users_count?: number
        }
        Update: {
          agency_id?: string
          api_calls_count?: number
          clients_count?: number
          created_at?: string
          id?: string
          leads_count?: number
          period_end?: string
          period_start?: string
          storage_used_gb?: number
          tasks_count?: number
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "usage_metrics_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_type: string
          agency_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          agency_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          agency_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "user_achievements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      user_notification_channels: {
        Row: {
          agency_id: string
          browser_enabled: boolean | null
          created_at: string | null
          custom_webhook_enabled: boolean | null
          discord_enabled: boolean | null
          discord_user_id: string | null
          email_address: string | null
          email_digest: boolean | null
          email_enabled: boolean | null
          email_notification_types: string[] | null
          id: string
          in_app_enabled: boolean | null
          slack_enabled: boolean | null
          slack_user_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_id: string
          browser_enabled?: boolean | null
          created_at?: string | null
          custom_webhook_enabled?: boolean | null
          discord_enabled?: boolean | null
          discord_user_id?: string | null
          email_address?: string | null
          email_digest?: boolean | null
          email_enabled?: boolean | null
          email_notification_types?: string[] | null
          id?: string
          in_app_enabled?: boolean | null
          slack_enabled?: boolean | null
          slack_user_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string
          browser_enabled?: boolean | null
          created_at?: string | null
          custom_webhook_enabled?: boolean | null
          discord_enabled?: boolean | null
          discord_user_id?: string | null
          email_address?: string | null
          email_digest?: boolean | null
          email_enabled?: boolean | null
          email_notification_types?: string[] | null
          id?: string
          in_app_enabled?: boolean | null
          slack_enabled?: boolean | null
          slack_user_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_channels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_channels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "user_notification_channels_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          agency_id: string
          allowed_sources: Json | null
          api_key: string
          api_url: string
          created_at: string | null
          id: string
          instance_name: string
          phone_number: string | null
          qr_code: string | null
          sending_schedule: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          allowed_sources?: Json | null
          api_key: string
          api_url: string
          created_at?: string | null
          id?: string
          instance_name: string
          phone_number?: string | null
          qr_code?: string | null
          sending_schedule?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          allowed_sources?: Json | null
          api_key?: string
          api_url?: string
          created_at?: string | null
          id?: string
          instance_name?: string
          phone_number?: string | null
          qr_code?: string | null
          sending_schedule?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "whatsapp_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      whatsapp_automation_control: {
        Row: {
          account_id: string
          conversation_id: string | null
          conversation_state: string | null
          current_phase: string | null
          current_step_position: number | null
          id: string
          last_error: string | null
          last_followup_sent_at: string | null
          lead_id: string
          next_execution_at: string | null
          retry_count: number
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          conversation_id?: string | null
          conversation_state?: string | null
          current_phase?: string | null
          current_step_position?: number | null
          id?: string
          last_error?: string | null
          last_followup_sent_at?: string | null
          lead_id: string
          next_execution_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          conversation_id?: string | null
          conversation_state?: string | null
          current_phase?: string | null
          current_step_position?: number | null
          id?: string
          last_error?: string | null
          last_followup_sent_at?: string | null
          lead_id?: string
          next_execution_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_control_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_control_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_control_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automation_logs: {
        Row: {
          account_id: string | null
          automation_id: string | null
          created_at: string
          details: Json | null
          event: string
          id: string
        }
        Insert: {
          account_id?: string | null
          automation_id?: string | null
          created_at?: string
          details?: Json | null
          event: string
          id?: string
        }
        Update: {
          account_id?: string | null
          automation_id?: string | null
          created_at?: string
          details?: Json | null
          event?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automation_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_automation_control"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          last_customer_message_at: string | null
          last_message_at: string | null
          last_message_is_from_me: boolean | null
          lead_id: string | null
          phone_number: string
          session_phone: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_is_from_me?: boolean | null
          lead_id?: string | null
          phone_number: string
          session_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_is_from_me?: boolean | null
          lead_id?: string | null
          phone_number?: string
          session_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          agency_id: string
          created_at: string | null
          delay_minutes: number
          id: string
          is_active: boolean | null
          message_template: string
          phase: string
          step_position: number
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          delay_minutes?: number
          id?: string
          is_active?: boolean | null
          message_template: string
          phase: string
          step_position?: number
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          delay_minutes?: number
          id?: string
          is_active?: boolean | null
          message_template?: string
          phase?: string
          step_position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_overview"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "whatsapp_message_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "master_agency_usage"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          account_id: string
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          is_from_me: boolean | null
          message_id: string
          message_type: string | null
          phone_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_from_me?: boolean | null
          message_id: string
          message_type?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_from_me?: boolean | null
          message_id?: string
          message_type?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      master_agency_overview: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          billing_cycle: string | null
          client_count: number | null
          computed_status: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          current_period_end: string | null
          is_active: boolean | null
          plan_name: string | null
          plan_slug: string | null
          price_monthly: number | null
          price_yearly: number | null
          slug: string | null
          subscription_status: string | null
          task_count: number | null
          total_revenue: number | null
          trial_end: string | null
          trial_start: string | null
          user_count: number | null
        }
        Relationships: []
      }
      master_agency_usage: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          computed_status: string | null
          created_at: string | null
          plan_name: string | null
          post_count: number | null
          task_count: number | null
          user_count: number | null
        }
        Relationships: []
      }
      master_billing_metrics: {
        Row: {
          payments_this_month: number | null
          revenue_this_month: number | null
          total_payments: number | null
          total_revenue_received: number | null
        }
        Relationships: []
      }
      master_monthly_metrics: {
        Row: {
          converted_to_paid: number | null
          month: string | null
          new_agencies: number | null
        }
        Relationships: []
      }
      master_monthly_revenue: {
        Row: {
          month: string | null
          payment_count: number | null
          revenue: number | null
        }
        Relationships: []
      }
      master_users: {
        Row: {
          email: string | null
          joined_at: string | null
          last_activity: string | null
          name: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: []
      }
      public_pricing_plans: {
        Row: {
          description: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          price_monthly: number | null
          price_yearly: number | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Update: {
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_task_event_rules: {
        Args: { p_agency_id: string; p_event_key: string; p_payload: Json }
        Returns: undefined
      }
      check_agency_limits: {
        Args: {
          agency_uuid: string
          current_count?: number
          limit_type: string
        }
        Returns: boolean
      }
      check_notification_type_enabled: {
        Args: { p_agency_id: string; p_type: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_notification_tracking: { Args: never; Returns: undefined }
      enforce_plan_limits: {
        Args: {
          agency_uuid: string
          current_count?: number
          limit_type: string
        }
        Returns: boolean
      }
      extract_month_immutable: { Args: { d: string }; Returns: string }
      get_agency_subscription: {
        Args: { agency_uuid?: string }
        Returns: {
          agency_id: string
          current_period_end: string
          has_advanced_reports: boolean
          has_api_access: boolean
          has_crm: boolean
          has_priority_support: boolean
          has_white_label: boolean
          max_clients: number
          max_leads: number
          max_storage_gb: number
          max_tasks: number
          max_users: number
          plan_name: string
          plan_slug: string
          status: string
          subscription_id: string
          trial_end: string
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_event_pref_enabled: {
        Args: { p_agency_id: string; p_event_key: string; p_user_id: string }
        Returns: boolean
      }
      get_meta_pixel_config: {
        Args: { p_agency_id: string }
        Returns: {
          access_token: string
          pixel_id: string
          test_event_code: string
        }[]
      }
      get_user_agency_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_agency_admin: { Args: { agency_uuid?: string }; Returns: boolean }
      is_agency_subscription_active: {
        Args: { agency_uuid?: string }
        Returns: boolean
      }
      is_agency_subscription_valid: {
        Args: { agency_uuid?: string }
        Returns: boolean
      }
      is_master_agency_admin: { Args: never; Returns: boolean }
      is_master_user: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      should_notify_user_for_event: {
        Args: {
          p_agency_id: string
          p_event_key: string
          p_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      start_agency_trial: {
        Args: { p_agency_id: string; p_plan_slug?: string }
        Returns: undefined
      }
      user_belongs_to_agency: {
        Args: { agency_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      expense_type: "avulsa" | "recorrente" | "parcelada"
      meeting_outcome: "win" | "loss" | "follow_up_needed" | "pending"
      meeting_status: "scheduled" | "completed" | "cancelled" | "no_show"
      meeting_type:
        | "commercial"
        | "client"
        | "internal"
        | "quick_call"
        | "workshop"
        | "results"
      notification_priority: "low" | "medium" | "high" | "urgent"
      notification_type:
        | "reminder"
        | "task"
        | "post"
        | "payment"
        | "expense"
        | "lead"
        | "meeting"
        | "system"
      payment_status: "pending" | "paid" | "overdue"
      recurrence_type:
        | "none"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly"
        | "custom"
      reminder_priority: "none" | "low" | "medium" | "high"
      subscription_plan: "free" | "basic" | "pro" | "enterprise"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done" | "em_revisao"
      traffic_result: "excellent" | "good" | "average" | "bad" | "terrible"
      traffic_situation: "stable" | "improving" | "worsening"
      user_role:
        | "gestor_trafego"
        | "designer"
        | "administrador"
        | "super_admin"
        | "agency_admin"
        | "agency_user"
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

export const Constants = {
  public: {
    Enums: {
      expense_type: ["avulsa", "recorrente", "parcelada"],
      meeting_outcome: ["win", "loss", "follow_up_needed", "pending"],
      meeting_status: ["scheduled", "completed", "cancelled", "no_show"],
      meeting_type: [
        "commercial",
        "client",
        "internal",
        "quick_call",
        "workshop",
        "results",
      ],
      notification_priority: ["low", "medium", "high", "urgent"],
      notification_type: [
        "reminder",
        "task",
        "post",
        "payment",
        "expense",
        "lead",
        "meeting",
        "system",
      ],
      payment_status: ["pending", "paid", "overdue"],
      recurrence_type: [
        "none",
        "daily",
        "weekly",
        "monthly",
        "yearly",
        "custom",
      ],
      reminder_priority: ["none", "low", "medium", "high"],
      subscription_plan: ["free", "basic", "pro", "enterprise"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done", "em_revisao"],
      traffic_result: ["excellent", "good", "average", "bad", "terrible"],
      traffic_situation: ["stable", "improving", "worsening"],
      user_role: [
        "gestor_trafego",
        "designer",
        "administrador",
        "super_admin",
        "agency_admin",
        "agency_user",
      ],
    },
  },
} as const
