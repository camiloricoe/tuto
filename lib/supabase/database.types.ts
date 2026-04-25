export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
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
            foreignKeyName: 'activity_log_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
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
            foreignKeyName: 'email_deliveries_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
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
            foreignKeyName: 'notifications_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
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
            foreignKeyName: 'role_permissions_permission_id_fkey'
            columns: ['permission_id']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
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
            foreignKeyName: 'roles_based_on_role_id_fkey'
            columns: ['based_on_role_id']
            isOneToOne: false
            referencedRelation: 'roles_catalog'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'roles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
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
            foreignKeyName: 'user_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
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
            foreignKeyName: 'user_tenant_memberships_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { p_permission: string; p_tenant_id?: string }
        Returns: boolean
      }
      is_self: { Args: { p_user_id: string }; Returns: boolean }
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
