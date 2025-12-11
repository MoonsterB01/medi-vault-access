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
      alerts: {
        Row: {
          created_at: string | null
          evidence_docs: Json | null
          id: string
          level: string | null
          message: string | null
          patient_id: string | null
          resolved: boolean | null
        }
        Insert: {
          created_at?: string | null
          evidence_docs?: Json | null
          id?: string
          level?: string | null
          message?: string | null
          patient_id?: string | null
          resolved?: boolean | null
        }
        Update: {
          created_at?: string | null
          evidence_docs?: Json | null
          id?: string
          level?: string | null
          message?: string | null
          patient_id?: string | null
          resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      billing: {
        Row: {
          balance_amount: number | null
          bill_date: string
          bill_number: string
          created_at: string | null
          hospital_id: string
          id: string
          invoice_items: Json | null
          notes: string | null
          paid_amount: number | null
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          balance_amount?: number | null
          bill_date?: string
          bill_number: string
          created_at?: string | null
          hospital_id: string
          id?: string
          invoice_items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          balance_amount?: number | null
          bill_date?: string
          bill_number?: string
          created_at?: string | null
          hospital_id?: string
          id?: string
          invoice_items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          patient_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          patient_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
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
      diagnoses: {
        Row: {
          firstseen: string | null
          hidden_by_user: boolean | null
          id: string
          lastseen: string | null
          name: string | null
          patient_id: string | null
          severity: string | null
          source_docs: Json | null
          status: string | null
        }
        Insert: {
          firstseen?: string | null
          hidden_by_user?: boolean | null
          id?: string
          lastseen?: string | null
          name?: string | null
          patient_id?: string | null
          severity?: string | null
          source_docs?: Json | null
          status?: string | null
        }
        Update: {
          firstseen?: string | null
          hidden_by_user?: boolean | null
          id?: string
          lastseen?: string | null
          name?: string | null
          patient_id?: string | null
          severity?: string | null
          source_docs?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plans: {
        Row: {
          ai_model_used: string | null
          created_at: string
          generated_at: string
          id: string
          is_active: boolean | null
          patient_id: string
          plan_data: Json
          profile_id: string | null
          week_start_date: string
        }
        Insert: {
          ai_model_used?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          is_active?: boolean | null
          patient_id: string
          plan_data: Json
          profile_id?: string | null
          week_start_date: string
        }
        Update: {
          ai_model_used?: string | null
          created_at?: string
          generated_at?: string
          id?: string
          is_active?: boolean | null
          patient_id?: string
          plan_data?: Json
          profile_id?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_plans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "wellbeing_profiles"
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
      document_extractions: {
        Row: {
          confidence: number | null
          document_id: string | null
          extraction_json: Json | null
          id: string
          patient_id: string | null
          processed_at: string | null
        }
        Insert: {
          confidence?: number | null
          document_id?: string | null
          extraction_json?: Json | null
          id?: string
          patient_id?: string | null
          processed_at?: string | null
        }
        Update: {
          confidence?: number | null
          document_id?: string | null
          extraction_json?: Json | null
          id?: string
          patient_id?: string | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extractions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
          ai_summary: string | null
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
          summary_confidence: number | null
          summary_generated_at: string | null
          tags: string[] | null
          text_density_score: number | null
          uploaded_at: string | null
          uploaded_by: string
          uploaded_by_user_shareable_id: string | null
          user_verified_category: string | null
          verification_status: string | null
        }
        Insert: {
          ai_summary?: string | null
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
          summary_confidence?: number | null
          summary_generated_at?: string | null
          tags?: string[] | null
          text_density_score?: number | null
          uploaded_at?: string | null
          uploaded_by: string
          uploaded_by_user_shareable_id?: string | null
          user_verified_category?: string | null
          verification_status?: string | null
        }
        Update: {
          ai_summary?: string | null
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
          summary_confidence?: number | null
          summary_generated_at?: string | null
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
      fitness_records: {
        Row: {
          calories_burned: number | null
          created_at: string
          distance_km: number | null
          id: string
          notes: string | null
          patient_id: string
          record_date: string
          steps: number | null
          workout_duration_minutes: number | null
          workout_type: string | null
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          record_date: string
          steps?: number | null
          workout_duration_minutes?: number | null
          workout_type?: string | null
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          record_date?: string
          steps?: number | null
          workout_duration_minutes?: number | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      health_insights: {
        Row: {
          ai_insights: Json | null
          ai_model_used: string | null
          bmi: number | null
          bmi_category: string | null
          bmr: number | null
          body_fat_estimate: number | null
          created_at: string | null
          daily_calorie_requirement: number | null
          fitness_score: number | null
          generated_at: string | null
          id: string
          ideal_body_weight: number | null
          is_current: boolean | null
          patient_id: string
          profile_id: string | null
          score_breakdown: Json | null
        }
        Insert: {
          ai_insights?: Json | null
          ai_model_used?: string | null
          bmi?: number | null
          bmi_category?: string | null
          bmr?: number | null
          body_fat_estimate?: number | null
          created_at?: string | null
          daily_calorie_requirement?: number | null
          fitness_score?: number | null
          generated_at?: string | null
          id?: string
          ideal_body_weight?: number | null
          is_current?: boolean | null
          patient_id: string
          profile_id?: string | null
          score_breakdown?: Json | null
        }
        Update: {
          ai_insights?: Json | null
          ai_model_used?: string | null
          bmi?: number | null
          bmi_category?: string | null
          bmr?: number | null
          body_fat_estimate?: number | null
          created_at?: string | null
          daily_calorie_requirement?: number | null
          fitness_score?: number | null
          generated_at?: string | null
          id?: string
          ideal_body_weight?: number | null
          is_current?: boolean | null
          patient_id?: string
          profile_id?: string | null
          score_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "health_insights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_insights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "wellbeing_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_remedies: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          ingredients: Json | null
          instructions: string | null
          is_verified: boolean | null
          precautions: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          is_verified?: boolean | null
          precautions?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          is_verified?: boolean | null
          precautions?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      hospital_admins: {
        Row: {
          created_at: string | null
          hospital_id: string
          id: string
          is_primary_admin: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hospital_id: string
          id?: string
          is_primary_admin?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_primary_admin?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_admins_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string
          admin_username: string | null
          bed_count: number | null
          city: string | null
          contact_email: string
          created_at: string
          established_year: number | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          pincode: string | null
          registration_number: string | null
          state: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address: string
          admin_username?: string | null
          bed_count?: number | null
          city?: string | null
          contact_email: string
          created_at?: string
          established_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          registration_number?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string
          admin_username?: string | null
          bed_count?: number | null
          city?: string | null
          contact_email?: string
          created_at?: string
          established_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          registration_number?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      ipd_admissions: {
        Row: {
          admission_date: string
          admission_type: string | null
          assigned_doctor_id: string | null
          bed_number: string | null
          chief_complaint: string | null
          created_at: string | null
          discharge_date: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          status: string | null
          updated_at: string | null
          ward_number: string | null
        }
        Insert: {
          admission_date?: string
          admission_type?: string | null
          assigned_doctor_id?: string | null
          bed_number?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          discharge_date?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string | null
          updated_at?: string | null
          ward_number?: string | null
        }
        Update: {
          admission_date?: string
          admission_type?: string | null
          assigned_doctor_id?: string | null
          bed_number?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          discharge_date?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string | null
          updated_at?: string | null
          ward_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipd_admissions_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipd_admissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ipd_admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          hospital_id: string
          id: string
          notes: string | null
          order_date: string | null
          patient_id: string
          report_url: string | null
          results: Json | null
          status: string | null
          tests: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          order_date?: string | null
          patient_id: string
          report_url?: string | null
          results?: Json | null
          status?: string | null
          tests?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          order_date?: string | null
          patient_id?: string
          report_url?: string | null
          results?: Json | null
          status?: string | null
          tests?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          created_at: string | null
          department: string | null
          hospital_id: string
          id: string
          normal_range: string | null
          price: number | null
          sample_type: string | null
          test_code: string | null
          test_name: string
          turnaround_time: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          hospital_id: string
          id?: string
          normal_range?: string | null
          price?: number | null
          sample_type?: string | null
          test_code?: string | null
          test_name: string
          turnaround_time?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          hospital_id?: string
          id?: string
          normal_range?: string | null
          price?: number | null
          sample_type?: string | null
          test_code?: string | null
          test_name?: string
          turnaround_time?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          date: string | null
          id: string
          patient_id: string | null
          source_doc: string | null
          test_name: string | null
          value: string | null
        }
        Insert: {
          date?: string | null
          id?: string
          patient_id?: string | null
          source_doc?: string | null
          test_name?: string | null
          value?: string | null
        }
        Update: {
          date?: string | null
          id?: string
          patient_id?: string | null
          source_doc?: string | null
          test_name?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labs_source_doc_fkey"
            columns: ["source_doc"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_corrections: {
        Row: {
          createdat: string | null
          docrefs: Json | null
          fieldpath: string | null
          id: string
          newvalue: string | null
          oldvalue: string | null
          patient_id: string | null
          user_id: string | null
        }
        Insert: {
          createdat?: string | null
          docrefs?: Json | null
          fieldpath?: string | null
          id?: string
          newvalue?: string | null
          oldvalue?: string | null
          patient_id?: string | null
          user_id?: string | null
        }
        Update: {
          createdat?: string | null
          docrefs?: Json | null
          fieldpath?: string | null
          id?: string
          newvalue?: string | null
          oldvalue?: string | null
          patient_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_corrections_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      medications: {
        Row: {
          dose: string | null
          frequency: string | null
          hidden_by_user: boolean | null
          id: string
          name: string | null
          patient_id: string | null
          source_docs: Json | null
          startdate: string | null
          status: string | null
        }
        Insert: {
          dose?: string | null
          frequency?: string | null
          hidden_by_user?: boolean | null
          id?: string
          name?: string | null
          patient_id?: string | null
          source_docs?: Json | null
          startdate?: string | null
          status?: string | null
        }
        Update: {
          dose?: string | null
          frequency?: string | null
          hidden_by_user?: boolean | null
          id?: string
          name?: string | null
          patient_id?: string | null
          source_docs?: Json | null
          startdate?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_tracking: {
        Row: {
          created_at: string
          date: string
          dosage: string | null
          frequency: string | null
          id: string
          medicine_name: string
          notes: string | null
          patient_id: string
          scheduled_times: string[] | null
          status: string | null
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          date: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          medicine_name: string
          notes?: string | null
          patient_id: string
          scheduled_times?: string[] | null
          status?: string | null
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          medicine_name?: string
          notes?: string | null
          patient_id?: string
          scheduled_times?: string[] | null
          status?: string | null
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicine_tracking_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      opd_visits: {
        Row: {
          chief_complaint: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string | null
          follow_up_date: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          prescription: string | null
          status: string | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          chief_complaint?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          follow_up_date?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription?: string | null
          status?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Update: {
          chief_complaint?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          follow_up_date?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          status?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "opd_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_visits_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opd_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_summaries: {
        Row: {
          patient_id: string
          summary: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          patient_id: string
          summary?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          patient_id?: string
          summary?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_summaries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: Json | null
          blood_group: string | null
          created_at: string
          created_by: string
          dob: string
          emergency_contact: Json | null
          gender: string
          hospital_id: string | null
          id: string
          medical_notes: string | null
          name: string
          primary_contact: string
          shareable_id: string | null
          updated_at: string
        }
        Insert: {
          allergies?: Json | null
          blood_group?: string | null
          created_at?: string
          created_by: string
          dob: string
          emergency_contact?: Json | null
          gender: string
          hospital_id?: string | null
          id?: string
          medical_notes?: string | null
          name: string
          primary_contact: string
          shareable_id?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: Json | null
          blood_group?: string | null
          created_at?: string
          created_by?: string
          dob?: string
          emergency_contact?: Json | null
          gender?: string
          hospital_id?: string | null
          id?: string
          medical_notes?: string | null
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
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          payment_intent_id: string | null
          payment_method: string | null
          status: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_dispensations: {
        Row: {
          created_at: string | null
          dispensed_date: string | null
          hospital_id: string
          id: string
          medicines: Json | null
          notes: string | null
          patient_id: string
          prescribed_by: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          dispensed_date?: string | null
          hospital_id: string
          id?: string
          medicines?: Json | null
          notes?: string | null
          patient_id: string
          prescribed_by?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          dispensed_date?: string | null
          hospital_id?: string
          id?: string
          medicines?: Json | null
          notes?: string | null
          patient_id?: string
          prescribed_by?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_dispensations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_dispensations_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_inventory: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          generic_name: string | null
          hospital_id: string
          id: string
          manufacturer: string | null
          medicine_name: string
          quantity: number | null
          reorder_level: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          hospital_id: string
          id?: string
          manufacturer?: string | null
          medicine_name: string
          quantity?: number | null
          reorder_level?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          hospital_id?: string
          id?: string
          manufacturer?: string | null
          medicine_name?: string
          quantity?: number | null
          reorder_level?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_purchases: {
        Row: {
          bill_status: string
          cgst_amount: number | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          hospital_id: string
          id: string
          igst_amount: number | null
          invoice_date: string
          invoice_file_url: string | null
          invoice_number: string
          items: Json | null
          net_amount: number
          notes: string | null
          paid_amount: number | null
          payment_mode: string | null
          payment_status: string
          purchase_date: string
          purchase_number: string
          refund_status: string | null
          sgst_amount: number | null
          subtotal: number
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          bill_status?: string
          cgst_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          hospital_id: string
          id?: string
          igst_amount?: number | null
          invoice_date: string
          invoice_file_url?: string | null
          invoice_number: string
          items?: Json | null
          net_amount?: number
          notes?: string | null
          paid_amount?: number | null
          payment_mode?: string | null
          payment_status?: string
          purchase_date?: string
          purchase_number: string
          refund_status?: string | null
          sgst_amount?: number | null
          subtotal?: number
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          bill_status?: string
          cgst_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          hospital_id?: string
          id?: string
          igst_amount?: number | null
          invoice_date?: string
          invoice_file_url?: string | null
          invoice_number?: string
          items?: Json | null
          net_amount?: number
          notes?: string | null
          paid_amount?: number | null
          payment_mode?: string | null
          payment_status?: string
          purchase_date?: string
          purchase_number?: string
          refund_status?: string | null
          sgst_amount?: number | null
          subtotal?: number
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_purchases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchases_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_refunds: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_id: string
          created_at: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          refund_amount: number
          refund_date: string | null
          refund_reason: string | null
          refunded_items: Json | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_id: string
          created_at?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          refund_amount?: number
          refund_date?: string | null
          refund_reason?: string | null
          refunded_items?: Json | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_id?: string
          created_at?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          refund_amount?: number
          refund_date?: string | null
          refund_reason?: string | null
          refunded_items?: Json | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_refunds_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_refunds_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_refunds_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_refunds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          gstin: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          phone: string | null
          pincode: string | null
          state: string | null
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          supplier_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_suppliers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          advice: string | null
          appointment_id: string | null
          chief_complaint: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          follow_up_date: string | null
          id: string
          medicines: Json
          patient_id: string
          prescription_id: string
          updated_at: string | null
          vitals: Json | null
        }
        Insert: {
          advice?: string | null
          appointment_id?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          follow_up_date?: string | null
          id?: string
          medicines?: Json
          patient_id: string
          prescription_id: string
          updated_at?: string | null
          vitals?: Json | null
        }
        Update: {
          advice?: string | null
          appointment_id?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          follow_up_date?: string | null
          id?: string
          medicines?: Json
          patient_id?: string
          prescription_id?: string
          updated_at?: string | null
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_price: number
          name: string
          upload_limit: number
          yearly_price: number
        }
        Insert: {
          created_at?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name: string
          upload_limit: number
          yearly_price?: number
        }
        Update: {
          created_at?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          upload_limit?: number
          yearly_price?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
      visits: {
        Row: {
          date: string | null
          doctor: string | null
          documents: Json | null
          id: string
          patient_id: string | null
          reason: string | null
        }
        Insert: {
          date?: string | null
          doctor?: string | null
          documents?: Json | null
          id?: string
          patient_id?: string | null
          reason?: string | null
        }
        Update: {
          date?: string | null
          doctor?: string | null
          documents?: Json | null
          id?: string
          patient_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      wellbeing_profiles: {
        Row: {
          activity_level: string | null
          additional_notes: string | null
          age: number | null
          created_at: string
          cuisine_preferences: string[] | null
          daily_calorie_target: number | null
          dietary_preferences: Json | null
          food_allergies: string[] | null
          gender: string | null
          health_goals: string[] | null
          height_cm: number | null
          id: string
          meal_frequency: number | null
          patient_id: string
          resting_heart_rate: number | null
          sleep_hours: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          additional_notes?: string | null
          age?: number | null
          created_at?: string
          cuisine_preferences?: string[] | null
          daily_calorie_target?: number | null
          dietary_preferences?: Json | null
          food_allergies?: string[] | null
          gender?: string | null
          health_goals?: string[] | null
          height_cm?: number | null
          id?: string
          meal_frequency?: number | null
          patient_id: string
          resting_heart_rate?: number | null
          sleep_hours?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          additional_notes?: string | null
          age?: number | null
          created_at?: string
          cuisine_preferences?: string[] | null
          daily_calorie_target?: number | null
          dietary_preferences?: Json | null
          food_allergies?: string[] | null
          gender?: string | null
          health_goals?: string[] | null
          height_cm?: number | null
          id?: string
          meal_frequency?: number | null
          patient_id?: string
          resting_heart_rate?: number | null
          sleep_hours?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wellbeing_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_appointment: {
        Args: { appointment_id_param: string }
        Returns: boolean
      }
      can_user_manage_patient: {
        Args: { patient_id_param: string }
        Returns: boolean
      }
      can_view_patient_via_appointments: {
        Args: { patient_id_param: string }
        Returns: boolean
      }
      check_slot_availability: {
        Args: { p_doctor_id: string; p_slot_date: string; p_start_time: string }
        Returns: {
          available: boolean
          current_bookings: number
          max_appointments: number
        }[]
      }
      create_notification: {
        Args: {
          appointment_id_param?: string
          metadata_param?: Json
          notification_message: string
          notification_title: string
          notification_type: string
          target_user_id: string
        }
        Returns: string
      }
      decrement_slot_booking: {
        Args: { p_doctor_id: string; p_slot_date: string; p_start_time: string }
        Returns: boolean
      }
      doctor_can_view_patient: {
        Args: { patient_id_param: string }
        Returns: boolean
      }
      extract_patient_id_from_path: {
        Args: { file_path: string }
        Returns: string
      }
      generate_appointment_id: { Args: never; Returns: string }
      generate_doctor_id: { Args: never; Returns: string }
      generate_prescription_id: { Args: never; Returns: string }
      generate_purchase_number: { Args: never; Returns: string }
      generate_shareable_id: { Args: never; Returns: string }
      generate_user_shareable_id: { Args: never; Returns: string }
      get_available_time_slots: {
        Args: { p_doctor_id: string; p_slot_date: string }
        Returns: {
          available_slots: number
          current_bookings: number
          end_time: string
          max_appointments: number
          slot_id: string
          start_time: string
        }[]
      }
      get_public_stats: {
        Args: never
        Returns: {
          documents_count: number
          hospitals_count: number
          patients_count: number
        }[]
      }
      get_user_patient_ids: {
        Args: never
        Returns: {
          patient_id: string
        }[]
      }
      get_user_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_upload_limit: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hospital_staff_can_view_patient: {
        Args: { patient_id_param: string }
        Returns: boolean
      }
      increment_slot_booking: {
        Args: { p_doctor_id: string; p_slot_date: string; p_start_time: string }
        Returns: boolean
      }
      is_file_blocked: { Args: { hash_input: string }; Returns: boolean }
      register_file_hash: {
        Args: {
          content_type_input: string
          filename_input: string
          hash_input: string
          size_input: number
        }
        Returns: string
      }
      user_can_access_patient_files: {
        Args: { patient_id_param: string; user_id_param: string }
        Returns: boolean
      }
      user_owns_patient: {
        Args: { patient_id_param: string }
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
