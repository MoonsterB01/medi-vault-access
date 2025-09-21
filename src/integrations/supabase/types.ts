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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointment_slots: {
        Row: {
          created_at: string
          current_bookings: number | null
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          max_appointments: number | null
          slot_date: string
          slot_type: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_bookings?: number | null
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          max_appointments?: number | null
          slot_date: string
          slot_type?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_bookings?: number | null
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          max_appointments?: number | null
          slot_date?: string
          slot_type?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_id: string
          appointment_time: string
          appointment_type: string | null
          booking_source: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          chief_complaint: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          doctor_id: string
          doctor_notes: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          patient_notes: string | null
          rescheduled_from: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          appointment_time: string
          appointment_type?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          chief_complaint?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          doctor_id: string
          doctor_notes?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_notes?: string | null
          rescheduled_from?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          appointment_time?: string
          appointment_type?: string | null
          booking_source?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          chief_complaint?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          doctor_id?: string
          doctor_notes?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_notes?: string | null
          rescheduled_from?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_files: {
        Row: {
          blocked_at: string | null
          blocked_by: string
          created_at: string | null
          file_hash: string
          id: string
          reason: string | null
          similarity_patterns: Json | null
          user_feedback: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by: string
          created_at?: string | null
          file_hash: string
          id?: string
          reason?: string | null
          similarity_patterns?: Json | null
          user_feedback?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string
          created_at?: string | null
          file_hash?: string
          id?: string
          reason?: string | null
          similarity_patterns?: Json | null
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_files_file_hash_fkey"
            columns: ["file_hash"]
            isOneToOne: false
            referencedRelation: "file_hashes"
            referencedColumns: ["file_hash"]
          },
        ]
      }
      content_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          medical_specialty: string | null
          name: string
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          medical_specialty?: string | null
          name: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          medical_specialty?: string | null
          name?: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patient_relationships: {
        Row: {
          created_at: string
          doctor_id: string
          first_visit_date: string | null
          id: string
          is_active: boolean | null
          last_visit_date: string | null
          notes: string | null
          patient_id: string
          relationship_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          first_visit_date?: string | null
          id?: string
          is_active?: boolean | null
          last_visit_date?: string | null
          notes?: string | null
          patient_id: string
          relationship_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          first_visit_date?: string | null
          id?: string
          is_active?: boolean | null
          last_visit_date?: string | null
          notes?: string | null
          patient_id?: string
          relationship_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_patient_relationships_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_patient_relationships_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          bio: string | null
          consultation_fee: number | null
          created_at: string
          doctor_id: string
          hospital_affiliations: string[] | null
          id: string
          is_available: boolean | null
          profile_image_url: string | null
          qualifications: string[] | null
          specialization: string
          updated_at: string
          user_id: string
          working_hours: Json | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          doctor_id: string
          hospital_affiliations?: string[] | null
          id?: string
          is_available?: boolean | null
          profile_image_url?: string | null
          qualifications?: string[] | null
          specialization: string
          updated_at?: string
          user_id: string
          working_hours?: Json | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          doctor_id?: string
          hospital_affiliations?: string[] | null
          id?: string
          is_available?: boolean | null
          profile_image_url?: string | null
          qualifications?: string[] | null
          specialization?: string
          updated_at?: string
          user_id?: string
          working_hours?: Json | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_feedback: {
        Row: {
          corrected_verification_status: string
          created_at: string | null
          document_id: string
          feedback_notes: string | null
          id: string
          original_verification_status: string
          user_assigned_category: string | null
          user_id: string
        }
        Insert: {
          corrected_verification_status: string
          created_at?: string | null
          document_id: string
          feedback_notes?: string | null
          id?: string
          original_verification_status: string
          user_assigned_category?: string | null
          user_id: string
        }
        Update: {
          corrected_verification_status?: string
          created_at?: string | null
          document_id?: string
          feedback_notes?: string | null
          id?: string
          original_verification_status?: string
          user_assigned_category?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_keywords: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string
          entity_category: string | null
          entity_type: string | null
          id: string
          keyword: string
          keyword_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id: string
          entity_category?: string | null
          entity_type?: string | null
          id?: string
          keyword: string
          keyword_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string
          entity_category?: string | null
          entity_type?: string | null
          id?: string
          keyword?: string
          keyword_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_keywords_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          auto_categories: string[] | null
          content_confidence: number | null
          content_keywords: string[] | null
          content_type: string | null
          description: string | null
          document_type: string | null
          extracted_dates: string[] | null
          extracted_entities: Json | null
          extracted_text: string | null
          extraction_metadata: Json | null
          file_hash: string | null
          file_path: string
          file_size: number | null
          filename: string
          format_supported: boolean | null
          id: string
          medical_keyword_count: number | null
          medical_specialties: string[] | null
          ocr_extracted_text: string | null
          patient_id: string
          processing_notes: string | null
          searchable_content: string | null
          structural_cues: Json | null
          tags: string[] | null
          text_density_score: number | null
          uploaded_at: string | null
          uploaded_by: string
          uploaded_by_user_shareable_id: string | null
          user_verified_category: string | null
          verification_status: string | null
        }
        Insert: {
          auto_categories?: string[] | null
          content_confidence?: number | null
          content_keywords?: string[] | null
          content_type?: string | null
          description?: string | null
          document_type?: string | null
          extracted_dates?: string[] | null
          extracted_entities?: Json | null
          extracted_text?: string | null
          extraction_metadata?: Json | null
          file_hash?: string | null
          file_path: string
          file_size?: number | null
          filename: string
          format_supported?: boolean | null
          id?: string
          medical_keyword_count?: number | null
          medical_specialties?: string[] | null
          ocr_extracted_text?: string | null
          patient_id: string
          processing_notes?: string | null
          searchable_content?: string | null
          structural_cues?: Json | null
          tags?: string[] | null
          text_density_score?: number | null
          uploaded_at?: string | null
          uploaded_by: string
          uploaded_by_user_shareable_id?: string | null
          user_verified_category?: string | null
          verification_status?: string | null
        }
        Update: {
          auto_categories?: string[] | null
          content_confidence?: number | null
          content_keywords?: string[] | null
          content_type?: string | null
          description?: string | null
          document_type?: string | null
          extracted_dates?: string[] | null
          extracted_entities?: Json | null
          extracted_text?: string | null
          extraction_metadata?: Json | null
          file_hash?: string | null
          file_path?: string
          file_size?: number | null
          filename?: string
          format_supported?: boolean | null
          id?: string
          medical_keyword_count?: number | null
          medical_specialties?: string[] | null
          ocr_extracted_text?: string | null
          patient_id?: string
          processing_notes?: string | null
          searchable_content?: string | null
          structural_cues?: Json | null
          tags?: string[] | null
          text_density_score?: number | null
          uploaded_at?: string | null
          uploaded_by?: string
          uploaded_by_user_shareable_id?: string | null
          user_verified_category?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      family_access: {
        Row: {
          can_view: boolean
          created_at: string
          granted_by: string
          id: string
          patient_id: string
          user_id: string
        }
        Insert: {
          can_view?: boolean
          created_at?: string
          granted_by: string
          id?: string
          patient_id: string
          user_id: string
        }
        Update: {
          can_view?: boolean
          created_at?: string
          granted_by?: string
          id?: string
          patient_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_access_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      file_hashes: {
        Row: {
          content_type: string | null
          created_at: string | null
          file_hash: string
          file_size: number | null
          first_uploaded_at: string | null
          id: string
          last_seen_at: string | null
          original_filename: string
          upload_count: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          file_hash: string
          file_size?: number | null
          first_uploaded_at?: string | null
          id?: string
          last_seen_at?: string | null
          original_filename: string
          upload_count?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          file_hash?: string
          file_size?: number | null
          first_uploaded_at?: string | null
          id?: string
          last_seen_at?: string | null
          original_filename?: string
          upload_count?: number | null
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string
          contact_email: string
          created_at: string
          id: string
          name: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          address: string
          contact_email: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string
          contact_email?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      medical_keywords: {
        Row: {
          category: string
          created_at: string | null
          id: string
          keyword: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          keyword: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          keyword?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          created_by: string
          dob: string
          gender: string
          hospital_id: string | null
          id: string
          name: string
          primary_contact: string
          shareable_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dob: string
          gender: string
          hospital_id?: string | null
          id?: string
          name: string
          primary_contact: string
          shareable_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dob?: string
          gender?: string
          hospital_id?: string | null
          id?: string
          name?: string
          primary_contact?: string
          shareable_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          hospital_id: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_shareable_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          hospital_id?: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_shareable_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          hospital_id?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_shareable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_manage_patient: {
        Args: { patient_id_param: string }
        Returns: boolean
      }
      generate_appointment_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_doctor_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_shareable_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_user_shareable_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_hospital: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_file_blocked: {
        Args: { hash_input: string }
        Returns: boolean
      }
      register_file_hash: {
        Args: {
          content_type_input: string
          filename_input: string
          hash_input: string
          size_input: number
        }
        Returns: string
      }
      user_has_patient_access: {
        Args: { patient_id_param: string; user_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      record_type:
        | "prescription"
        | "test_report"
        | "scan"
        | "discharge_summary"
        | "consultation_notes"
        | "lab_results"
        | "imaging"
      severity_level: "low" | "moderate" | "high" | "critical"
      user_role:
        | "hospital_staff"
        | "patient"
        | "family_member"
        | "admin"
        | "doctor"
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
      record_type: [
        "prescription",
        "test_report",
        "scan",
        "discharge_summary",
        "consultation_notes",
        "lab_results",
        "imaging",
      ],
      severity_level: ["low", "moderate", "high", "critical"],
      user_role: [
        "hospital_staff",
        "patient",
        "family_member",
        "admin",
        "doctor",
      ],
    },
  },
} as const
