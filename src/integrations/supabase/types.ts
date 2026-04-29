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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      balance_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          clinic_id: string
          contact_request_id: string | null
          created_at: string
          id: string
          note: string | null
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          clinic_id: string
          contact_request_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          clinic_id?: string
          contact_request_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_transactions_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: false
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_approvals: {
        Row: {
          applied_as_healthcare_facility: boolean
          approval_token: string | null
          clinic_id: string
          created_at: string
          health_tourism_doc_url: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_certificate_url: string | null
        }
        Insert: {
          applied_as_healthcare_facility?: boolean
          approval_token?: string | null
          clinic_id: string
          created_at?: string
          health_tourism_doc_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_certificate_url?: string | null
        }
        Update: {
          applied_as_healthcare_facility?: boolean
          approval_token?: string | null
          clinic_id?: string
          created_at?: string
          health_tourism_doc_url?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_certificate_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_approvals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_balances: {
        Row: {
          balance_cents: number
          clinic_id: string
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          clinic_id: string
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          clinic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_balances_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_before_after_images: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      clinic_images: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          image_url: string
          is_primary: boolean | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_images_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_treatments: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          price: number | null
          starting_price_euro: number | null
          treatment_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          price?: number | null
          starting_price_euro?: number | null
          treatment_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          price?: number | null
          starting_price_euro?: number | null
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          approval_status: string
          city_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          display_name: string | null
          email: string | null
          experience_years: number | null
          facilities: string[]
          id: string
          is_featured: boolean | null
          is_published: boolean
          is_verified: boolean | null
          languages: string[]
          latitude: number | null
          longitude: number | null
          name: string
          page_revision_notes: string | null
          page_status: string
          patient_count: number | null
          phone: string | null
          rating: number | null
          review_count: number | null
          trustpilot_rating: number | null
          trustpilot_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          city_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          experience_years?: number | null
          facilities?: string[]
          id?: string
          is_featured?: boolean | null
          is_published?: boolean
          is_verified?: boolean | null
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          name: string
          page_revision_notes?: string | null
          page_status?: string
          patient_count?: number | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          trustpilot_rating?: number | null
          trustpilot_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          city_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          experience_years?: number | null
          facilities?: string[]
          id?: string
          is_featured?: boolean | null
          is_published?: boolean
          is_verified?: boolean | null
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          name?: string
          page_revision_notes?: string | null
          page_status?: string
          patient_count?: number | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          trustpilot_rating?: number | null
          trustpilot_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics_public: {
        Row: {
          address: string | null
          balance_cents: number
          city_id: string | null
          created_at: string | null
          description: string | null
          experience_years: number | null
          facilities: string[]
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          languages: string[]
          latitude: number | null
          longitude: number | null
          name: string | null
          patient_count: number | null
          rating: number | null
          review_count: number | null
          trustpilot_rating: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          balance_cents?: number
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          experience_years?: number | null
          facilities?: string[]
          id: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          patient_count?: number | null
          rating?: number | null
          review_count?: number | null
          trustpilot_rating?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          balance_cents?: number
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          experience_years?: number | null
          facilities?: string[]
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          patient_count?: number | null
          rating?: number | null
          review_count?: number | null
          trustpilot_rating?: number | null
          website?: string | null
        }
        Relationships: []
      }
      contact_request_tracking: {
        Row: {
          blocked_until: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: unknown
          last_submission: string
          submissions_count: number | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          last_submission?: string
          submissions_count?: number | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          last_submission?: string
          submissions_count?: number | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          id: string
          ip_address: unknown
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          is_active: boolean
          max_uses: number | null
          percent_off: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          max_uses?: number | null
          percent_off: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          max_uses?: number | null
          percent_off?: number
          used_count?: number
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          amount_off_cents: number
          clinic_id: string
          code: string
          context: string
          created_at: string
          id: string
          stripe_session_id: string | null
        }
        Insert: {
          amount_off_cents?: number
          clinic_id: string
          code: string
          context: string
          created_at?: string
          id?: string
          stripe_session_id?: string | null
        }
        Update: {
          amount_off_cents?: number
          clinic_id?: string
          code?: string
          context?: string
          created_at?: string
          id?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      doctors: {
        Row: {
          clinic_id: string
          created_at: string
          experience_years: number | null
          id: string
          image_url: string | null
          name: string
          profile_image_url: string | null
          specialization: string | null
          title: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          experience_years?: number | null
          id?: string
          image_url?: string | null
          name: string
          profile_image_url?: string | null
          specialization?: string | null
          title?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          experience_years?: number | null
          id?: string
          image_url?: string | null
          name?: string
          profile_image_url?: string | null
          specialization?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          amount_cents: number
          clinic_id: string
          contact_request_id: string
          id: string
          purchased_at: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents?: number
          clinic_id: string
          contact_request_id: string
          id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          clinic_id?: string
          contact_request_id?: string
          id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: false
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email_verified: boolean
          full_name: string | null
          id: string
          updated_at: string
          user_type: string | null
        }
        Insert: {
          created_at?: string
          email_verified?: boolean
          full_name?: string | null
          id: string
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          created_at?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          updated_at?: string
          user_type?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          request_count: number
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address: unknown
          request_count?: number
          window_start?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          clinic_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_name: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_name: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      treatments: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          max_price: number | null
          min_price: number | null
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "treatment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_contact_submission_allowed: {
        Args: { _email: string; _ip_address: unknown }
        Returns: boolean
      }
      credit_balance_topup: {
        Args: { p_amount_cents: number; p_clinic: string; p_intent: string }
        Returns: Json
      }
      debit_balance_for_lead: {
        Args: { p_clinic: string; p_request: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_lead_purchased: {
        Args: {
          p_amount_cents: number
          p_clinic: string
          p_intent: string
          p_request: string
        }
        Returns: Json
      }
      validate_discount_code: {
        Args: { p_amount_cents: number; p_code: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "patient" | "clinic_admin" | "admin"
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
      app_role: ["patient", "clinic_admin", "admin"],
    },
  },
} as const
