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
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "agency_subscriptions"
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
          contact: string | null
          created_at: string
          due_date: number | null
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
          contact?: string | null
          created_at?: string
          due_date?: number | null
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
          contact?: string | null
          created_at?: string
          due_date?: number | null
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
        ]
      }
      expenses: {
        Row: {
          agency_id: string | null
          amount: number
          created_at: string
          due_date: string
          id: string
          is_fixed: boolean
          name: string
          paid_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          created_at?: string
          due_date: string
          id?: string
          is_fixed?: boolean
          name: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          is_fixed?: boolean
          name?: string
          paid_date?: string | null
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
        ]
      }
      personal_tasks: {
        Row: {
          agency_id: string | null
          category: string | null
          client_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_routine: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          client_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_routine?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          client_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_routine?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          max_clients: number
          max_leads: number
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
          max_clients?: number
          max_leads?: number
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
          max_clients?: number
          max_leads?: number
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
          id: string
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
          id?: string
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
          id?: string
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
          agency_id: string | null
          client_id: string
          created_at: string
          daily_budget: number | null
          id: string
          last_optimization: string | null
          observations: string | null
          platforms: string[] | null
          results: Database["public"]["Enums"]["traffic_result"] | null
          situation: Database["public"]["Enums"]["traffic_situation"] | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          client_id: string
          created_at?: string
          daily_budget?: number | null
          id?: string
          last_optimization?: string | null
          observations?: string | null
          platforms?: string[] | null
          results?: Database["public"]["Enums"]["traffic_result"] | null
          situation?: Database["public"]["Enums"]["traffic_situation"] | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          client_id?: string
          created_at?: string
          daily_budget?: number | null
          id?: string
          last_optimization?: string | null
          observations?: string | null
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
            foreignKeyName: "traffic_controls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_agency_limits: {
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
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_agency_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_agency_admin: {
        Args: { agency_uuid?: string }
        Returns: boolean
      }
      is_agency_subscription_active: {
        Args: { agency_uuid?: string }
        Returns: boolean
      }
      is_master_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      user_belongs_to_agency: {
        Args: { agency_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      payment_status: "pending" | "paid" | "overdue"
      subscription_plan: "free" | "basic" | "pro" | "enterprise"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done" | "em_revisao"
      traffic_result: "excellent" | "good" | "average" | "bad" | "terrible"
      traffic_situation: "stable" | "improving" | "worsening"
      user_role: "gestor_trafego" | "designer" | "administrador"
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
      payment_status: ["pending", "paid", "overdue"],
      subscription_plan: ["free", "basic", "pro", "enterprise"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done", "em_revisao"],
      traffic_result: ["excellent", "good", "average", "bad", "terrible"],
      traffic_situation: ["stable", "improving", "worsening"],
      user_role: ["gestor_trafego", "designer", "administrador"],
    },
  },
} as const
