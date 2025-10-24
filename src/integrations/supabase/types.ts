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
        Relationships: []
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
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "agency_subscriptions"
            referencedColumns: ["id"]
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
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          agency_id: string | null
          amount: number
          client_id: string
          created_at: string
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
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          is_fixed: boolean
          name: string
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
          is_fixed?: boolean
          name: string
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
          is_fixed?: boolean
          name?: string
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
            foreignKeyName: "expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
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
      lead_statuses: {
        Row: {
          agency_id: string
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          order_position: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          order_position?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
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
          name: string
          next_contact: string | null
          notes: string | null
          phone: string | null
          position: string | null
          priority: string
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
          value: number | null
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
          name: string
          next_contact?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          value?: number | null
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
          name?: string
          next_contact?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
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
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      notification_preferences: {
        Row: {
          agency_id: string
          browser_notifications: boolean
          created_at: string
          do_not_disturb_end: string | null
          do_not_disturb_start: string | null
          do_not_disturb_until: string | null
          email_digest: boolean
          id: string
          leads_enabled: boolean
          meetings_enabled: boolean
          payments_enabled: boolean
          posts_enabled: boolean
          reminders_enabled: boolean
          system_enabled: boolean
          tasks_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          browser_notifications?: boolean
          created_at?: string
          do_not_disturb_end?: string | null
          do_not_disturb_start?: string | null
          do_not_disturb_until?: string | null
          email_digest?: boolean
          id?: string
          leads_enabled?: boolean
          meetings_enabled?: boolean
          payments_enabled?: boolean
          posts_enabled?: boolean
          reminders_enabled?: boolean
          system_enabled?: boolean
          tasks_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          browser_notifications?: boolean
          created_at?: string
          do_not_disturb_end?: string | null
          do_not_disturb_start?: string | null
          do_not_disturb_until?: string | null
          email_digest?: boolean
          id?: string
          leads_enabled?: boolean
          meetings_enabled?: boolean
          payments_enabled?: boolean
          posts_enabled?: boolean
          reminders_enabled?: boolean
          system_enabled?: boolean
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      salaries: {
        Row: {
          agency_id: string | null
          amount: number
          created_at: string
          due_date: string
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
        ]
      }
      selected_ad_accounts: {
        Row: {
          ad_account_id: string
          ad_account_name: string
          agency_id: string
          connection_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          last_sync: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          ad_account_name: string
          agency_id: string
          connection_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          ad_account_name?: string
          agency_id?: string
          connection_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          last_sync?: string | null
          timezone?: string | null
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
            referencedRelation: "social_media_posts"
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
            referencedRelation: "social_media_posts"
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
        ]
      }
      social_media_posts: {
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
          description: string | null
          hashtags: string[] | null
          id: string
          mentions: string[] | null
          notes: string | null
          notification_sent_at: string | null
          platform: string
          post_type: string
          priority: string
          scheduled_date: string
          status: string
          title: string
          updated_at: string | null
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
          description?: string | null
          hashtags?: string[] | null
          id?: string
          mentions?: string[] | null
          notes?: string | null
          notification_sent_at?: string | null
          platform: string
          post_type: string
          priority?: string
          scheduled_date: string
          status?: string
          title: string
          updated_at?: string | null
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
          description?: string | null
          hashtags?: string[] | null
          id?: string
          mentions?: string[] | null
          notes?: string | null
          notification_sent_at?: string | null
          platform?: string
          post_type?: string
          priority?: string
          scheduled_date?: string
          status?: string
          title?: string
          updated_at?: string | null
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
            foreignKeyName: "social_media_schedule_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
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
      tasks: {
        Row: {
          agency_id: string | null
          archived: boolean
          assigned_to: string | null
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          history: Json | null
          id: string
          notification_sent_at: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          archived?: boolean
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          history?: Json | null
          id?: string
          notification_sent_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          archived?: boolean
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          history?: Json | null
          id?: string
          notification_sent_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
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
        ]
      }
    }
    Views: {
      master_agency_overview: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          client_count: number | null
          created_at: string | null
          current_period_end: string | null
          is_active: boolean | null
          stripe_customer_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          task_count: number | null
          total_revenue: number | null
          user_count: number | null
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
      archive_old_approved_posts: { Args: never; Returns: number }
      check_agency_limits: {
        Args: {
          agency_uuid: string
          current_count?: number
          limit_type: string
        }
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
      is_master_user: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
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
