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
      academic_periods: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ends_on: string
          id: string
          kind: string
          name: string
          program_id: string | null
          starts_on: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_on: string
          id?: string
          kind: string
          name: string
          program_id?: string | null
          starts_on: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_on?: string
          id?: string
          kind?: string
          name?: string
          program_id?: string | null
          starts_on?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_periods_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academic_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_programs: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_periods: number
          id: string
          modality: string
          name: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_periods?: number
          id?: string
          modality: string
          name: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_periods?: number
          id?: string
          modality?: string
          name?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action_code: string
          actor_user_id: string
          id: string
          metadata: Json | null
          occurred_at: string
          resource_id: string
          resource_type: string
          summary: string
          tenant_id: string
        }
        Insert: {
          action_code: string
          actor_user_id: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          resource_id: string
          resource_type: string
          summary: string
          tenant_id: string
        }
        Update: {
          action_code?: string
          actor_user_id?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          resource_id?: string
          resource_type?: string
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_events: {
        Row: {
          event: string
          id: string
          ip_address: unknown
          metadata: Json | null
          occurred_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      course_evaluations: {
        Row: {
          code: string
          course_id: string
          created_at: string
          due_on: string | null
          id: string
          name: string
          sequence: number
          weight: number
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          due_on?: string | null
          id?: string
          name: string
          sequence?: number
          weight: number
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          due_on?: string | null
          id?: string
          name?: string
          sequence?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_performance"
            referencedColumns: ["course_id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          grading_scheme_id: string
          id: string
          max_students: number | null
          period_id: string
          section_code: string
          status: string
          subject_id: string
          teacher_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          grading_scheme_id: string
          id?: string
          max_students?: number | null
          period_id: string
          section_code?: string
          status?: string
          subject_id: string
          teacher_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          grading_scheme_id?: string
          id?: string
          max_students?: number | null
          period_id?: string
          section_code?: string
          status?: string
          subject_id?: string
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_grading_scheme_id_fkey"
            columns: ["grading_scheme_id"]
            isOneToOne: false
            referencedRelation: "grading_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_deliveries: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_code: string
          tenant_id: string | null
          to_email: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_code: string
          tenant_id?: string | null
          to_email: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_code?: string
          tenant_id?: string | null
          to_email?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enrolled_at: string
          final_grade: number | null
          final_letter: string | null
          id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enrolled_at?: string
          final_grade?: number | null
          final_letter?: string | null
          id?: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enrolled_at?: string
          final_grade?: number | null
          final_letter?: string | null
          id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_performance"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments_audit: {
        Row: {
          audit_id: number
          changed_at: string
          changed_by: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          user_agent: string | null
        }
        Insert: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          user_agent?: string | null
        }
        Update: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      feedback_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "feedback_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          target_selector: string | null
          target_text: string | null
          target_url: string | null
          tenant_id: string | null
          title: string
          type: string
          updated_at: string
          user_agent: string | null
          user_role: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          target_selector?: string | null
          target_text?: string | null
          target_url?: string | null
          tenant_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_agent?: string | null
          user_role?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          target_selector?: string | null
          target_text?: string | null
          target_url?: string | null
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_agent?: string | null
          user_role?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          enrollment_id: string
          evaluation_id: string
          id: string
          letter: string | null
          published_at: string | null
          published_by: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_id: string
          evaluation_id: string
          id?: string
          letter?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_id?: string
          evaluation_id?: string
          id?: string
          letter?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "course_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grades_audit: {
        Row: {
          audit_id: number
          changed_at: string
          changed_by: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          user_agent: string | null
        }
        Insert: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          user_agent?: string | null
        }
        Update: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      grading_schemes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          letter_mapping: Json | null
          name: string
          passing_grade: number
          scale_max: number
          scale_min: number
          tenant_id: string
          updated_at: string
          uses_letters: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          letter_mapping?: Json | null
          name: string
          passing_grade?: number
          scale_max?: number
          scale_min?: number
          tenant_id: string
          updated_at?: string
          uses_letters?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          letter_mapping?: Json | null
          name?: string
          passing_grade?: number
          scale_max?: number
          scale_min?: number
          tenant_id?: string
          updated_at?: string
          uses_letters?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "grading_schemes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          csv_file_key: string | null
          entity: string
          error_rows: number | null
          errors_summary: Json | null
          executed_at: string
          executed_by: string
          id: string
          metadata: Json | null
          processed_rows: number | null
          status: string
          tenant_id: string
          total_rows: number | null
        }
        Insert: {
          csv_file_key?: string | null
          entity: string
          error_rows?: number | null
          errors_summary?: Json | null
          executed_at?: string
          executed_by: string
          id?: string
          metadata?: Json | null
          processed_rows?: number | null
          status: string
          tenant_id: string
          total_rows?: number | null
        }
        Update: {
          csv_file_key?: string | null
          entity?: string
          error_rows?: number | null
          errors_summary?: Json | null
          executed_at?: string
          executed_by?: string
          id?: string
          metadata?: Json | null
          processed_rows?: number | null
          status?: string
          tenant_id?: string
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount_applied: number
          charge_id: string
          id: string
          payment_id: string
        }
        Insert: {
          amount_applied: number
          charge_id: string
          id?: string
          payment_id: string
        }
        Update: {
          amount_applied?: number
          charge_id?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "student_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_charges"
            referencedColumns: ["charge_id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_concepts: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          default_amount: number | null
          deleted_at: string | null
          id: string
          name: string
          recurring: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          default_amount?: number | null
          deleted_at?: string | null
          id?: string
          name: string
          recurring?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          default_amount?: number | null
          deleted_at?: string | null
          id?: string
          name?: string
          recurring?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_concepts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deleted_at: string | null
          external_transaction_id: string | null
          id: string
          method: string
          notes: string | null
          paid_on: string
          proof_file_url: string | null
          recorded_at: string
          recorded_by: string
          reference: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          external_transaction_id?: string | null
          id?: string
          method: string
          notes?: string | null
          paid_on: string
          proof_file_url?: string | null
          recorded_at?: string
          recorded_by: string
          reference?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          external_transaction_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          proof_file_url?: string | null
          recorded_at?: string
          recorded_by?: string
          reference?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_audit: {
        Row: {
          audit_id: number
          changed_at: string
          changed_by: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          user_agent: string | null
        }
        Insert: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          user_agent?: string | null
        }
        Update: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          issued_at: string
          number: string
          payment_id: string
          pdf_url: string
          tenant_id: string
          voided: boolean
        }
        Insert: {
          id?: string
          issued_at?: string
          number: string
          payment_id: string
          pdf_url?: string
          tenant_id: string
          voided?: boolean
        }
        Update: {
          id?: string
          issued_at?: string
          number?: string
          payment_id?: string
          pdf_url?: string
          tenant_id?: string
          voided?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          based_on_role_id: string | null
          code: string
          created_at: string
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          based_on_role_id?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          based_on_role_id?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_based_on_role_id_fkey"
            columns: ["based_on_role_id"]
            isOneToOne: false
            referencedRelation: "roles_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_catalog: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      student_charges: {
        Row: {
          amount: number
          concept_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string
          id: string
          notes: string | null
          period_id: string | null
          program_id: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          concept_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          period_id?: string | null
          program_id?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          concept_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          period_id?: string | null
          program_id?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_charges_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "payment_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_charges_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_charges_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academic_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_charges_audit: {
        Row: {
          audit_id: number
          changed_at: string
          changed_by: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          user_agent: string | null
        }
        Insert: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          user_agent?: string | null
        }
        Update: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          credits: number | null
          default_grading_scheme_id: string | null
          deleted_at: string | null
          id: string
          name: string
          program_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          credits?: number | null
          default_grading_scheme_id?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          program_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          credits?: number | null
          default_grading_scheme_id?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          program_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_default_grading_scheme_id_fkey"
            columns: ["default_grading_scheme_id"]
            isOneToOne: false
            referencedRelation: "grading_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "academic_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          full_name: string
          id: string
          is_super_admin: boolean
          phone: string | null
          two_factor_enabled_at: string | null
          two_factor_required: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          full_name?: string
          id: string
          is_super_admin?: boolean
          phone?: string | null
          two_factor_enabled_at?: string | null
          two_factor_required?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          full_name?: string
          id?: string
          is_super_admin?: boolean
          phone?: string | null
          two_factor_enabled_at?: string | null
          two_factor_required?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles_audit: {
        Row: {
          audit_id: number
          changed_at: string
          changed_by: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          user_agent: string | null
        }
        Insert: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          user_agent?: string | null
        }
        Update: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          revoked_at: string | null
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_audit: {
        Row: {
          audit_id: number
          changed_at: string
          changed_by: string | null
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string
          user_agent: string | null
        }
        Insert: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id: string
          user_agent?: string | null
        }
        Update: {
          audit_id?: number
          changed_at?: string
          changed_by?: string | null
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_tenant_memberships: {
        Row: {
          active: boolean
          id: string
          joined_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          joined_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          joined_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_admin_income_summary: {
        Row: {
          concept_code: string | null
          concept_name: string | null
          method: string | null
          month: string | null
          payment_count: number | null
          tenant_id: string | null
          total_applied: number | null
          total_confirmed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_course_performance: {
        Row: {
          avg_final_grade: number | null
          completed_count: number | null
          course_id: string | null
          enrollments_count: number | null
          passed_count: number | null
          period_code: string | null
          subject_code: string | null
          subject_name: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_overdue_charges: {
        Row: {
          amount: number | null
          amount_paid: number | null
          balance_due: number | null
          charge_id: string | null
          days_overdue: number | null
          due_date: string | null
          student_id: string | null
          student_name: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_student_account_statement: {
        Row: {
          balance_due: number | null
          next_due_date: string | null
          overdue_count: number | null
          student_id: string | null
          tenant_id: string | null
          total_charged: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_permission: {
        Args: { p_permission: string; p_tenant_id?: string }
        Returns: boolean
      }
      is_self: { Args: { p_user_id: string }; Returns: boolean }
      next_receipt_number: {
        Args: { p_tenant_id: string; p_year: number }
        Returns: string
      }
      seed_default_roles_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      set_audit_context: {
        Args: { p_ip?: string; p_user_agent?: string; p_user_id: string }
        Returns: undefined
      }
      user_tenants: { Args: never; Returns: string[] }
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
    Enums: {},
  },
} as const
